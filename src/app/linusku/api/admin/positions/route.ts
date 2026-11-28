import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const [{ data: buses, error: busesError }, { data: positions, error: positionsError }] =
    await Promise.all([
      authorization.client
        .from('buses')
        .select('id, name, is_active, driver_id')
        .order('id'),
      authorization.client
        .from('bus_positions')
        .select('bus_id, lat, lng, speed_kmh, heading, occupancy, source_type, updated_at')
        .order('updated_at', { ascending: false }),
    ]);

  if (busesError || positionsError) {
    return NextResponse.json(
      {
        error: `Gagal memperbarui posisi: ${busesError?.message ?? positionsError?.message}`,
      },
      { status: 503 }
    );
  }

  const latestPosition = new Map<string, NonNullable<typeof positions>[number]>();
  for (const position of positions ?? []) {
    if (!latestPosition.has(position.bus_id)) {
      latestPosition.set(position.bus_id, position);
    }
  }

  return NextResponse.json({
    buses: (buses ?? []).map((bus) => ({
      ...bus,
      position: latestPosition.get(bus.id) ?? null,
    })),
    checkedAt: new Date().toISOString(),
  });
}
