import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAdminRequestMetadata, logAdminAction } from '@/lib/adminAudit';
import {
  mergeLinuskuSettings,
  type LinuskuSettings,
} from '@/data/usuRoutes';

type SettingsCategory =
  | 'service'
  | 'schedule'
  | 'eta'
  | 'map'
  | 'features'
  | 'geofence';

type SettingsInput = Partial<LinuskuSettings>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseSettings(value: unknown): SettingsInput | null {
  if (!isRecord(value)) return null;
  const input = value;
  const allowedCategories = [
    'service',
    'schedule',
    'eta',
    'map',
    'features',
    'geofence',
  ];
  if (
    Object.keys(input).length === 0 ||
    Object.keys(input).some((key) => !allowedCategories.includes(key))
  ) {
    return null;
  }

  const result: SettingsInput = {};
  const service = input.service;
  if (service !== undefined) {
    if (!isRecord(service)) return null;
    result.service = {
      serviceDays: [1, 2, 3, 4, 5],
      openingTime: '07:00',
      closingTime: '17:00',
      timeZone: 'Asia/Jakarta',
    };
  }

  const schedule = input.schedule;
  if (schedule !== undefined) {
    if (!isRecord(schedule)) return null;
    const {
      firstDepartureTime,
      lastDepartureTime,
      headwayMinutes,
      timeZone,
    } = schedule;
    let validScheduleTimeZone = 'Asia/Jakarta';
    if (typeof timeZone === 'string') {
      try {
        new Intl.DateTimeFormat('en', { timeZone });
        validScheduleTimeZone = timeZone;
      } catch {
        validScheduleTimeZone = 'Asia/Jakarta';
      }
    }
    if (
      typeof firstDepartureTime !== 'string' ||
      typeof lastDepartureTime !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(firstDepartureTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(lastDepartureTime) ||
      firstDepartureTime >= lastDepartureTime ||
      !isFiniteNumber(headwayMinutes) ||
      !Number.isInteger(headwayMinutes) ||
      headwayMinutes < 1 ||
      headwayMinutes > 240
    ) {
      return null;
    }
    result.schedule = {
      firstDepartureTime,
      lastDepartureTime,
      headwayMinutes,
      timeZone: validScheduleTimeZone,
    };
  }

  const eta = input.eta;
  if (eta !== undefined) {
    if (!isRecord(eta)) return null;
    const {
      minSpeedKmh,
      maxSpeedKmh,
      staleThresholdSeconds,
      averageDwellSeconds,
      trafficMultiplier,
      confidenceThresholdSeconds,
    } = eta;
    if (
      !isFiniteNumber(minSpeedKmh) ||
      !isFiniteNumber(maxSpeedKmh) ||
      !isFiniteNumber(staleThresholdSeconds) ||
      minSpeedKmh <= 0 ||
      maxSpeedKmh < minSpeedKmh ||
      maxSpeedKmh > 120 ||
      staleThresholdSeconds <= 0 ||
      staleThresholdSeconds > 3600 ||
      (averageDwellSeconds !== undefined &&
        (!isFiniteNumber(averageDwellSeconds) || averageDwellSeconds < 0 || averageDwellSeconds > 600)) ||
      (trafficMultiplier !== undefined &&
        (!isFiniteNumber(trafficMultiplier) || trafficMultiplier < 1 || trafficMultiplier > 5)) ||
      (confidenceThresholdSeconds !== undefined &&
        (!isFiniteNumber(confidenceThresholdSeconds) ||
          confidenceThresholdSeconds <= 0 ||
          confidenceThresholdSeconds > 3600))
    ) {
      return null;
    }
    result.eta = {
      minSpeedKmh,
      maxSpeedKmh,
      staleThresholdSeconds,
      ...(averageDwellSeconds !== undefined ? { averageDwellSeconds } : {}),
      ...(trafficMultiplier !== undefined ? { trafficMultiplier } : {}),
      ...(confidenceThresholdSeconds !== undefined
        ? { confidenceThresholdSeconds }
        : {}),
    };
  }

  const map = input.map;
  if (map !== undefined) {
    if (!isRecord(map)) return null;
    const { tileProvider, fallbackToOsm } = map;
    if (
      (tileProvider !== 'carto_voyager' &&
        tileProvider !== 'pmtiles_r2' &&
        tileProvider !== 'osm') ||
      typeof fallbackToOsm !== 'boolean'
    ) {
      return null;
    }
    result.map = { tileProvider, fallbackToOsm };
  }

  const features = input.features;
  if (features !== undefined) {
    if (!isRecord(features)) return null;
    const {
      crowdReportingEnabled,
      simulationMode,
      maintenanceMode,
      pushNotificationsEnabled,
      driverAccessRequestsEnabled,
    } = features;
    if (
      typeof crowdReportingEnabled !== 'boolean' ||
      typeof simulationMode !== 'boolean' ||
      typeof maintenanceMode !== 'boolean' ||
      (pushNotificationsEnabled !== undefined &&
        typeof pushNotificationsEnabled !== 'boolean') ||
      (driverAccessRequestsEnabled !== undefined &&
        typeof driverAccessRequestsEnabled !== 'boolean')
    ) {
      return null;
    }
    result.features = {
      crowdReportingEnabled,
      simulationMode,
      maintenanceMode,
      ...(pushNotificationsEnabled !== undefined ? { pushNotificationsEnabled } : {}),
      ...(driverAccessRequestsEnabled !== undefined
        ? { driverAccessRequestsEnabled }
        : {}),
    };
  }

  const geofence = input.geofence;
  if (geofence !== undefined) {
    if (!isRecord(geofence) || !isRecord(geofence.campusBounds)) return null;
    const { campusBounds, maxDistanceFromRouteKm } = geofence;
    const { minLat, maxLat, minLng, maxLng } = campusBounds;
    if (
      !isFiniteNumber(minLat) ||
      !isFiniteNumber(maxLat) ||
      !isFiniteNumber(minLng) ||
      !isFiniteNumber(maxLng) ||
      !isFiniteNumber(maxDistanceFromRouteKm) ||
      minLat < -90 ||
      maxLat > 90 ||
      minLng < -180 ||
      maxLng > 180 ||
      minLat >= maxLat ||
      minLng >= maxLng ||
      maxDistanceFromRouteKm <= 0 ||
      maxDistanceFromRouteKm > 10
    ) {
      return null;
    }
    result.geofence = {
      campusBounds: { minLat, maxLat, minLng, maxLng },
      maxDistanceFromRouteKm,
    };
  }

  return result;
}

export async function PUT(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const body: unknown = await request.json().catch(() => null);
  const input = parseSettings(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Data pengaturan tidak valid.' },
      { status: 400 }
    );
  }

  const adminUser = authorization.user;
  const metadata = getAdminRequestMetadata(request);

  const categories = Object.keys(input) as SettingsCategory[];
  const { data: oldRows, error: oldRowsError } = await authorization.client
    .from('linusku_settings_v2')
    .select('key, value')
    .in('key', categories);
  if (oldRowsError) {
    return NextResponse.json(
      { error: `Pengaturan lama tidak dapat dibaca: ${oldRowsError.message}` },
      { status: 503 }
    );
  }

  const oldValues = new Map(
    (oldRows ?? []).map((row) => [row.key, row.value] as const)
  );
  const { data: rpcResults, error: updateError } = await authorization.client.rpc(
    'set_linusku_settings',
    { p_values: input }
  );
  let results: Record<string, unknown> = rpcResults ?? {};

  if (updateError) {
    const missingFunction =
      updateError.code === '42883' ||
      /function.*does not exist|schema cache/i.test(updateError.message);
    if (!missingFunction) {
      return NextResponse.json(
        { error: `Pengaturan belum dapat disimpan: ${updateError.message}` },
        { status: 503 }
      );
    }
    const fallbackResults: Record<string, unknown> = {};
    let fallbackError: string | null = null;
    for (const [category, value] of Object.entries(input)) {
      const { data, error } = await authorization.client
        .from('linusku_settings_v2')
        .upsert(
          {
            key: category,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .select('value, updated_at')
        .single();
      if (error) {
        fallbackError = error.message;
        break;
      }
      fallbackResults[category] = data;
    }
    if (fallbackError) {
      return NextResponse.json(
        { error: `Pengaturan belum dapat disimpan: ${fallbackError}` },
        { status: 503 }
      );
    }
    results = fallbackResults;
  }

  for (const [category, value] of Object.entries(input)) {
    const oldValue = oldValues.get(category);
    await logAdminAction(authorization.client, {
      adminId: adminUser.id,
      action: 'update_settings',
      targetTable: 'linusku_settings_v2',
      targetId: category,
      oldValue: isRecord(oldValue) ? oldValue : null,
      newValue: { ...value },
      ...metadata,
    });
  }

  return NextResponse.json({ settings: results });
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await authorization.client
    .from('linusku_settings_v2')
    .select('key, value, updated_at')
    .in('key', ['service', 'schedule', 'eta', 'map', 'features', 'geofence']);

  if (error) {
    return NextResponse.json(
      { error: `Gagal memuat pengaturan: ${error.message}` },
      { status: 503 }
    );
  }

  const settingsMap = new Map((data ?? []).map((row) => [row.key, row]));
  const normalized = mergeLinuskuSettings(
    Object.fromEntries((data ?? []).map((row) => [row.key, row.value]))
  );
  const result: Record<string, unknown> = {};

  for (const key of [
    'service',
    'schedule',
    'eta',
    'map',
    'features',
    'geofence',
  ] as SettingsCategory[]) {
    const row = settingsMap.get(key);
    result[key] = {
      value: normalized[key],
      updatedAt: row?.updated_at ?? null,
    };
  }

  return NextResponse.json({ settings: result });
}