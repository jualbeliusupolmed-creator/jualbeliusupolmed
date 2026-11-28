import { NextResponse } from 'next/server';
import { USU_STOPS } from '@/data/usuRoutes';
import { getCampusRoadPolyline } from '@/lib/campusRoute';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

export async function GET() {
  let stops = USU_STOPS;
  const supabase = getSupabaseClient();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('stops')
      .select('id, name, area, lat, lng, sequence_order')
      .order('sequence_order');
    if (error || !data || data.length < 2) {
      return NextResponse.json(
        { error: `Rute halte belum dapat dimuat: ${error?.message ?? 'butuh sedikitnya dua halte'}` },
        { status: 503 }
      );
    }
    stops = data.map((stop) => ({
      ...stop,
      sequenceOrder: stop.sequence_order,
    }));
  }

  const route = await getCampusRoadPolyline(stops);
  return NextResponse.json(route, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
    },
  });
}
