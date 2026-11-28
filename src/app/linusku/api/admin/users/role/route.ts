import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmailAllowed, requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Perubahan jenis akun tidak valid.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const accountType = input.accountType;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    (accountType !== 'user' && accountType !== 'driver')
  ) {
    return NextResponse.json({ error: 'ID atau jenis akun tidak valid.' }, { status: 400 });
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
  if (isAdminEmailAllowed(currentUser.email)) {
    return NextResponse.json(
      { error: 'Jenis akun administrator tidak dapat diubah dari pengelolaan pengguna.' },
      { status: 403 }
    );
  }

  if (accountType === 'user') {
    const { data: assignedBus, error: assignmentError } = await authorization.client
      .from('buses')
      .select('id')
      .eq('driver_id', id)
      .maybeSingle();
    if (assignmentError) {
      return NextResponse.json(
        { error: `Penugasan driver belum dapat diperiksa: ${assignmentError.message}` },
        { status: 503 }
      );
    }
    if (assignedBus) {
      return NextResponse.json(
        { error: 'Lepas penugasan bus sebelum mengubah akun ini menjadi pengguna.' },
        { status: 409 }
      );
    }
  }

  const { data, error } = await authorization.client.auth.admin.updateUserById(id, {
    app_metadata: {
      ...currentUser.app_metadata,
      linusku_account_type: accountType,
    },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: `Jenis akun belum dapat diperbarui: ${error?.message ?? 'kesalahan server'}` },
      { status: 503 }
    );
  }

  await logAdminAction(authorization.client, {
    adminId: authorization.user.id,
    action: 'update_account_type',
    targetTable: 'auth.users',
    targetId: id,
    oldValue: {
      linusku_account_type:
        currentUser.app_metadata.linusku_account_type ?? 'user',
    },
    newValue: { linusku_account_type: accountType },
    ...getAdminRequestMetadata(request),
  });

  return NextResponse.json({
    user: {
      id: data.user.id,
      accountType,
    },
  });
}
