import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/userAuth';
import { mergeLinuskuSettings } from '@/data/usuRoutes';

interface DriverRequestInput {
  fullName: string;
  phone: string;
  notes: string;
  requestedBusId: string | null;
}

function parseInput(value: unknown): DriverRequestInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const fullName =
    typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  const requestedBusId =
    typeof input.requestedBusId === 'string' && input.requestedBusId.trim()
      ? input.requestedBusId.trim().toUpperCase()
      : null;

  if (
    fullName.length < 2 ||
    fullName.length > 100 ||
    phone.length > 30 ||
    notes.length > 500 ||
    (requestedBusId !== null &&
      !/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(requestedBusId))
  ) {
    return null;
  }

  return { fullName, phone, notes, requestedBusId };
}

export async function GET(request: NextRequest) {
  const authorization = await requireUser(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.client
    .from('driver_access_requests')
    .select(
      'id, full_name, phone, notes, requested_bus_id, status, created_at, updated_at, reviewed_at'
    )
    .eq('user_id', authorization.user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
    return NextResponse.json(
      { error: `Permintaan akses belum dapat dimuat: ${error.message}` },
      { status: 503 }
    );
  }

  return NextResponse.json({ request: data ?? null });
}

export async function POST(request: NextRequest) {
  const authorization = await requireUser(request);
  if (!authorization.ok) return authorization.response;

  const { data: featureRow } = await authorization.client
    .from('linusku_settings_v2')
    .select('value')
    .eq('key', 'features')
    .maybeSingle();
  const driverAccessRequestsEnabled = mergeLinuskuSettings({
    features: featureRow?.value,
  }).features.driverAccessRequestsEnabled;
  if (!driverAccessRequestsEnabled) {
    return NextResponse.json(
      { error: 'Permintaan akses driver sedang dinonaktifkan.' },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const input = parseInput(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Periksa nama, nomor telepon, catatan, dan armada yang diminta.' },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await authorization.client
    .from('driver_access_requests')
    .select('id, status')
    .eq('user_id', authorization.user.id)
    .maybeSingle();
  if (existingError && existingError.code !== 'PGRST205' && existingError.code !== '42P01') {
    return NextResponse.json(
      { error: `Permintaan sebelumnya belum dapat diperiksa: ${existingError.message}` },
      { status: 503 }
    );
  }
  if (existing?.status === 'approved') {
    return NextResponse.json(
      { error: 'Akses driver Anda sudah disetujui.' },
      { status: 409 }
    );
  }

  const payload = {
    user_id: authorization.user.id,
    full_name: input.fullName,
    phone: input.phone || null,
    notes: input.notes || null,
    requested_bus_id: input.requestedBusId,
    status: 'pending',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await authorization.client
    .from('driver_access_requests')
    .upsert(payload, { onConflict: 'user_id' })
    .select(
      'id, full_name, phone, notes, requested_bus_id, status, created_at, updated_at, reviewed_at'
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Permintaan akses belum dapat disimpan: ${error.message}` },
      { status: 503 }
    );
  }

  return NextResponse.json({ request: data });
}
