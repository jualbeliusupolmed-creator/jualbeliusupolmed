import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, type AdminClient } from '@/lib/adminAuth';

async function countRows(
  client: AdminClient,
  table: string
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true });
  return { count: count ?? 0, error: error?.message ?? null };
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const now = Date.now();
  const { data: settingRows } = await authorization.client
    .from('linusku_settings_v2')
    .select('key, value')
    .eq('key', 'eta')
    .maybeSingle();
  const configuredStaleThreshold =
    settingRows &&
    typeof settingRows.value === 'object' &&
    settingRows.value !== null &&
    !Array.isArray(settingRows.value) &&
    typeof settingRows.value.staleThresholdSeconds === 'number'
      ? settingRows.value.staleThresholdSeconds
      : 45;
  const staleThresholdSeconds = Math.max(
    1,
    Math.min(3600, configuredStaleThreshold)
  );
  const [buses, stops, positions, settings, requests, sessions] = await Promise.all([
    countRows(authorization.client, 'buses'),
    countRows(authorization.client, 'stops'),
    countRows(authorization.client, 'bus_positions'),
    countRows(authorization.client, 'linusku_settings_v2'),
    countRows(authorization.client, 'driver_access_requests'),
    countRows(authorization.client, 'driver_sessions'),
  ]);

  const { data: fleet } = await authorization.client
    .from('buses')
    .select('id, is_active, driver_id');
  const { data: latestPositions } = await authorization.client
    .from('bus_positions')
    .select('bus_id, updated_at')
    .order('updated_at', { ascending: false });

  const activeBuses = (fleet ?? []).filter((bus) => bus.is_active);
  const unassignedBuses = activeBuses.filter((bus) => !bus.driver_id);
  const latestByBus = new Map<string, string>();
  for (const position of latestPositions ?? []) {
    if (!latestByBus.has(position.bus_id)) {
      latestByBus.set(position.bus_id, position.updated_at);
    }
  }
  const stalePositions = activeBuses.filter((bus) => {
    const updatedAt = latestByBus.get(bus.id);
    return !updatedAt || now - new Date(updatedAt).getTime() > staleThresholdSeconds * 1000;
  });

  let realtimeOk = true;
  let realtimeError: string | null = null;
  try {
    const channel = authorization.client.channel('linusku-health-check');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        authorization.client.removeChannel(channel);
        resolve();
      }, 1500);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          authorization.client.removeChannel(channel);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          realtimeOk = false;
          realtimeError = `Realtime tidak tersedia (${status}).`;
          authorization.client.removeChannel(channel);
          resolve();
        }
      });
    });
  } catch (error) {
    realtimeOk = false;
    realtimeError = error instanceof Error ? error.message : 'Realtime tidak dapat diperiksa.';
  }

  const { data: storageBuckets, error: storageError } =
    await authorization.client.storage.listBuckets();

  const checks = [
    { key: 'buses', ok: !buses.error, count: buses.count, error: buses.error },
    { key: 'stops', ok: !stops.error, count: stops.count, error: stops.error },
    { key: 'positions', ok: !positions.error, count: positions.count, error: positions.error },
    { key: 'settings', ok: !settings.error, count: settings.count, error: settings.error },
    { key: 'driver_requests', ok: !requests.error, count: requests.count, error: requests.error },
    { key: 'driver_sessions', ok: !sessions.error, count: sessions.count, error: sessions.error },
    {
      key: 'realtime',
      ok: realtimeOk,
      count: realtimeOk ? 1 : 0,
      error: realtimeError,
    },
    {
      key: 'storage',
      ok: !storageError,
      count: storageBuckets?.length ?? 0,
      error: storageError?.message ?? null,
    },
  ];

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    checks,
    fleet: {
      active: activeBuses.length,
      unassigned: unassignedBuses.length,
      unassignedBusIds: unassignedBuses.map((bus) => bus.id),
      stale: stalePositions.length,
      staleBusIds: stalePositions.map((bus) => bus.id),
      staleThresholdSeconds,
    },
    generatedAt: new Date(now).toISOString(),
  });
}
