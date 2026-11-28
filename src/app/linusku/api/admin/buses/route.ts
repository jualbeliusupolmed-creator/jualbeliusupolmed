import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmailAllowed, requireAdmin } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/linuskuSupabaseServer';
import { getAdminRequestMetadata, logAdminAction as writeAdminAction } from '@/lib/adminAudit';

interface BusInput {
  id: string;
  name: string;
  plateNumber: string;
  capacity: number;
  isActive: boolean;
  driverId: string | null;
}

function parseBusInput(value: unknown): BusInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim().toUpperCase() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const plateNumber =
    typeof input.plateNumber === 'string' ? input.plateNumber.trim() : '';
  const capacity = Number(input.capacity);
  const driverId =
    input.driverId === null || input.driverId === ''
      ? null
      : typeof input.driverId === 'string'
        ? input.driverId.trim()
        : undefined;

  if (
    !/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id) ||
    name.length < 2 ||
    name.length > 80 ||
    plateNumber.length > 24 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 100 ||
    typeof input.isActive !== 'boolean' ||
    driverId === undefined ||
    (driverId !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        driverId
      ))
  ) {
    return null;
  }

  return { id, name, plateNumber, capacity, isActive: input.isActive, driverId };
}

async function validateDriverAssignment(
  driverId: string | null,
  busId: string,
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
): Promise<string | null> {
  if (!driverId) return null;

  const { data: userData, error: userError } =
    await client.auth.admin.getUserById(driverId);
  if (userError || !userData.user) {
    return 'Akun driver tidak ditemukan.';
  }
  if (
    userData.user.banned_until &&
    new Date(userData.user.banned_until).getTime() > Date.now()
  ) {
    return 'Akun driver dinonaktifkan dan tidak dapat ditugaskan.';
  }
  if (isAdminEmailAllowed(userData.user.email)) {
    return 'Akun admin tidak dapat ditugaskan sebagai driver.';
  }

  const { data: assignedBus, error: assignedBusError } = await client
    .from('buses')
    .select('id')
    .eq('driver_id', driverId)
    .neq('id', busId)
    .maybeSingle();

  if (assignedBusError) return `Gagal memeriksa penugasan: ${assignedBusError.message}`;
  if (assignedBus) return 'Akun ini sudah ditugaskan ke bus lain.';
  if (userData.user.app_metadata.linusku_account_type !== 'driver') {
    const { data: currentAssignment, error: currentAssignmentError } =
      await client
        .from('buses')
        .select('id')
        .eq('id', busId)
        .eq('driver_id', driverId)
        .maybeSingle();
    if (currentAssignmentError) {
      return `Gagal memeriksa penugasan: ${currentAssignmentError.message}`;
    }
    if (!currentAssignment) {
      return 'Ubah akun menjadi driver dari panel admin sebelum menugaskan armada.';
    }
  }
  return null;
}

async function logAdminAction(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
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
    targetTable: 'buses',
    targetId,
    oldValue,
    newValue,
    ...getAdminRequestMetadata(request),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const body: unknown = await request.json().catch(() => null);
  const input = parseBusInput(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Periksa ID, nama, kapasitas, status, dan penugasan bus.' },
      { status: 400 }
    );
  }

  const assignmentError = await validateDriverAssignment(
    input.driverId,
    input.id,
    authorization.client
  );
  if (assignmentError) {
    return NextResponse.json({ error: assignmentError }, { status: 400 });
  }

  const { data, error } = await authorization.client
    .from('buses')
    .insert({
      id: input.id,
      name: input.name,
      plate_number: input.plateNumber || null,
      capacity: input.capacity,
      is_active: input.isActive,
      driver_id: input.driverId,
    })
    .select('id, name, plate_number, capacity, is_active, driver_id, created_at')
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Bus belum dapat ditambahkan: ${error.message}` },
      { status: 409 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'create_bus', input.id, null, input as unknown as Record<string, unknown>, request);
  return NextResponse.json({ bus: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const body: unknown = await request.json().catch(() => null);
  const input = parseBusInput(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Periksa ID, nama, kapasitas, status, dan penugasan bus.' },
      { status: 400 }
    );
  }

  const assignmentError = await validateDriverAssignment(
    input.driverId,
    input.id,
    authorization.client
  );
  if (assignmentError) {
    return NextResponse.json({ error: assignmentError }, { status: 400 });
  }

  // Get old value for audit
  const { data: oldData, error: oldError } = await authorization.client
    .from('buses')
    .select('id, name, plate_number, capacity, is_active, driver_id')
    .eq('id', input.id)
    .maybeSingle();
  if (oldError || !oldData) {
    return NextResponse.json(
      { error: `Bus belum dapat diperiksa: ${oldError?.message ?? 'bus tidak ditemukan'}` },
      { status: oldError ? 503 : 404 }
    );
  }

  const { data, error } = await authorization.client
    .from('buses')
    .update({
      name: input.name,
      plate_number: input.plateNumber || null,
      capacity: input.capacity,
      is_active: input.isActive,
      driver_id: input.driverId,
    })
    .eq('id', input.id)
    .select('id, name, plate_number, capacity, is_active, driver_id, created_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: `Bus belum dapat diperbarui: ${error?.message ?? 'bus tidak ditemukan'}` },
      { status: error ? 503 : 404 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'update_bus', input.id, oldData, { ...input }, request);
  return NextResponse.json({ bus: data });
}

export async function DELETE(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const busId = new URL(request.url).searchParams.get('id')?.trim().toUpperCase() ?? '';
  if (!/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(busId)) {
    return NextResponse.json({ error: 'ID armada tidak valid.' }, { status: 400 });
  }

  const { data: bus, error: lookupError } = await authorization.client
    .from('buses')
    .select('id, is_active')
    .eq('id', busId)
    .maybeSingle();
  if (lookupError || !bus) {
    return NextResponse.json(
      { error: `Armada tidak dapat diperiksa: ${lookupError?.message ?? 'armada tidak ditemukan'}` },
      { status: lookupError ? 503 : 404 }
    );
  }
  if (bus.is_active) {
    return NextResponse.json(
      { error: 'Nonaktifkan armada sebelum menghapusnya.' },
      { status: 409 }
    );
  }

  // Get old value for audit
  const { data: oldData, error: oldError } = await authorization.client
    .from('buses')
    .select('id, name, plate_number, capacity, is_active, driver_id')
    .eq('id', busId)
    .maybeSingle();
  if (oldError || !oldData) {
    return NextResponse.json(
      { error: `Armada belum dapat diperiksa: ${oldError?.message ?? 'armada tidak ditemukan'}` },
      { status: oldError ? 503 : 404 }
    );
  }

  const { data, error } = await authorization.client
    .from('buses')
    .delete()
    .eq('id', busId)
    .eq('is_active', false)
    .select('id')
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: `Armada belum dapat dihapus: ${error.message}` },
      { status: 503 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: 'Status armada berubah atau armada tidak ditemukan. Segarkan data dan nonaktifkan sebelum menghapus.' },
      { status: 409 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'delete_bus', busId, oldData ?? null, null, request);
  return NextResponse.json({ ok: true });
}