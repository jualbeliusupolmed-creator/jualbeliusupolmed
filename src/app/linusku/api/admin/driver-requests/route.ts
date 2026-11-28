import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';
import { listAllAdminUsers } from '@/lib/supabaseAdminUsers';

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const { data: requests, error } = await authorization.client
    .from('driver_access_requests')
    .select(
      'id, user_id, full_name, phone, notes, requested_bus_id, status, created_at, updated_at, reviewed_at, reviewed_by'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Permintaan driver belum dapat dimuat: ${error.message}` },
      { status: 503 }
    );
  }

  const userIds = [...new Set((requests ?? []).map((item) => item.user_id))];
  let users: Awaited<ReturnType<typeof listAllAdminUsers>> = [];
  try {
    users = userIds.length
      ? await listAllAdminUsers(authorization.client)
      : [];
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Daftar akun belum dapat dimuat.' },
      { status: 503 }
    );
  }
  const userMap = new Map(users.map((user) => [user.id, user]));

  return NextResponse.json({
    requests: (requests ?? []).map((item) => ({
      ...item,
      email: userMap.get(item.user_id)?.email ?? '',
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data persetujuan tidak valid.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const requestId = typeof input.requestId === 'string' ? input.requestId.trim() : '';
  const decision = input.decision;
  const busId = typeof input.busId === 'string' ? input.busId.trim().toUpperCase() : '';

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId
    ) ||
    (decision !== 'approve' && decision !== 'reject')
  ) {
    return NextResponse.json({ error: 'Permintaan atau keputusan tidak valid.' }, { status: 400 });
  }

  const { data: accessRequest, error: lookupError } = await authorization.client
    .from('driver_access_requests')
    .select('id, user_id, full_name, requested_bus_id, status')
    .eq('id', requestId)
    .maybeSingle();
  if (lookupError || !accessRequest) {
    return NextResponse.json(
      { error: `Permintaan tidak ditemukan: ${lookupError?.message ?? 'tidak ditemukan'}` },
      { status: lookupError ? 503 : 404 }
    );
  }

  if (accessRequest.status !== 'pending') {
    return NextResponse.json(
      { error: 'Permintaan ini sudah pernah ditinjau.' },
      { status: 409 }
    );
  }

  const reviewedAt = new Date().toISOString();
  if (decision === 'reject') {
    const { data, error } = await authorization.client
      .from('driver_access_requests')
      .update({
        status: 'rejected',
        reviewed_at: reviewedAt,
        reviewed_by: authorization.user.id,
        updated_at: reviewedAt,
      })
      .eq('id', requestId)
      .select('id, status, reviewed_at')
      .single();
    if (error) {
      return NextResponse.json(
        { error: `Permintaan belum dapat ditolak: ${error.message}` },
        { status: 503 }
      );
    }
    await logAdminAction(authorization.client, {
      adminId: authorization.user.id,
      action: 'reject_driver_request',
      targetTable: 'driver_access_requests',
      targetId: requestId,
      oldValue: { status: accessRequest.status },
      newValue: { status: data.status },
      ...getAdminRequestMetadata(request),
    });
    return NextResponse.json({ request: data });
  }

  const { data: userData, error: userError } = await authorization.client.auth.admin.getUserById(
    accessRequest.user_id
  );
  if (userError || !userData.user) {
    return NextResponse.json(
      { error: 'Akun pengaju tidak ditemukan.' },
      { status: 404 }
    );
  }

  const assignedBusId = busId || accessRequest.requested_bus_id || '';
  let previousDriverId: string | null = null;
  if (assignedBusId) {
    const { data: bus, error: busError } = await authorization.client
      .from('buses')
      .select('id, driver_id, is_active')
      .eq('id', assignedBusId)
      .maybeSingle();
    if (busError || !bus) {
      return NextResponse.json(
        { error: `Armada penugasan tidak ditemukan: ${busError?.message ?? 'tidak ditemukan'}` },
        { status: busError ? 503 : 404 }
      );
    }
    if (!bus.is_active) {
      return NextResponse.json(
        { error: 'Armada harus aktif sebelum driver dapat ditugaskan.' },
        { status: 409 }
      );
    }
    if (bus.driver_id && bus.driver_id !== accessRequest.user_id) {
      return NextResponse.json(
        { error: 'Armada sudah ditugaskan ke driver lain.' },
        { status: 409 }
      );
    }
    previousDriverId = bus.driver_id;
    const { error: assignmentError } = await authorization.client
      .from('buses')
      .update({ driver_id: accessRequest.user_id })
      .eq('id', assignedBusId);
    if (assignmentError) {
      return NextResponse.json(
        { error: `Penugasan armada belum dapat disimpan: ${assignmentError.message}` },
        { status: 503 }
      );
    }
  }

  const { error: userUpdateError } = await authorization.client.auth.admin.updateUserById(
    accessRequest.user_id,
    {
      app_metadata: {
        ...userData.user.app_metadata,
        linusku_account_type: 'driver',
      },
      user_metadata: {
        ...userData.user.user_metadata,
        full_name: accessRequest.full_name,
      },
    }
  );
  if (userUpdateError) {
    if (assignedBusId) {
      await authorization.client
        .from('buses')
        .update({ driver_id: previousDriverId })
        .eq('id', assignedBusId);
    }
    return NextResponse.json(
      { error: `Peran driver belum dapat diperbarui: ${userUpdateError.message}` },
      { status: 503 }
    );
  }

  const { data, error } = await authorization.client
    .from('driver_access_requests')
    .update({
      status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: authorization.user.id,
      updated_at: reviewedAt,
    })
    .eq('id', requestId)
    .select('id, status, reviewed_at')
    .single();
  if (error) {
    await authorization.client.auth.admin.updateUserById(accessRequest.user_id, {
      app_metadata: userData.user.app_metadata,
      user_metadata: userData.user.user_metadata,
    });
    if (assignedBusId) {
      await authorization.client
        .from('buses')
        .update({ driver_id: previousDriverId })
        .eq('id', assignedBusId);
    }
    return NextResponse.json(
      { error: `Persetujuan belum dapat disimpan: ${error.message}` },
      { status: 503 }
    );
  }

  await logAdminAction(authorization.client, {
    adminId: authorization.user.id,
    action: 'approve_driver_request',
    targetTable: 'driver_access_requests',
    targetId: requestId,
    oldValue: { status: accessRequest.status },
    newValue: { status: data.status, userId: accessRequest.user_id, busId: assignedBusId || null },
    ...getAdminRequestMetadata(request),
  });

  return NextResponse.json({ request: data, userId: accessRequest.user_id, busId: assignedBusId || null });
}
