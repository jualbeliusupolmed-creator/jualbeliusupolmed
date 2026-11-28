import { NextResponse } from 'next/server';
import {
  DEFAULT_LINUSKU_SETTINGS,
  mergeLinuskuSettings,
  type LinuskuSettings,
} from '@/data/usuRoutes';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

export async function GET() {
  const supabase = getSupabaseClient();

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      settings: DEFAULT_LINUSKU_SETTINGS,
      source: 'default',
    });
  }

  // Try new JSONB settings table first
  const { data: settingsData, error: settingsError } = await supabase
    .from('linusku_settings_v2')
    .select('key, value, updated_at')
    .in('key', ['service', 'schedule', 'eta', 'map', 'features', 'geofence']);

  if (!settingsError && settingsData && settingsData.length > 0) {
    const mergedSettings = mergeLinuskuSettings(
      Object.fromEntries(settingsData.map((row) => [row.key, row.value]))
    );

    const latestUpdatedAt = settingsData.reduce((latest, row) => {
      const rowTime = new Date(row.updated_at).getTime();
      return rowTime > latest ? rowTime : latest;
    }, 0);

    return NextResponse.json(
      {
        settings: mergedSettings,
        source: 'database',
        updatedAt: new Date(latestUpdatedAt).toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } }
    );
  }

  // Fallback to old linusku_settings table for backward compatibility
  const { data: legacyData, error: legacyError } = await supabase
    .from('linusku_settings')
    .select('service_days, opening_time, closing_time, updated_at')
    .eq('key', 'service')
    .maybeSingle();

  if (legacyError || !legacyData) {
    return NextResponse.json(
      { error: 'Pengaturan operasional belum tersedia. Jalankan migrasi LINUSKU terbaru.' },
      { status: 503 }
    );
  }

  // Convert legacy format to new format
  const legacySettings: LinuskuSettings = {
    ...DEFAULT_LINUSKU_SETTINGS,
    service: {
      serviceDays: legacyData.service_days,
      openingTime: legacyData.opening_time.slice(0, 5),
      closingTime: legacyData.closing_time.slice(0, 5),
      timeZone: DEFAULT_LINUSKU_SETTINGS.service.timeZone,
    },
  };

  return NextResponse.json(
    {
      settings: legacySettings,
      source: 'legacy_database',
      updatedAt: legacyData.updated_at,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } }
  );
}