import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const body: unknown = await request.json().catch(() => null);
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length < 2 ||
    ids.length > 32 ||
    ids.some((id) => typeof id !== 'string')
  ) {
    return NextResponse.json(
      { error: 'Urutan harus memuat semua ID halte yang valid.' },
      { status: 400 }
    );
  }

  // Get old order for audit
  const { data: oldStops, error: oldError } = await authorization.client
    .from('stops')
    .select('id, sequence_order')
    .order('sequence_order');
  if (oldError || !oldStops) {
    return NextResponse.json(
      { error: `Urutan halte belum dapat diperiksa: ${oldError?.message ?? 'data tidak tersedia'}` },
      { status: 503 }
    );
  }

  const { error } = await authorization.client.rpc('admin_reorder_stops', {
    p_stop_ids: ids,
  });
  if (error) {
    return NextResponse.json(
      { error: `Urutan halte belum dapat disimpan: ${error.message}` },
      { status: 503 }
    );
  }

  // Log admin action
  await logAdminAction(authorization.client, {
    adminId: authorization.user.id,
    action: 'reorder_stops',
    targetTable: 'stops',
    targetId: 'all',
    oldValue: { stops: oldStops },
    newValue: { ids },
    ...getAdminRequestMetadata(request),
  });

  return NextResponse.json({ ok: true });
}