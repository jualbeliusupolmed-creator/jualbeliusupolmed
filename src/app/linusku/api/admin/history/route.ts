import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const searchParams = request.nextUrl.searchParams;
  const busId = searchParams.get('busId') ?? undefined;
  const requestedLimit = Number(searchParams.get('limit') ?? '1000');
  const offset = Number(searchParams.get('offset') ?? '0');
  const since = searchParams.get('since') ?? undefined;
  const until = searchParams.get('until') ?? undefined;
  const sourceType = searchParams.get('sourceType') ?? undefined;
  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    (busId && !/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(busId)) ||
    (sourceType &&
      !['driver', 'device', 'simulator', 'crowd'].includes(sourceType)) ||
    (since && !Number.isFinite(Date.parse(since))) ||
    (until && !Number.isFinite(Date.parse(until))) ||
    (since && until && Date.parse(since) > Date.parse(until))
  ) {
    return NextResponse.json({ error: 'Filter riwayat posisi tidak valid.' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 5000);

  let query = authorization.client
    .from('bus_position_history')
    .select('*', { count: 'exact' })
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (busId) query = query.eq('bus_id', busId);
  if (sourceType) query = query.eq('source_type', sourceType);
  if (since) query = query.gte('recorded_at', since);
  if (until) query = query.lte('recorded_at', until);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: `Gagal memuat riwayat posisi: ${error.message}` },
      { status: 503 }
    );
  }

  return NextResponse.json({
    history: data ?? [],
    totalCount: count ?? 0,
    limit,
    offset,
  });
}