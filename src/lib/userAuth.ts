import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/linuskuSupabaseServer';

export type UserAuthorization =
  | {
      ok: true;
      client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
      user: User;
    }
  | {
      ok: false;
      response: NextResponse<{ error: string }>;
    };

export async function requireUser(
  request: Request
): Promise<UserAuthorization> {
  const client = getSupabaseAdminClient();
  if (!isSupabaseAdminConfigured || !client) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Layanan autentikasi belum dikonfigurasi di server.' },
        { status: 503 }
      ),
    };
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sesi pengguna diperlukan.' },
        { status: 401 }
      ),
    };
  }

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sesi tidak valid. Silakan masuk kembali.' },
        { status: 401 }
      ),
    };
  }

  return { ok: true, client, user: data.user };
}
