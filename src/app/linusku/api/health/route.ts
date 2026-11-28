import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

/**
 * Endpoint healthcheck & anti-pause Supabase Free Tier.
 * Panggil endpoint ini lewat cron 1x setiap 2-3 hari agar database Supabase tidak auto-pause saat libur kuliah.
 */
export async function GET() {
  const supabase = getSupabaseClient();

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      ok: true,
      mode: 'simulation',
      timestamp: new Date().toISOString(),
    });
  }

  const { count, error } = await supabase
    .from('buses')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Layanan data tidak tersedia.',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: 'database',
    registeredBuses: count ?? 0,
    timestamp: new Date().toISOString(),
  });
}
