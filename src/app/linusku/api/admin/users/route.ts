import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmailAllowed, requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction as writeAdminAction } from '@/lib/adminAudit';

function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
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
    targetTable: 'auth.users',
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
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data akun tidak valid.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const email = isEmail(input.email) ? input.email.trim().toLowerCase() : '';
  const fullName =
    typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email || fullName.length < 2 || fullName.length > 100 || password.length < 8) {
    return NextResponse.json(
      { error: 'Isi nama, email valid, dan password minimal 8 karakter.' },
      { status: 400 }
    );
  }
  if (isAdminEmailAllowed(email)) {
    return NextResponse.json(
      { error: 'Email admin dikelola melalui allowlist server, bukan sebagai akun driver.' },
      { status: 400 }
    );
  }

  const { data, error } = await authorization.client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { linusku_account_type: 'driver' },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: `Akun driver belum dapat dibuat: ${error?.message ?? 'kesalahan server'}` },
      { status: 409 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'create_driver', data.user.id, null, { email, fullName }, request);
  return NextResponse.json(
    {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
        isDriver: true,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data akun tidak valid.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const email = isEmail(input.email) ? input.email.trim().toLowerCase() : '';
  const fullName =
    typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const occupancy = input.occupancy;
  const password =
    typeof input.password === 'string' ? input.password : undefined;
  const active = typeof input.active === 'boolean' ? input.active : undefined;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    ) ||
    !email ||
    fullName.length < 2 ||
    fullName.length > 100 ||
    (occupancy !== undefined &&
      occupancy !== 'low' &&
      occupancy !== 'medium' &&
      occupancy !== 'full') ||
    (password !== undefined && password.length > 0 && password.length < 8)
  ) {
    return NextResponse.json(
      { error: 'Periksa nama, email, password baru, dan status akun.' },
      { status: 400 }
    );
  }

  const { data: currentData, error: currentError } =
    await authorization.client.auth.admin.getUserById(id);
  const currentUser = currentData.user;
  if (currentError || !currentUser) {
    return NextResponse.json(
      { error: `Akun tidak ditemukan: ${currentError?.message ?? ''}` },
      { status: 404 }
    );
  }
  if (
    isAdminEmailAllowed(currentUser.email) ||
    isAdminEmailAllowed(email)
  ) {
    return NextResponse.json(
      { error: 'Akun admin tidak dapat diubah dari pengelolaan driver.' },
      { status: 403 }
    );
  }

  // Capture old value for audit
  const oldValue = {
    email: currentUser.email,
    fullName: currentUser.user_metadata?.full_name,
    occupancy: currentUser.user_metadata?.linusku_occupancy,
    bannedUntil: currentUser.banned_until,
  };

  const attributes: {
    email: string;
    user_metadata: Record<string, unknown>;
    password?: string;
    ban_duration?: string;
  } = {
    email,
    user_metadata: {
      ...currentUser.user_metadata,
      full_name: fullName,
      ...(occupancy === undefined ? {} : { linusku_occupancy: occupancy }),
    },
  };
  if (password) attributes.password = password;
  if (active !== undefined) attributes.ban_duration = active ? 'none' : '876000h';

  const { data, error } = await authorization.client.auth.admin.updateUserById(
    id,
    attributes
  );
  if (error || !data.user) {
    return NextResponse.json(
      { error: `Akun belum dapat diperbarui: ${error?.message ?? 'kesalahan server'}` },
      { status: 503 }
    );
  }

  const newValue = {
    email: data.user.email,
    fullName,
    occupancy,
    bannedUntil: data.user.banned_until,
  };

  await logAdminAction(authorization.client, authorization.user.id, 'update_driver', id, oldValue, newValue, request);
  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName,
      active: !data.user.banned_until,
    },
  });
}