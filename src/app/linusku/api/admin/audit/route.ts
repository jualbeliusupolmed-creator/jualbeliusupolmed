import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const searchParams = request.nextUrl.searchParams;
  const requestedLimit = Number(searchParams.get('limit') ?? '100');
  const offset = Number(searchParams.get('offset') ?? '0');
  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    return NextResponse.json({ error: 'Batas atau offset log audit tidak valid.' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 500);
  const action = searchParams.get('action') ?? undefined;
  const targetTable = searchParams.get('targetTable') ?? undefined;
  const targetId = searchParams.get('targetId') ?? undefined;
  const adminId = searchParams.get('adminId') ?? undefined;
  const since = searchParams.get('since') ?? undefined;
  if (
    (adminId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adminId)) ||
    (since && !Number.isFinite(Date.parse(since)))
  ) {
    return NextResponse.json({ error: 'Filter log audit tidak valid.' }, { status: 400 });
  }

  let query = authorization.client
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);
  if (targetTable) query = query.eq('target_table', targetTable);
  if (targetId) query = query.eq('target_id', targetId);
  if (adminId) query = query.eq('admin_id', adminId);
  if (since) query = query.gte('created_at', since);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: `Gagal memuat log audit: ${error.message}` },
      { status: 503 }
    );
  }

  return NextResponse.json({
    logs: data ?? [],
    totalCount: count ?? 0,
    limit,
    offset,
  });
}