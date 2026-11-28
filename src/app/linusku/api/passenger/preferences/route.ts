import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/userAuth';

export async function GET(request: NextRequest) {
  const authorization = await requireUser(request);
  if (!authorization.ok) return authorization.response;

  const favoriteStopIds = Array.isArray(
    authorization.user.user_metadata.favorite_stop_ids
  )
    ? authorization.user.user_metadata.favorite_stop_ids
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 50)
    : [];

  return NextResponse.json({ favoriteStopIds });
}

export async function PUT(request: NextRequest) {
  const authorization = await requireUser(request);
  if (!authorization.ok) return authorization.response;

  const body = await request.json().catch(() => null);
  const favoriteStopIds = Array.isArray(body?.favoriteStopIds)
    ? Array.from(
        new Set(
          body.favoriteStopIds
            .filter((id: unknown): id is string => typeof id === 'string')
            .map((id: string) => id.trim())
            .filter(Boolean)
        )
      ).slice(0, 50)
    : null;

  if (!favoriteStopIds) {
    return NextResponse.json(
      { error: 'Daftar halte favorit tidak valid.' },
      { status: 400 }
    );
  }

  const { error } = await authorization.client.auth.admin.updateUserById(
    authorization.user.id,
    {
      user_metadata: {
        ...authorization.user.user_metadata,
        favorite_stop_ids: favoriteStopIds,
      },
    }
  );

  if (error) {
    return NextResponse.json(
      { error: 'Halte favorit belum dapat disinkronkan.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ favoriteStopIds });
}
