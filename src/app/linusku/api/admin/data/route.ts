import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';
import { listAllAdminUsers } from '@/lib/supabaseAdminUsers';
import {
  parseAkunCsv,
  parseArmadaCsv,
  parseCsvObjects,
  parseHalteCsv,
  serializeCsv,
  templateCsv,
  validateAkunRow,
  validateArmadaRow,
  validateHalteRow,
  type BarisAkun,
  type BarisArmada,
  type BarisHalte,
  type SumberDataTransfer,
  type ValidasiBaris,
} from '@/lib/adminDataTransfer';

const IMPORT_LIMIT = 500;

function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function isSource(value: string): value is SumberDataTransfer {
  return value === 'armada' || value === 'halte' || value === 'akun';
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const resource = request.nextUrl.searchParams.get('resource') ?? '';
  if (resource === 'template') {
    const source = request.nextUrl.searchParams.get('source') ?? '';
    if (!isSource(source)) {
      return NextResponse.json({ error: 'Jenis template tidak valid.' }, { status: 400 });
    }
    return csvResponse(templateCsv(source), `linusku-template-${source}.csv`);
  }

  if (resource === 'armada') {
    const { data, error } = await authorization.client
      .from('buses')
      .select('id, name, plate_number, capacity, is_active, driver_id')
      .order('id');
    if (error) {
      return NextResponse.json(
        { error: `Armada belum dapat diekspor: ${error.message}` },
        { status: 503 }
      );
    }
    const csv = serializeCsv(
      ['id', 'name', 'plateNumber', 'capacity', 'isActive', 'driverId'],
      (data ?? []).map((row) => [
        row.id,
        row.name,
        row.plate_number ?? '',
        row.capacity,
        row.is_active,
        row.driver_id ?? '',
      ])
    );
    return csvResponse(csv, 'linusku-armada.csv');
  }

  if (resource === 'halte') {
    const { data, error } = await authorization.client
      .from('stops')
      .select('id, name, area, lat, lng, sequence_order')
      .order('sequence_order');
    if (error) {
      return NextResponse.json(
        { error: `Halte belum dapat diekspor: ${error.message}` },
        { status: 503 }
      );
    }
    const csv = serializeCsv(
      ['id', 'name', 'area', 'lat', 'lng', 'sequenceOrder'],
      (data ?? []).map((row) => [
        row.id,
        row.name,
        row.area,
        row.lat,
        row.lng,
        row.sequence_order,
      ])
    );
    return csvResponse(csv, 'linusku-halte.csv');
  }

  if (resource === 'akun') {
    const [{ data: buses }, users] = await Promise.all([
      authorization.client.from('buses').select('id, driver_id'),
      listAllAdminUsers(authorization.client),
    ]);
    const assignment = new Map(
      (buses ?? []).map((bus) => [bus.driver_id, bus.id] as const)
    );
    const csv = serializeCsv(
      ['id', 'email', 'fullName', 'accountType', 'active', 'occupancy', 'assignedBusId'],
      users.map((user) => {
        const assignedBusId = assignment.get(user.id) ?? '';
        const accountType =
          user.app_metadata.linusku_account_type === 'driver' || assignedBusId
            ? 'driver'
            : 'user';
        const occupancy =
          user.user_metadata.linusku_occupancy === 'low' ||
          user.user_metadata.linusku_occupancy === 'full'
            ? user.user_metadata.linusku_occupancy
            : 'medium';
        return [
          user.id,
          user.email ?? '',
          typeof user.user_metadata.full_name === 'string'
            ? user.user_metadata.full_name
            : '',
          accountType,
          !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
          occupancy,
          assignedBusId,
        ];
      })
    );
    return csvResponse(csv, 'linusku-akun.csv');
  }

  if (resource === 'laporan') {
    const { data, error } = await authorization.client
      .from('crowd_reports')
      .select('id, bus_id, stop_id, lat, lng, occupancy, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json(
        { error: `Laporan belum dapat diekspor: ${error.message}` },
        { status: 503 }
      );
    }
    const csv = serializeCsv(
      ['id', 'busId', 'stopId', 'lat', 'lng', 'occupancy', 'createdAt'],
      (data ?? []).map((row) => [
        row.id,
        row.bus_id ?? '',
        row.stop_id ?? '',
        row.lat,
        row.lng,
        row.occupancy,
        row.created_at,
      ])
    );
    return csvResponse(csv, 'linusku-laporan.csv');
  }

  if (resource === 'audit') {
    const { data, error } = await authorization.client
      .from('admin_audit_log')
      .select('id, admin_id, action, target_table, target_id, old_value, new_value, ip_address, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json(
        { error: `Audit belum dapat diekspor: ${error.message}` },
        { status: 503 }
      );
    }
    const csv = serializeCsv(
      ['id', 'adminId', 'action', 'targetTable', 'targetId', 'oldValue', 'newValue', 'ipAddress', 'userAgent', 'createdAt'],
      (data ?? []).map((row) => [
        row.id,
        row.admin_id,
        row.action,
        row.target_table,
        row.target_id ?? '',
        JSON.stringify(row.old_value ?? {}),
        JSON.stringify(row.new_value ?? {}),
        row.ip_address ?? '',
        row.user_agent ?? '',
        row.created_at,
      ])
    );
    return csvResponse(csv, 'linusku-audit.csv');
  }

  if (resource === 'riwayat') {
    const { data, error } = await authorization.client
      .from('bus_position_history')
      .select('id, bus_id, lat, lng, speed_kmh, heading, occupancy, source_type, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json(
        { error: `Riwayat belum dapat diekspor: ${error.message}` },
        { status: 503 }
      );
    }
    const csv = serializeCsv(
      ['id', 'busId', 'lat', 'lng', 'speedKmh', 'heading', 'occupancy', 'sourceType', 'recordedAt'],
      (data ?? []).map((row) => [
        row.id,
        row.bus_id,
        row.lat,
        row.lng,
        row.speed_kmh,
        row.heading,
        row.occupancy,
        row.source_type,
        row.recorded_at,
      ])
    );
    return csvResponse(csv, 'linusku-riwayat-gps.csv');
  }

  return NextResponse.json({ error: 'Jenis data ekspor tidak valid.' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data impor tidak valid.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const resource = typeof input.resource === 'string' ? input.resource : '';
  const rawCsv = typeof input.csv === 'string' ? input.csv : '';
  const rawRows = Array.isArray(input.rows) ? input.rows : [];
  if (!isSource(resource)) {
    return NextResponse.json({ error: 'Jenis data impor tidak valid.' }, { status: 400 });
  }

  let validations;
  if (rawCsv) {
    validations =
      resource === 'armada'
        ? parseArmadaCsv(rawCsv)
        : resource === 'halte'
          ? parseHalteCsv(rawCsv)
          : parseAkunCsv(rawCsv);
  } else if (rawRows.length) {
    const objects = rawRows.map((row) =>
      typeof row === 'string' ? parseCsvObjects(row)[0] ?? {} : row
    );
    validations =
      resource === 'armada'
        ? objects.map(validateArmadaRow)
        : resource === 'halte'
          ? objects.map(validateHalteRow)
          : objects.map(validateAkunRow);
  } else {
    return NextResponse.json(
      { error: 'Tidak ada baris data untuk diimpor.' },
      { status: 400 }
    );
  }

  if (validations.length > IMPORT_LIMIT) {
    return NextResponse.json(
      { error: `Impor dibatasi maksimal ${IMPORT_LIMIT} baris per proses.` },
      { status: 400 }
    );
  }

  const results: Array<{
    index: number;
    id?: string;
    status: 'created' | 'updated' | 'failed';
    errors: string[];
  }> = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  const seenIdentifiers = new Map<string, number>();
  for (const validation of validations as Array<ValidasiBaris<{ id?: string; email?: string }>>) {
    const identifier = validation.value?.id ?? validation.value?.email ?? '';
    if (!identifier) continue;
    const normalized = identifier.toLowerCase();
    const duplicateIndex = seenIdentifiers.get(normalized);
    if (duplicateIndex !== undefined) {
      failed += 1;
      results.push({
        index: validation.index,
        id: identifier,
        status: 'failed',
        errors: [`Duplikat: baris ${duplicateIndex + 1} sudah memakai ${identifier}.`],
      });
      validation.value = null;
    } else {
      seenIdentifiers.set(normalized, validation.index);
    }
  }

  if (resource === 'armada') {
    for (const validation of validations as ValidasiBaris<BarisArmada>[]) {
      if (!validation.value) {
        failed += 1;
        results.push({ index: validation.index, status: 'failed', errors: validation.errors });
        continue;
      }
      const row = validation.value;
      const { data: existing } = await authorization.client
        .from('buses')
        .select('id')
        .eq('id', row.id)
        .maybeSingle();
      const { error } = await authorization.client.from('buses').upsert({
        id: row.id,
        name: row.name,
        plate_number: row.plateNumber || null,
        capacity: row.capacity,
        is_active: row.isActive,
        driver_id: row.driverId,
      });
      if (error) {
        failed += 1;
        results.push({ index: validation.index, id: row.id, status: 'failed', errors: [error.message] });
      } else {
        if (existing) updated += 1;
        else created += 1;
        results.push({
          index: validation.index,
          id: row.id,
          status: existing ? 'updated' : 'created',
          errors: [],
        });
      }
    }
  } else if (resource === 'halte') {
    const { data: lastStop } = await authorization.client
      .from('stops')
      .select('sequence_order')
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextOrder = (lastStop?.sequence_order ?? 0) + 1;
    for (const validation of validations as ValidasiBaris<BarisHalte>[]) {
      if (!validation.value) {
        failed += 1;
        results.push({ index: validation.index, status: 'failed', errors: validation.errors });
        continue;
      }
      const row = validation.value;
      const { data: existing } = await authorization.client
        .from('stops')
        .select('id')
        .eq('id', row.id)
        .maybeSingle();
      const payload = {
        id: row.id,
        name: row.name,
        area: row.area,
        lat: row.lat,
        lng: row.lng,
        ...(existing ? {} : { sequence_order: nextOrder }),
      };
      const { error } = await authorization.client
        .from('stops')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        failed += 1;
        results.push({ index: validation.index, id: row.id, status: 'failed', errors: [error.message] });
      } else {
        if (!existing) nextOrder += 1;
        if (existing) updated += 1;
        else created += 1;
        results.push({
          index: validation.index,
          id: row.id,
          status: existing ? 'updated' : 'created',
          errors: [],
        });
      }
    }
  } else {
    for (const validation of validations as ValidasiBaris<BarisAkun>[]) {
      if (!validation.value) {
        failed += 1;
        results.push({ index: validation.index, status: 'failed', errors: validation.errors });
        continue;
      }
      const row = validation.value;
      const { data: userList } = await authorization.client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = userList.users.find((user) => user.email === row.email);
      let error: { message: string } | null = null;
      if (existing) {
        const result = await authorization.client.auth.admin.updateUserById(existing.id, {
          email: row.email,
          password: row.password || undefined,
          email_confirm: true,
          user_metadata: {
            ...existing.user_metadata,
            full_name: row.fullName,
            linusku_occupancy: row.occupancy,
          },
          app_metadata: {
            ...existing.app_metadata,
            linusku_account_type: row.accountType,
          },
          ban_duration: row.active ? 'none' : '876000h',
        });
        error = result.error;
      } else {
        const result = await authorization.client.auth.admin.createUser({
          email: row.email,
          password: row.password || crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            full_name: row.fullName,
            linusku_occupancy: row.occupancy,
          },
          app_metadata: {
            linusku_account_type: row.accountType,
          },
        });
        error = result.error;
      }
      if (error) {
        failed += 1;
        results.push({ index: validation.index, id: row.email, status: 'failed', errors: [error.message] });
      } else {
        if (existing) updated += 1;
        else created += 1;
        results.push({
          index: validation.index,
          id: row.email,
          status: existing ? 'updated' : 'created',
          errors: [],
        });
      }
    }
  }

  await logAdminAction(authorization.client, {
    adminId: authorization.user.id,
    action: 'import_data',
    targetTable: resource,
    targetId: null,
    oldValue: null,
    newValue: { created, updated, failed, total: validations.length },
    ...getAdminRequestMetadata(request),
  });

  return NextResponse.json({
    ok: failed === 0,
    resource,
    created,
    updated,
    failed,
    results,
  });
}
