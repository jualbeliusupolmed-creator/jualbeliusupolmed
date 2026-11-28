import { NextResponse } from 'next/server';
import { USU_STOPS } from '@/data/usuRoutes';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

export async function GET() {
  const supabase = getSupabaseClient();
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ stops: USU_STOPS, source: 'default' });
  }

  const { data, error } = await supabase
    .from('stops')
    .select('id, name, area, lat, lng, sequence_order')
    .order('sequence_order');
  if (error) {
    return NextResponse.json(
      { error: `Daftar halte belum dapat dimuat: ${error.message}` },
      { status: 503 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Daftar halte belum tersedia di Supabase.' },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      stops: data.map((stop) => ({
        ...stop,
        area:
          typeof stop.area === 'string' && stop.area.includes('Dr. Mansyur')
            ? 'Jl. Dr. T. Mansyur'
            : stop.area,
        sequenceOrder: stop.sequence_order,
      })),
      source: 'database',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' } }
  );
}
