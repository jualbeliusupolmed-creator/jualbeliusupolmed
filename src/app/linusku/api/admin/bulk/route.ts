import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';

interface BulkInput {
  resource: 'armada' | 'akun' | 'laporan';
  action: 'activate' | 'deactivate' | 'make_driver' | 'make_user' | 'delete';
  ids: string[];
}

function parseInput(value: unknown): BulkInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const resource = input.resource;
  const action = input.action;
  const ids = Array.isArray(input.ids)
    ? input.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  if (
    (resource !== 'armada' && resource !== 'akun' && resource !== 'laporan') ||
    (action !== 'activate' &&
      action !== 'deactivate' &&
      action !== 'make_driver' &&
      action !== 'make_user' &&
      action !== 'delete') ||
    ids.length === 0 ||
    ids.length > 200
  ) {
    return null;
  }
  if (
    (resource === 'armada' && !['activate', 'deactivate'].includes(action)) ||
    (resource === 'akun' &&
      !['activate', 'deactivate', 'make_driver', 'make_user'].includes(action)) ||
    (resource === 'laporan' && action !== 'delete')
  ) {
    return null;
  }
  return { resource, action, ids: [...new Set(ids)] };
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  const input = parseInput(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Permintaan operasi massal tidak valid.' },
      { status: 400 }
    );
  }

  let updated = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  if (input.resource === 'armada') {
    for (const id of input.ids) {
      if (!/^LINUS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id.toUpperCase())) {
        failed += 1;
        errors.push({ id, error: 'ID armada tidak valid.' });
        continue;
      }
      const { error } = await authorization.client
        .from('buses')
        .update({ is_active: input.action === 'activate' })
        .eq('id', id.toUpperCase());
      if (error) {
        failed += 1;
        errors.push({ id, error: error.message });
      } else {
        updated += 1;
      }
    }
  } else if (input.resource === 'laporan') {
    for (const id of input.ids) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id
        )
      ) {
        failed += 1;
        errors.push({ id, error: 'ID laporan tidak valid.' });
        continue;
      }
      const { error } = await authorization.client.from('crowd_reports').delete().eq('id', id);
      if (error) {
        failed += 1;
        errors.push({ id, error: error.message });
      } else {
        updated += 1;
      }
    }
  } else {
    for (const id of input.ids) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id
        )
      ) {
        failed += 1;
        errors.push({ id, error: 'ID akun tidak valid.' });
        continue;
      }
      const { data: currentData, error: currentError } =
        await authorization.client.auth.admin.getUserById(id);
      if (currentError || !currentData.user) {
        failed += 1;
        errors.push({ id, error: currentError?.message ?? 'Akun tidak ditemukan.' });
        continue;
      }
      if (input.action === 'make_user') {
        const { data: assigned } = await authorization.client
          .from('buses')
          .select('id')
          .eq('driver_id', id)
          .maybeSingle();
        if (assigned) {
          failed += 1;
          errors.push({ id, error: 'Lepas penugasan armada sebelum menjadi pengguna.' });
          continue;
        }
      }
      if (input.action === 'make_driver') {
        const { data: assigned } = await authorization.client
          .from('buses')
          .select('id')
          .eq('driver_id', id)
          .maybeSingle();
        if (assigned) {
          failed += 1;
          errors.push({ id, error: `Sudah ditugaskan ke armada ${assigned.id}.` });
          continue;
        }
      }
      const attributes =
        input.action === 'activate' || input.action === 'deactivate'
          ? { ban_duration: input.action === 'activate' ? 'none' : '876000h' }
          : {
              app_metadata: {
                ...currentData.user.app_metadata,
                linusku_account_type:
                  input.action === 'make_driver' ? 'driver' : 'user',
              },
            };
      const { error } = await authorization.client.auth.admin.updateUserById(id, attributes);
      if (error) {
        failed += 1;
        errors.push({ id, error: error.message });
      } else {
        updated += 1;
      }
    }
  }

  await logAdminAction(authorization.client, {
    adminId: authorization.user.id,
    action: 'bulk_update',
    targetTable: input.resource,
    targetId: null,
    oldValue: null,
    newValue: { operation: input.action, updated, failed, ids: input.ids },
    ...getAdminRequestMetadata(request),
  });

  return NextResponse.json({ ok: failed === 0, updated, failed, errors });
}
