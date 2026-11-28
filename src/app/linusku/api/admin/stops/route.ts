import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_LINUSKU_SETTINGS,
  isInsideCampusWithSettings,
  mergeLinuskuSettings,
  type LinuskuSettings,
} from '@/data/usuRoutes';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction as writeAdminAction } from '@/lib/adminAudit';

interface StopInput {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
}

type AdminClient = Extract<Awaited<ReturnType<typeof requireAdmin>>, { ok: true }>['client'];

async function getValidationSettings(client: AdminClient): Promise<LinuskuSettings> {
  const { data, error } = await client
    .from('linusku_settings_v2')
    .select('key, value')
    .in('key', ['geofence']);

  if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    return DEFAULT_LINUSKU_SETTINGS;
  }

  return mergeLinuskuSettings(
    Object.fromEntries(data.map((row) => [row.key, row.value]))
  );
}

function parseStopInput(value: unknown, settings: LinuskuSettings): StopInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim().toLowerCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const area = typeof input.area === 'string' ? input.area.trim() : '';
  const lat = Number(input.lat);
  const lng = Number(input.lng);

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
    name.length < 2 ||
    name.length > 100 ||
    area.length < 2 ||
    area.length > 120 ||
    !isInsideCampusWithSettings(lat, lng, settings)
  ) {
    return null;
  }
  return { id, name, area, lat, lng };
}

async function logAdminAction(
  client: Extract<Awaited<ReturnType<typeof requireAdmin>>, { ok: true }>['client'],
  adminId: string,
  action: string,
  targetId: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  request: NextRequest
) {
  await writeAdminAction(client, {
    adminId,
    action,
    targetTable: 'stops',
    targetId,
    oldValue,
    newValue,
    ...getAdminRequestMetadata(request),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  let settings;
  try {
    settings = await getValidationSettings(authorization.client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan server';
    return NextResponse.json(
      { error: `Pengaturan geofence belum dapat dimuat: ${message}` },
      { status: 503 }
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const input = parseStopInput(body, settings);
  if (!input) {
    return NextResponse.json(
      { error: 'Periksa ID, nama, area, dan koordinat halte di dalam Kampus USU.' },
      { status: 400 }
    );
  }

  const { data: lastStop, error: orderError } = await authorization.client
    .from('stops')
    .select('sequence_order')
    .order('sequence_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) {
    return NextResponse.json(
      { error: `Urutan halte belum dapat dibaca: ${orderError.message}` },
      { status: 503 }
    );
  }

  const { data, error } = await authorization.client
    .from('stops')
    .insert({ ...input, sequence_order: (lastStop?.sequence_order ?? 0) + 1 })
    .select('id, name, area, lat, lng, sequence_order')
    .single();
  if (error) {
    return NextResponse.json(
      { error: `Halte belum dapat ditambahkan: ${error.message}` },
      { status: 409 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'create_stop', input.id, null, input as unknown as Record<string, unknown>, request);
  return NextResponse.json({ stop: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  let settings;
  try {
    settings = await getValidationSettings(authorization.client);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan server';
    return NextResponse.json(
      { error: `Pengaturan geofence belum dapat dimuat: ${message}` },
      { status: 503 }
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const input = parseStopInput(body, settings);
  if (!input) {
    return NextResponse.json(
      { error: 'Periksa ID, nama, area, dan koordinat halte di dalam Kampus USU.' },
      { status: 400 }
    );
  }

  // Get old value for audit
  const { data: oldData, error: oldError } = await authorization.client
    .from('stops')
    .select('id, name, area, lat, lng, sequence_order')
    .eq('id', input.id)
    .maybeSingle();
  if (oldError || !oldData) {
    return NextResponse.json(
      { error: `Halte belum dapat diperiksa: ${oldError?.message ?? 'halte tidak ditemukan'}` },
      { status: oldError ? 503 : 404 }
    );
  }

  const { data, error } = await authorization.client
    .from('stops')
    .update({
      name: input.name,
      area: input.area,
      lat: input.lat,
      lng: input.lng,
    })
    .eq('id', input.id)
    .select('id, name, area, lat, lng, sequence_order')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { error: `Halte belum dapat diperbarui: ${error?.message ?? 'halte tidak ditemukan'}` },
      { status: error ? 503 : 404 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'update_stop', input.id, oldData, { ...input }, request);
  return NextResponse.json({ stop: data });
}

export async function DELETE(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const stopId = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stopId)) {
    return NextResponse.json({ error: 'ID halte tidak valid.' }, { status: 400 });
  }

  const { count, error: countError } = await authorization.client
    .from('stops')
    .select('id', { count: 'exact', head: true });
  if (countError) {
    return NextResponse.json(
      { error: `Jumlah halte belum dapat diperiksa: ${countError.message}` },
      { status: 503 }
    );
  }
  if ((count ?? 0) <= 2) {
    return NextResponse.json(
      { error: 'Rute harus memiliki sedikitnya dua halte.' },
      { status: 400 }
    );
  }

  // Get old value for audit
  const { data: oldData, error: oldError } = await authorization.client
    .from('stops')
    .select('id, name, area, lat, lng, sequence_order')
    .eq('id', stopId)
    .maybeSingle();
  if (oldError || !oldData) {
    return NextResponse.json(
      { error: `Halte belum dapat diperiksa: ${oldError?.message ?? 'halte tidak ditemukan'}` },
      { status: oldError ? 503 : 404 }
    );
  }

  const { error } = await authorization.client.from('stops').delete().eq('id', stopId);
  if (error) {
    return NextResponse.json(
      { error: `Halte belum dapat dihapus: ${error.message}` },
      { status: 503 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'delete_stop', stopId, oldData ?? null, null, request);
  return NextResponse.json({ ok: true });
}