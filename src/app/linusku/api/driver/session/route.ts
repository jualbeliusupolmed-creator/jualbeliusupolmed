import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/userAuth';

export async function POST(request: NextRequest) {
  const authorization = await requireUser(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data sesi driver tidak valid.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const action = input.action;
  const busId = typeof input.busId === 'string' ? input.busId.trim().toUpperCase() : '';
  const sessionToken = typeof input.sessionToken === 'string' ? input.sessionToken : '';
  const deviceInfo = input.deviceInfo && typeof input.deviceInfo === 'object'
    ? input.deviceInfo
    : {};
  if (action !== 'start' && action !== 'ping' && action !== 'end') {
    return NextResponse.json({ error: 'Aksi sesi driver tidak valid.' }, { status: 400 });
  }

  if (action === 'start') {
    if (
      !/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(busId) ||
      sessionToken.length < 16 ||
      sessionToken.length > 200
    ) {
      return NextResponse.json(
        { error: 'Armada atau token sesi driver tidak valid.' },
        { status: 400 }
      );
    }
    const { data, error } = await authorization.client.rpc('start_driver_session', {
      p_driver_id: authorization.user.id,
      p_bus_id: busId,
      p_session_token: sessionToken,
      p_device_info: deviceInfo,
      p_ip_address:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });
    if (error) {
      return NextResponse.json(
        { error: `Sesi driver belum dapat dimulai: ${error.message}` },
        { status: 503 }
      );
    }
    return NextResponse.json({ sessionId: data });
  }

  if (action === 'ping') {
    const { error } = await authorization.client.rpc('record_driver_gps', {
      p_driver_id: authorization.user.id,
    });
    if (error) {
      return NextResponse.json(
        { error: `Aktivitas GPS belum dapat dicatat: ${error.message}` },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await authorization.client.rpc('end_driver_session', {
    p_driver_id: authorization.user.id,
  });
  if (error) {
    return NextResponse.json(
      { error: `Sesi driver belum dapat diakhiri: ${error.message}` },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
