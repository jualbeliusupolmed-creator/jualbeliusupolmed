import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmailAllowed, requireAdmin } from '@/lib/adminAuth';
import { getLinuskuAccountType } from '@/lib/linuskuAccountType';
import { listAllAdminUsers } from '@/lib/supabaseAdminUsers';
import {
  DEFAULT_LINUSKU_SETTINGS,
  mergeLinuskuSettings,
} from '@/data/usuRoutes';

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const now = Date.now();
  const [
    busesResult,
    stopsResult,
    positionsResult,
    reportsResult,
    settingsResult,
    settingsV2Result,
  ] = await Promise.all([
    authorization.client
      .from('buses')
      .select('id, name, plate_number, capacity, is_active, driver_id, created_at')
      .order('id'),
    authorization.client
      .from('stops')
      .select('id, name, area, lat, lng, sequence_order')
      .order('sequence_order'),
    authorization.client
      .from('bus_positions')
      .select('bus_id, lat, lng, speed_kmh, heading, occupancy, source_type, updated_at')
      .order('updated_at', { ascending: false }),
    authorization.client
      .from('crowd_reports')
      .select('id, bus_id, stop_id, lat, lng, occupancy, created_at', {
        count: 'exact',
      })
      .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
    authorization.client
      .from('linusku_settings')
      .select('service_days, opening_time, closing_time, updated_at')
      .eq('key', 'service')
      .maybeSingle(),
    authorization.client
      .from('linusku_settings_v2')
      .select('key, value, updated_at')
      .in('key', ['service', 'schedule', 'eta', 'map', 'features', 'geofence']),
  ]);

  const warnings: string[] = [];
  let adminUsers: Awaited<ReturnType<typeof listAllAdminUsers>> = [];
  try {
    adminUsers = await listAllAdminUsers(authorization.client);
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : 'Daftar akun belum dapat dimuat.'
    );
  }
  const queryResults: Array<[string, { message: string } | null]> = [
    ['armada', busesResult.error],
    ['halte', stopsResult.error],
    ['posisi bus', positionsResult.error],
    ['laporan crowd', reportsResult.error],
  ];
  for (const [resource, error] of queryResults) {
    if (error) {
      warnings.push(`Gagal memuat ${resource}: ${error.message}`);
    }
  }

  if (settingsV2Result.error && settingsResult.error) {
    warnings.push(
      `Gagal memuat jadwal operasional: ${settingsV2Result.error.message}`
    );
  }

  const buses = busesResult.data ?? [];

  // Merge settings from v2 table (preferred) with legacy fallback
  let mergedSettings = DEFAULT_LINUSKU_SETTINGS;
  let settingsSource = 'default';
  let settingsUpdatedAt = new Date(now).toISOString();

  if (!settingsV2Result.error && settingsV2Result.data && settingsV2Result.data.length > 0) {
    mergedSettings = mergeLinuskuSettings(
      Object.fromEntries(settingsV2Result.data.map((row) => [row.key, row.value]))
    );
    settingsSource = 'database_v2';
    const latestSettingsUpdatedAt = settingsV2Result.data.reduce((latest, row) => {
      const rowTime = new Date(row.updated_at).getTime();
      return rowTime > latest ? rowTime : latest;
    }, 0);
    settingsUpdatedAt = new Date(latestSettingsUpdatedAt).toISOString();
  } else if (settingsResult.data) {
    // Legacy fallback
    mergedSettings = {
      ...DEFAULT_LINUSKU_SETTINGS,
      service: {
        serviceDays: settingsResult.data.service_days,
        openingTime: settingsResult.data.opening_time.slice(0, 5),
        closingTime: settingsResult.data.closing_time.slice(0, 5),
        timeZone: DEFAULT_LINUSKU_SETTINGS.service.timeZone,
      },
    };
    mergedSettings = mergeLinuskuSettings({ service: mergedSettings.service });
    settingsSource = 'database_legacy';
    settingsUpdatedAt = settingsResult.data.updated_at;
  }

  const accounts = adminUsers.map((user) => {
    const assignedBus = buses.find((bus) => bus.driver_id === user.id);
    return {
      id: user.id,
      email: user.email ?? '',
      fullName:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : '',
      occupancy:
        user.user_metadata?.linusku_occupancy === 'low' ||
        user.user_metadata?.linusku_occupancy === 'full'
          ? user.user_metadata.linusku_occupancy
          : 'medium',
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      bannedUntil: user.banned_until ?? null,
      assignedBusId: assignedBus?.id ?? null,
      isAdmin: isAdminEmailAllowed(user.email),
      isDriver:
        getLinuskuAccountType(user.app_metadata, assignedBus?.id ?? null) ===
        'driver',
      provider:
        typeof user.app_metadata?.provider === 'string'
          ? user.app_metadata.provider
          : 'email',
    };
  });
  const users = accounts.filter((user) => !user.isAdmin && !user.isDriver);
  const drivers = accounts.filter((user) => !user.isAdmin && user.isDriver);

  return NextResponse.json({
    buses,
    stops: stopsResult.data ?? [],
    positions: positionsResult.data ?? [],
    reports: reportsResult.data ?? [],
    reportCount24h: reportsResult.count ?? 0,
    settings: mergedSettings,
    settingsSource,
    settingsUpdatedAt,
    users,
    drivers,
    loadedAt: new Date(now).toISOString(),
    warnings,
  });
}