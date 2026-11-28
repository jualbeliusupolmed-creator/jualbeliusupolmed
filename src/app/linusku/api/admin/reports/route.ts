import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction as writeAdminAction } from '@/lib/adminAudit';

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
    targetTable: 'crowd_reports',
    targetId,
    oldValue,
    newValue,
    ...getAdminRequestMetadata(request),
  });
}

export async function DELETE(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const reportId = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      reportId
    )
  ) {
    return NextResponse.json(
      { error: 'ID laporan tidak valid.' },
      { status: 400 }
    );
  }

  // Get old value for audit
  const { data: oldData, error: oldError } = await authorization.client
    .from('crowd_reports')
    .select('id, bus_id, stop_id, lat, lng, occupancy, created_at')
    .eq('id', reportId)
    .maybeSingle();
  if (oldError || !oldData) {
    return NextResponse.json(
      { error: `Laporan belum dapat diperiksa: ${oldError?.message ?? 'laporan tidak ditemukan'}` },
      { status: oldError ? 503 : 404 }
    );
  }

  const { error } = await authorization.client
    .from('crowd_reports')
    .delete()
    .eq('id', reportId);
  if (error) {
    return NextResponse.json(
      { error: `Laporan belum dapat dihapus: ${error.message}` },
      { status: 503 }
    );
  }

  await logAdminAction(authorization.client, authorization.user.id, 'delete_report', reportId, oldData ?? null, null, request);
  return NextResponse.json({ ok: true });
}