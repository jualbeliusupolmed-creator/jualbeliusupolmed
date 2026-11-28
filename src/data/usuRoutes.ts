export interface BusStop {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  sequenceOrder: number;
}

export type OccupancyLevel = 'low' | 'medium' | 'full';

export type SourceType = 'driver' | 'device' | 'simulator' | 'crowd';

export interface LinusOperatingSettings {
  serviceDays: number[];
  openingTime: string;
  closingTime: string;
  timeZone: string;
}

export interface ScheduleSettings {
  firstDepartureTime: string;
  lastDepartureTime: string;
  headwayMinutes: number;
  timeZone: string;
}

export interface ETASettings {
  minSpeedKmh: number;
  maxSpeedKmh: number;
  staleThresholdSeconds: number;
  averageDwellSeconds?: number;
  trafficMultiplier?: number;
  confidenceThresholdSeconds?: number;
}

export type ResolvedETASettings = Required<ETASettings>;

export interface MapSettings {
  tileProvider: 'carto_voyager' | 'pmtiles_r2' | 'osm';
  fallbackToOsm: boolean;
}

export interface FeatureFlags {
  crowdReportingEnabled: boolean;
  simulationMode: boolean;
  maintenanceMode: boolean;
  pushNotificationsEnabled?: boolean;
  driverAccessRequestsEnabled?: boolean;
}

export type ResolvedFeatureFlags = Required<FeatureFlags>;

export interface GeofenceSettings {
  campusBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  maxDistanceFromRouteKm: number;
}

export interface LinuskuSettings {
  service: LinusOperatingSettings;
  schedule: ScheduleSettings;
  eta: ETASettings;
  map: MapSettings;
  features: FeatureFlags;
  geofence: GeofenceSettings;
}

export const DEFAULT_OPERATING_SETTINGS: LinusOperatingSettings = {
  serviceDays: [1, 2, 3, 4, 5],
  openingTime: '07:00',
  closingTime: '17:00',
  timeZone: 'Asia/Jakarta',
};

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  firstDepartureTime: '07:00',
  lastDepartureTime: '17:00',
  headwayMinutes: 15,
  timeZone: 'Asia/Jakarta',
};

export const DEFAULT_ETA_SETTINGS: ETASettings = {
  minSpeedKmh: 12,
  maxSpeedKmh: 80,
  staleThresholdSeconds: 45,
  averageDwellSeconds: 30,
  trafficMultiplier: 1,
  confidenceThresholdSeconds: 180,
};

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  tileProvider: 'osm',
  fallbackToOsm: true,
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  crowdReportingEnabled: true,
  simulationMode: false,
  maintenanceMode: false,
  pushNotificationsEnabled: false,
  driverAccessRequestsEnabled: false,
};

export const DEFAULT_GEOFENCE_SETTINGS: GeofenceSettings = {
  campusBounds: {
    minLat: 3.550,
    maxLat: 3.575,
    minLng: 98.648,
    maxLng: 98.665,
  },
  maxDistanceFromRouteKm: 0.3,
};

export const DEFAULT_LINUSKU_SETTINGS: LinuskuSettings = {
  service: DEFAULT_OPERATING_SETTINGS,
  schedule: DEFAULT_SCHEDULE_SETTINGS,
  eta: DEFAULT_ETA_SETTINGS,
  map: DEFAULT_MAP_SETTINGS,
  features: DEFAULT_FEATURE_FLAGS,
  geofence: DEFAULT_GEOFENCE_SETTINGS,
};

function resolveEtaSettings(settings: ETASettings): ResolvedETASettings {
  const minSpeedKmh = settings.minSpeedKmh;
  const maxSpeedKmh = settings.maxSpeedKmh;
  const staleThresholdSeconds = settings.staleThresholdSeconds;
  const averageDwellSeconds = settings.averageDwellSeconds;
  const trafficMultiplier = settings.trafficMultiplier;
  const confidenceThresholdSeconds = settings.confidenceThresholdSeconds;
  return {
    minSpeedKmh: isPositiveNumber(minSpeedKmh)
      ? minSpeedKmh
      : DEFAULT_ETA_SETTINGS.minSpeedKmh,
    maxSpeedKmh: isPositiveNumber(maxSpeedKmh)
      ? maxSpeedKmh
      : DEFAULT_ETA_SETTINGS.maxSpeedKmh,
    staleThresholdSeconds: isPositiveNumber(staleThresholdSeconds)
      ? staleThresholdSeconds
      : DEFAULT_ETA_SETTINGS.staleThresholdSeconds,
    averageDwellSeconds: isNonNegativeNumber(averageDwellSeconds)
      ? averageDwellSeconds
      : DEFAULT_ETA_SETTINGS.averageDwellSeconds ?? 30,
    trafficMultiplier:
      isPositiveNumber(trafficMultiplier) && trafficMultiplier >= 1
        ? trafficMultiplier
        : DEFAULT_ETA_SETTINGS.trafficMultiplier ?? 1,
    confidenceThresholdSeconds: isPositiveNumber(confidenceThresholdSeconds)
      ? confidenceThresholdSeconds
      : DEFAULT_ETA_SETTINGS.confidenceThresholdSeconds ?? 180,
  };
}

function settingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function settingValue(
  value: Record<string, unknown>,
  camelCaseKey: string,
  snakeCaseKey: string,
  isValid?: (setting: unknown) => boolean
): unknown {
  const camelCaseValue = value[camelCaseKey];
  const snakeCaseValue = value[snakeCaseKey];
  if (!isValid || (camelCaseValue != null && isValid(camelCaseValue))) {
    return camelCaseValue ?? snakeCaseValue;
  }
  if (snakeCaseValue != null && isValid(snakeCaseValue)) {
    return snakeCaseValue;
  }
  return camelCaseValue ?? snakeCaseValue;
}

function isSettingTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
  );
}

function settingTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    return fallback;
  }
  return value.slice(0, 5);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSupportedTimeZone(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validTimeZone(value: unknown, fallback: string): string {
  return isSupportedTimeZone(value) ? value : fallback;
}

export function mergeLinuskuSettings(
  values: Readonly<Record<string, unknown>>
): LinuskuSettings {
  const service = settingsRecord(values.service);
  const schedule = settingsRecord(values.schedule);
  const eta = settingsRecord(values.eta);
  const map = settingsRecord(values.map);
  const features = settingsRecord(values.features);
  const geofence = settingsRecord(values.geofence);
  const campusBounds = settingsRecord(geofence.campusBounds ?? geofence.campus_bounds);
  const serviceDays = settingValue(service, 'serviceDays', 'service_days');
  const timeZone = service.timeZone ?? service.time_zone;
  const firstDepartureTime = settingValue(
    schedule,
    'firstDepartureTime',
    'first_departure_time',
    isSettingTime
  );
  const lastDepartureTime = settingValue(
    schedule,
    'lastDepartureTime',
    'last_departure_time',
    isSettingTime
  );
  const headwayMinutes = settingValue(
    schedule,
    'headwayMinutes',
    'headway_minutes',
    (value) => isPositiveNumber(value) && Number.isInteger(value) && value <= 240
  );
  const scheduleTimeZone = settingValue(
    schedule,
    'timeZone',
    'time_zone',
    isSupportedTimeZone
  );
  const minSpeedKmh = settingValue(eta, 'minSpeedKmh', 'min_speed_kmh');
  const maxSpeedKmh = settingValue(eta, 'maxSpeedKmh', 'max_speed_kmh');
  const staleThresholdSeconds = settingValue(
    eta,
    'staleThresholdSeconds',
    'stale_threshold_seconds'
  );
  const averageDwellSeconds = settingValue(
    eta,
    'averageDwellSeconds',
    'average_dwell_seconds',
    isNonNegativeNumber
  );
  const trafficMultiplier = settingValue(
    eta,
    'trafficMultiplier',
    'traffic_multiplier',
    (value) => isPositiveNumber(value) && value >= 1
  );
  const confidenceThresholdSeconds = settingValue(
    eta,
    'confidenceThresholdSeconds',
    'confidence_threshold_seconds',
    isPositiveNumber
  );
  const tileProvider = settingValue(map, 'tileProvider', 'tile_provider');
  const fallbackToOsm = settingValue(map, 'fallbackToOsm', 'fallback_to_osm');
  const crowdReportingEnabled = settingValue(
    features,
    'crowdReportingEnabled',
    'crowd_reporting_enabled'
  );
  const simulationMode = settingValue(features, 'simulationMode', 'simulation_mode');
  const maintenanceMode = settingValue(
    features,
    'maintenanceMode',
    'maintenance_mode'
  );
  const pushNotificationsEnabled = settingValue(
    features,
    'pushNotificationsEnabled',
    'push_notifications_enabled',
    (value) => typeof value === 'boolean'
  );
  const driverAccessRequestsEnabled = settingValue(
    features,
    'driverAccessRequestsEnabled',
    'driver_access_requests_enabled',
    (value) => typeof value === 'boolean'
  );
  const minLat = settingValue(campusBounds, 'minLat', 'min_lat');
  const maxLat = settingValue(campusBounds, 'maxLat', 'max_lat');
  const minLng = settingValue(campusBounds, 'minLng', 'min_lng');
  const maxLng = settingValue(campusBounds, 'maxLng', 'max_lng');
  const maxDistanceFromRouteKm = settingValue(
    geofence,
    'maxDistanceFromRouteKm',
    'max_distance_from_route_km'
  );
  const normalizedDays =
    Array.isArray(serviceDays) &&
    serviceDays.length > 0 &&
    serviceDays.every(
      (day) => Number.isInteger(day) && Number(day) >= 1 && Number(day) <= 7
    ) &&
    new Set(serviceDays).size === serviceDays.length
      ? serviceDays as number[]
      : DEFAULT_OPERATING_SETTINGS.serviceDays;
  let normalizedFirstDepartureTime = settingTime(
    firstDepartureTime,
    DEFAULT_SCHEDULE_SETTINGS.firstDepartureTime
  );
  let normalizedLastDepartureTime = settingTime(
    lastDepartureTime,
    DEFAULT_SCHEDULE_SETTINGS.lastDepartureTime
  );
  if (normalizedFirstDepartureTime >= normalizedLastDepartureTime) {
    normalizedFirstDepartureTime = DEFAULT_SCHEDULE_SETTINGS.firstDepartureTime;
    normalizedLastDepartureTime = DEFAULT_SCHEDULE_SETTINGS.lastDepartureTime;
  }
  const normalizedHeadwayMinutes =
    isPositiveNumber(headwayMinutes) &&
    Number.isInteger(headwayMinutes) &&
    headwayMinutes <= 240
      ? headwayMinutes
      : DEFAULT_SCHEDULE_SETTINGS.headwayMinutes;
  const normalizedScheduleTimeZone = validTimeZone(
    scheduleTimeZone,
    DEFAULT_SCHEDULE_SETTINGS.timeZone
  );
  const validBounds =
    typeof minLat === 'number' &&
    typeof maxLat === 'number' &&
    typeof minLng === 'number' &&
    typeof maxLng === 'number' &&
    Number.isFinite(minLat) &&
    Number.isFinite(maxLat) &&
    Number.isFinite(minLng) &&
    Number.isFinite(maxLng) &&
    minLat < maxLat &&
    minLng < maxLng;

  const normalizedServiceTimeZone = validTimeZone(
    timeZone,
    DEFAULT_OPERATING_SETTINGS.timeZone
  );

  return {
    service: {
      serviceDays: normalizedDays,
      openingTime: settingTime(
        settingValue(service, 'openingTime', 'opening_time'),
        DEFAULT_OPERATING_SETTINGS.openingTime
      ),
      closingTime: settingTime(
        settingValue(service, 'closingTime', 'closing_time'),
        DEFAULT_OPERATING_SETTINGS.closingTime
      ),
      timeZone: normalizedServiceTimeZone,
    },
    schedule: {
      firstDepartureTime: normalizedFirstDepartureTime,
      lastDepartureTime: normalizedLastDepartureTime,
      headwayMinutes: normalizedHeadwayMinutes,
      timeZone: normalizedScheduleTimeZone,
    },
    eta: {
      minSpeedKmh:
        typeof minSpeedKmh === 'number' &&
        Number.isFinite(minSpeedKmh) &&
        minSpeedKmh > 0
          ? minSpeedKmh
          : DEFAULT_ETA_SETTINGS.minSpeedKmh,
      maxSpeedKmh:
        typeof maxSpeedKmh === 'number' &&
        Number.isFinite(maxSpeedKmh) &&
        maxSpeedKmh > 0
          ? maxSpeedKmh
          : DEFAULT_ETA_SETTINGS.maxSpeedKmh,
      staleThresholdSeconds:
        typeof staleThresholdSeconds === 'number' &&
        Number.isFinite(staleThresholdSeconds) &&
        staleThresholdSeconds > 0
          ? staleThresholdSeconds
          : DEFAULT_ETA_SETTINGS.staleThresholdSeconds,
      averageDwellSeconds: isNonNegativeNumber(averageDwellSeconds)
        ? averageDwellSeconds
        : DEFAULT_ETA_SETTINGS.averageDwellSeconds,
      trafficMultiplier:
        isPositiveNumber(trafficMultiplier) && trafficMultiplier >= 1
          ? trafficMultiplier
          : DEFAULT_ETA_SETTINGS.trafficMultiplier,
      confidenceThresholdSeconds: isPositiveNumber(confidenceThresholdSeconds)
        ? confidenceThresholdSeconds
        : DEFAULT_ETA_SETTINGS.confidenceThresholdSeconds,
    },
    map: {
      tileProvider:
        tileProvider === 'carto_voyager' ||
        tileProvider === 'pmtiles_r2' ||
        tileProvider === 'osm'
          ? tileProvider
          : DEFAULT_MAP_SETTINGS.tileProvider,
      fallbackToOsm:
        typeof fallbackToOsm === 'boolean'
          ? fallbackToOsm
          : DEFAULT_MAP_SETTINGS.fallbackToOsm,
    },
    features: {
      crowdReportingEnabled:
        typeof crowdReportingEnabled === 'boolean'
          ? crowdReportingEnabled
          : DEFAULT_FEATURE_FLAGS.crowdReportingEnabled,
      simulationMode:
        typeof simulationMode === 'boolean'
          ? simulationMode
          : DEFAULT_FEATURE_FLAGS.simulationMode,
      maintenanceMode:
        typeof maintenanceMode === 'boolean'
          ? maintenanceMode
          : DEFAULT_FEATURE_FLAGS.maintenanceMode,
      pushNotificationsEnabled:
        typeof pushNotificationsEnabled === 'boolean'
          ? pushNotificationsEnabled
          : DEFAULT_FEATURE_FLAGS.pushNotificationsEnabled,
      driverAccessRequestsEnabled:
        typeof driverAccessRequestsEnabled === 'boolean'
          ? driverAccessRequestsEnabled
          : DEFAULT_FEATURE_FLAGS.driverAccessRequestsEnabled,
    },
    geofence: {
      campusBounds: validBounds
        ? {
            minLat: minLat as number,
            maxLat: maxLat as number,
            minLng: minLng as number,
            maxLng: maxLng as number,
          }
        : DEFAULT_GEOFENCE_SETTINGS.campusBounds,
      maxDistanceFromRouteKm:
        typeof maxDistanceFromRouteKm === 'number' &&
        Number.isFinite(maxDistanceFromRouteKm) &&
        maxDistanceFromRouteKm > 0
          ? maxDistanceFromRouteKm
          : DEFAULT_GEOFENCE_SETTINGS.maxDistanceFromRouteKm,
    },
  };
}

export type ScheduleDateInput = Date | string;

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  };
}

function zonedDateTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const observed = getZonedDateParts(new Date(utcGuess), timeZone);
  const offset =
    Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    ) - utcGuess;
  let result = new Date(utcGuess - offset);
  const adjusted = getZonedDateParts(result, timeZone);
  if (
    adjusted.year !== year ||
    adjusted.month !== month ||
    adjusted.day !== day ||
    adjusted.hour !== hour ||
    adjusted.minute !== minute ||
    adjusted.second !== second
  ) {
    const adjustedOffset =
      Date.UTC(
        adjusted.year,
        adjusted.month - 1,
        adjusted.day,
        adjusted.hour,
        adjusted.minute,
        adjusted.second
      ) - result.getTime();
    result = new Date(utcGuess - adjustedOffset);
  }
  return result;
}

function normalizedScheduleSettings(
  settings: ScheduleSettings
): ScheduleSettings {
  let firstDepartureTime = settingTime(
    settings.firstDepartureTime,
    DEFAULT_SCHEDULE_SETTINGS.firstDepartureTime
  );
  let lastDepartureTime = settingTime(
    settings.lastDepartureTime,
    DEFAULT_SCHEDULE_SETTINGS.lastDepartureTime
  );
  if (firstDepartureTime >= lastDepartureTime) {
    firstDepartureTime = DEFAULT_SCHEDULE_SETTINGS.firstDepartureTime;
    lastDepartureTime = DEFAULT_SCHEDULE_SETTINGS.lastDepartureTime;
  }
  return {
    firstDepartureTime,
    lastDepartureTime,
    headwayMinutes:
      isPositiveNumber(settings.headwayMinutes) &&
      Number.isInteger(settings.headwayMinutes) &&
      settings.headwayMinutes <= 240
        ? settings.headwayMinutes
        : DEFAULT_SCHEDULE_SETTINGS.headwayMinutes,
    timeZone: validTimeZone(settings.timeZone, DEFAULT_SCHEDULE_SETTINGS.timeZone),
  };
}

function timeToMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function addCalendarDays(parts: ZonedDateParts, days: number): ZonedDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function parseScheduleReference(
  reference: ScheduleDateInput,
  timeZone: string
): { date: Date; local: ZonedDateParts; calendarOnly: boolean } {
  if (reference instanceof Date) {
    if (!Number.isFinite(reference.getTime())) {
      const fallback = new Date();
      return {
        date: fallback,
        local: getZonedDateParts(fallback, timeZone),
        calendarOnly: false,
      };
    }
    return {
      date: reference,
      local: getZonedDateParts(reference, timeZone),
      calendarOnly: false,
    };
  }

  const calendarOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(reference);
  if (calendarOnly) {
    const local = {
      year: Number(calendarOnly[1]),
      month: Number(calendarOnly[2]),
      day: Number(calendarOnly[3]),
      hour: 0,
      minute: 0,
      second: 0,
    };
    return {
      date: zonedDateTimeToDate(
        local.year,
        local.month,
        local.day,
        local.hour,
        local.minute,
        local.second,
        timeZone
      ),
      local,
      calendarOnly: true,
    };
  }

  const localDateTime =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(reference);
  if (localDateTime) {
    const local = {
      year: Number(localDateTime[1]),
      month: Number(localDateTime[2]),
      day: Number(localDateTime[3]),
      hour: Number(localDateTime[4]),
      minute: Number(localDateTime[5]),
      second: Number(localDateTime[6] ?? 0),
    };
    return {
      date: zonedDateTimeToDate(
        local.year,
        local.month,
        local.day,
        local.hour,
        local.minute,
        local.second,
        timeZone
      ),
      local,
      calendarOnly: false,
    };
  }

  const parsed = new Date(reference);
  if (Number.isFinite(parsed.getTime())) {
    return {
      date: parsed,
      local: getZonedDateParts(parsed, timeZone),
      calendarOnly: false,
    };
  }

  const fallback = new Date();
  return {
    date: fallback,
    local: getZonedDateParts(fallback, timeZone),
    calendarOnly: false,
  };
}

export function getNextDepartureTimes(
  from?: ScheduleDateInput,
  scheduleSettings?: ScheduleSettings,
  count?: number
): string[];
export function getNextDepartureTimes(
  scheduleSettings: ScheduleSettings,
  from?: ScheduleDateInput,
  count?: number
): string[];
export function getNextDepartureTimes(
  fromOrSettings: ScheduleDateInput | ScheduleSettings = new Date(),
  settingsOrFrom: ScheduleSettings | ScheduleDateInput = DEFAULT_SCHEDULE_SETTINGS,
  requestedCount = 3
): string[] {
  const fromIsDate =
    fromOrSettings instanceof Date || typeof fromOrSettings === 'string';
  const from = fromIsDate
    ? fromOrSettings
    : settingsOrFrom instanceof Date || typeof settingsOrFrom === 'string'
      ? settingsOrFrom
      : new Date();
  const scheduleSettings = fromIsDate
    ? settingsOrFrom instanceof Date || typeof settingsOrFrom === 'string'
      ? DEFAULT_SCHEDULE_SETTINGS
      : settingsOrFrom
    : fromOrSettings;
  const normalized = normalizedScheduleSettings(scheduleSettings);
  const requested = Math.max(
    0,
    Math.min(50, Number.isFinite(requestedCount) ? Math.floor(requestedCount) : 3)
  );
  if (requested === 0) {
    return [];
  }

  const reference = parseScheduleReference(from, normalized.timeZone);
  const firstMinutes = timeToMinutes(normalized.firstDepartureTime);
  const lastMinutes = timeToMinutes(normalized.lastDepartureTime);
  const departures: string[] = [];

  for (let dayOffset = 0; dayOffset <= 31 && departures.length < requested; dayOffset++) {
    const day = addCalendarDays(reference.local, dayOffset);
    for (
      let departureMinutes = firstMinutes;
      departureMinutes <= lastMinutes && departures.length < requested;
      departureMinutes += normalized.headwayMinutes
    ) {
      const departure = zonedDateTimeToDate(
        day.year,
        day.month,
        day.day,
        Math.floor(departureMinutes / 60),
        departureMinutes % 60,
        0,
        normalized.timeZone
      );
      if (
        dayOffset > 0 ||
        reference.calendarOnly ||
        departure.getTime() >= reference.date.getTime()
      ) {
        departures.push(departure.toISOString());
      }
    }
  }

  return departures;
}

export const getNextDepartures = getNextDepartureTimes;
export const calculateNextDepartures = getNextDepartureTimes;
export const getUpcomingDepartureTimes = getNextDepartureTimes;

export const PEAK_TRAFFIC_MULTIPLIER = 1.25;
export const NORMAL_TRAFFIC_MULTIPLIER = 1;

export function getTrafficMultiplier(
  date: Date = new Date(),
  scheduleSettings: ScheduleSettings = DEFAULT_SCHEDULE_SETTINGS,
  baseMultiplier: number = DEFAULT_ETA_SETTINGS.trafficMultiplier ?? 1
): number {
  const normalized = normalizedScheduleSettings(scheduleSettings);
  const local = getZonedDateParts(date, normalized.timeZone);
  const localMinutes = local.hour * 60 + local.minute;
  const firstMinutes = timeToMinutes(normalized.firstDepartureTime);
  const lastMinutes = timeToMinutes(normalized.lastDepartureTime);
  const base = isPositiveNumber(baseMultiplier) && baseMultiplier >= 1 ? baseMultiplier : 1;
  if (localMinutes < firstMinutes || localMinutes >= lastMinutes) {
    return base;
  }
  const morningPeakEnd = Math.min(lastMinutes, firstMinutes + 120);
  const eveningPeakStart = Math.max(firstMinutes, lastMinutes - 120);
  const isPeak =
    (localMinutes >= firstMinutes && localMinutes < morningPeakEnd) ||
    (localMinutes >= eveningPeakStart && localMinutes < lastMinutes);
  return base * (isPeak ? PEAK_TRAFFIC_MULTIPLIER : NORMAL_TRAFFIC_MULTIPLIER);
}

export const calculateTrafficMultiplier = getTrafficMultiplier;

export interface BusPosition {
  busId: string;
  name: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  occupancy: OccupancyLevel;
  sourceType: SourceType;
  updatedAt: string;
}

export interface BusPositionHistory {
  id: number;
  busId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  occupancy: OccupancyLevel;
  sourceType: SourceType;
  recordedAt: string;
}

export interface AdminAuditLog {
  id: number;
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DriverSession {
  id: string;
  driverId: string;
  busId: string | null;
  sessionToken: string;
  deviceInfo: Record<string, unknown> | null;
  ipAddress: string | null;
  startedAt: string;
  endedAt: string | null;
  lastGpsAt: string | null;
  gpsCount: number;
  status: 'active' | 'ended' | 'expired';
}

/**
 * Daftar halte utama Bus Lintas USU (Linus) di Kampus Padang Bulan
 * disusun berurutan mengikuti loop jalan kampus (Pintu 1 -> Dr. Mansyur -> Tri Dharma -> Bioteknologi -> Perpustakaan -> Universitas).
 */
export const USU_STOPS: BusStop[] = [
  {
    id: 'halte-pintu-1',
    name: 'Halte Pintu 1 / Gelanggang',
    area: 'Jl. Universitas (Pintu 1)',
    lat: 3.5656,
    lng: 98.6594,
    sequenceOrder: 1,
  },
  {
    id: 'halte-fk',
    name: 'Halte FK / RS USU',
    area: 'Jl. Dr. T. Mansyur',
    lat: 3.5673,
    lng: 98.6552,
    sequenceOrder: 2,
  },
  {
    id: 'halte-biro',
    name: 'Halte Biro Rektor / Pancasila',
    area: 'Jl. Dr. T. Mansyur',
    lat: 3.5668,
    lng: 98.6528,
    sequenceOrder: 3,
  },
  {
    id: 'halte-vokasi',
    name: 'Halte Fakultas Vokasi / Pintu 4',
    area: 'Jl. Tri Dharma',
    lat: 3.5618,
    lng: 98.6519,
    sequenceOrder: 4,
  },
  {
    id: 'halte-fmipa',
    name: 'Halte FMIPA & Fasilkom-TI',
    area: 'Jl. Bioteknologi',
    lat: 3.5592,
    lng: 98.6542,
    sequenceOrder: 5,
  },
  {
    id: 'halte-feb',
    name: 'Halte FEB USU',
    area: 'Jl. Prof. T.M. Hanafiah',
    lat: 3.5598,
    lng: 98.6562,
    sequenceOrder: 6,
  },
  {
    id: 'halte-perpus',
    name: 'Halte Perpustakaan USU',
    area: 'Jl. Perpustakaan',
    lat: 3.5612,
    lng: 98.6568,
    sequenceOrder: 7,
  },
  {
    id: 'halte-fisip',
    name: 'Halte FISIP & FIB',
    area: 'Jl. Sivitas Akademika',
    lat: 3.5625,
    lng: 98.6572,
    sequenceOrder: 8,
  },
  {
    id: 'halte-teknik',
    name: 'Halte Fakultas Teknik',
    area: 'Jl. Almamater',
    lat: 3.5618,
    lng: 98.6586,
    sequenceOrder: 9,
  },
  {
    id: 'halte-hukum',
    name: 'Halte Fakultas Hukum',
    area: 'Jl. Universitas',
    lat: 3.5639,
    lng: 98.659,
    sequenceOrder: 10,
  },
];

export const ROUTE_POLYLINE: [number, number][] = [
  ...USU_STOPS.map((stop): [number, number] => [stop.lat, stop.lng]),
  [USU_STOPS[0].lat, USU_STOPS[0].lng],
];

export const USU_CENTER: [number, number] = [3.563, 98.6556];

/**
 * Batas tampilan peta khusus Kampus USU Padang Bulan + ~100-150m di sekelilingnya.
 * Digunakan untuk maxBounds peta dan membatasi request tile di luar kampus.
 */
export const USU_MAP_BOUNDS: [[number, number], [number, number]] = [
  [3.5572, 98.6472],
  [3.5695, 98.6612],
];

export const CAMPUS_BOUNDS = DEFAULT_GEOFENCE_SETTINGS.campusBounds;

export function isInsideCampus(lat: number, lng: number, bounds = CAMPUS_BOUNDS): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/**
 * Validates if a coordinate is within campus bounds using settings from DB
 */
export function isInsideCampusWithSettings(
  lat: number,
  lng: number,
  settings: LinuskuSettings = DEFAULT_LINUSKU_SETTINGS
): boolean {
  return isInsideCampus(lat, lng, settings.geofence.campusBounds);
}

/**
 * Validates if a coordinate is near the route using settings from DB
 */
export function isNearRouteWithSettings(
  lat: number,
  lng: number,
  settings: LinuskuSettings = DEFAULT_LINUSKU_SETTINGS,
  polyline: [number, number][] = ROUTE_POLYLINE
): boolean {
  const projection = projectToRoute(lat, lng, polyline);
  return projection.distanceKm <= settings.geofence.maxDistanceFromRouteKm;
}

export function findNearestStop(
  lat: number,
  lng: number,
  stops: BusStop[] = USU_STOPS
): { stop: BusStop; distanceKm: number; distanceMeters: number } {
  const availableStops = stops.length > 0 ? stops : USU_STOPS;
  return availableStops.map((stop) => {
    const straightDistanceKm = haversineDistanceKm(
      lat,
      lng,
      stop.lat,
      stop.lng
    );
    return {
      stop,
      distanceKm: straightDistanceKm,
      distanceMeters: Math.round(straightDistanceKm * 1250),
    };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
}

export function getLinusOperatingStatus(
  now = new Date(),
  _settings: LinusOperatingSettings = DEFAULT_OPERATING_SETTINGS
) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = get('weekday');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const totalMinutes = hour * 60 + minute;
  const weekdayNumber: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const openingMinutes = 7 * 60;
  const closingMinutes = 17 * 60;
  const isOpen =
    [1, 2, 3, 4, 5].includes(weekdayNumber[weekday]) &&
    totalMinutes >= openingMinutes &&
    totalMinutes < closingMinutes;
  const serviceDayLabel = 'Senin sampai Jumat';
  const hoursLabel = '07.00 sampai 17.00 WIB';

  return {
    isOpen,
    label: isOpen
      ? 'Jam operasional'
      : 'Di luar jam operasional',
    detail: isOpen
      ? `${serviceDayLabel}, ${hoursLabel}`
      : `Linus beroperasi ${serviceDayLabel}, ${hoursLabel}`,
  };
}

/**
 * Menghitung jarak Haversine antar dua koordinat dalam kilometer.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Menghitung estimasi waktu tiba (menit) ke halte tertentu.
 * Uses settings for min/max speed if provided.
 */
export function estimateEtaMinutes(
  bus: Pick<BusPosition, 'lat' | 'lng' | 'speedKmh'>,
  stop: BusStop,
  polyline: [number, number][] = ROUTE_POLYLINE,
  etaSettings: ETASettings = DEFAULT_ETA_SETTINGS
): number {
  const roadDistanceKm = routeDistanceToStopKm(
    bus.lat,
    bus.lng,
    stop,
    polyline
  );
  const effectiveSpeed = Math.min(
    Math.max(bus.speedKmh || etaSettings.minSpeedKmh, etaSettings.minSpeedKmh),
    etaSettings.maxSpeedKmh
  );
  const minutes = Math.round((roadDistanceKm / effectiveSpeed) * 60);
  return Math.max(minutes, 1);
}

export type HistoricalSpeedSample = number | { speedKmh: number };

export interface EtaEstimateDetails {
  minutes: number;
  absoluteArrival: string | null;
  distanceKm: number;
  effectiveSpeedKmh: number;
  confidence: number;
}

export interface EtaDetailsOptions {
  polyline?: [number, number][];
  etaSettings?: ETASettings;
  now?: Date;
  historicalSpeedKmh?: readonly HistoricalSpeedSample[];
  historicalSpeeds?: readonly HistoricalSpeedSample[];
  scheduleSettings?: ScheduleSettings;
}

function historicalSpeedValue(sample: HistoricalSpeedSample): number | null {
  const speed = typeof sample === 'number' ? sample : sample.speedKmh;
  return isPositiveNumber(speed) ? speed : null;
}

export function medianHistoricalSpeed(
  speedKmh: readonly HistoricalSpeedSample[]
): number | null {
  const validSpeeds = speedKmh
    .map(historicalSpeedValue)
    .filter((speed): speed is number => speed !== null)
    .sort((left, right) => left - right);
  if (validSpeeds.length === 0) {
    return null;
  }
  const middle = Math.floor(validSpeeds.length / 2);
  if (validSpeeds.length % 2 === 1) {
    return validSpeeds[middle];
  }
  return (validSpeeds[middle - 1] + validSpeeds[middle]) / 2;
}

export const calculateMedianHistoricalSpeed = medianHistoricalSpeed;
export const calculateMedianSpeed = medianHistoricalSpeed;

export function blendSpeed(
  currentSpeedKmh: number,
  historicalSpeedKmh: readonly HistoricalSpeedSample[] | HistoricalSpeedSample | null | undefined,
  currentWeight = 0.7
): number {
  const median = Array.isArray(historicalSpeedKmh)
    ? medianHistoricalSpeed(
        historicalSpeedKmh as readonly HistoricalSpeedSample[]
      )
    : historicalSpeedKmh === null || historicalSpeedKmh === undefined
      ? null
      : historicalSpeedValue(historicalSpeedKmh as HistoricalSpeedSample);
  const current = isPositiveNumber(currentSpeedKmh) ? currentSpeedKmh : null;
  if (median === null) {
    return current ?? 0;
  }
  if (current === null) {
    return median;
  }
  const weight = Number.isFinite(currentWeight)
    ? Math.max(0, Math.min(1, currentWeight))
    : 0.7;
  return current * weight + median * (1 - weight);
}

export const blendSpeedWithHistorical = blendSpeed;

function estimateConfidence(
  bus: Pick<BusPosition, 'lat' | 'lng' | 'speedKmh'> &
    Partial<Pick<BusPosition, 'updatedAt'>>,
  etaSettings: ResolvedETASettings,
  now: Date,
  historicalSampleCount: number,
  distanceKm: number
): number {
  let freshnessConfidence = 0.7;
  if (bus.updatedAt) {
    const updatedAt = new Date(bus.updatedAt).getTime();
    if (Number.isFinite(updatedAt)) {
      const ageSeconds = Math.max(0, (now.getTime() - updatedAt) / 1000);
      freshnessConfidence =
        ageSeconds <= etaSettings.staleThresholdSeconds
          ? 1
          : Math.max(
              0,
              1 -
                (ageSeconds - etaSettings.staleThresholdSeconds) /
                  etaSettings.confidenceThresholdSeconds
            );
    }
  }
  const historyBoost = Math.min(historicalSampleCount, 5) * 0.04;
  const distanceConfidence =
    distanceKm <= 5
      ? 1
      : Math.max(0.7, 1 - (distanceKm - 5) / 15);
  return Math.max(
    0,
    Math.min(1, (freshnessConfidence + historyBoost) * distanceConfidence)
  );
}

export function estimateEtaDetails(
  bus: Pick<BusPosition, 'lat' | 'lng' | 'speedKmh'> &
    Partial<Pick<BusPosition, 'updatedAt'>>,
  stop: BusStop,
  options: EtaDetailsOptions
): EtaEstimateDetails;
export function estimateEtaDetails(
  bus: Pick<BusPosition, 'lat' | 'lng' | 'speedKmh'> &
    Partial<Pick<BusPosition, 'updatedAt'>>,
  stop: BusStop,
  polyline?: [number, number][],
  etaSettings?: ETASettings,
  now?: Date | readonly HistoricalSpeedSample[],
  historicalSpeedKmh?: readonly HistoricalSpeedSample[],
  scheduleSettings?: ScheduleSettings
): EtaEstimateDetails;
export function estimateEtaDetails(
  bus: Pick<BusPosition, 'lat' | 'lng' | 'speedKmh'> &
    Partial<Pick<BusPosition, 'updatedAt'>>,
  stop: BusStop,
  polylineOrOptions: [number, number][] | EtaDetailsOptions = ROUTE_POLYLINE,
  positionalEtaSettings: ETASettings = DEFAULT_ETA_SETTINGS,
  positionalNow: Date | readonly HistoricalSpeedSample[] = new Date(),
  positionalHistoricalSpeedKmh: readonly HistoricalSpeedSample[] = [],
  positionalScheduleSettings: ScheduleSettings = DEFAULT_SCHEDULE_SETTINGS
): EtaEstimateDetails {
  const options =
    !Array.isArray(polylineOrOptions) && polylineOrOptions
      ? polylineOrOptions
      : undefined;
  const polyline = options?.polyline ??
    (Array.isArray(polylineOrOptions) ? polylineOrOptions : ROUTE_POLYLINE);
  const etaSettings = resolveEtaSettings(
    options?.etaSettings ?? positionalEtaSettings
  );
  const positionalHistory = Array.isArray(positionalNow)
    ? (positionalNow as readonly HistoricalSpeedSample[])
    : null;
  const now: Date =
    options?.now ?? (positionalHistory ? new Date() : (positionalNow as Date));
  const historicalSpeedKmh =
    options?.historicalSpeedKmh ??
    options?.historicalSpeeds ??
    (positionalHistory ?? positionalHistoricalSpeedKmh);
  const scheduleSettings =
    options?.scheduleSettings ?? positionalScheduleSettings;
  const distanceKm = routeDistanceToStopKm(
    bus.lat,
    bus.lng,
    stop,
    polyline
  );
  const median = medianHistoricalSpeed(historicalSpeedKmh);
  const blendedSpeed = blendSpeed(bus.speedKmh, median);
  const boundedSpeed = Math.min(
    Math.max(
      blendedSpeed || etaSettings.minSpeedKmh,
      etaSettings.minSpeedKmh
    ),
    etaSettings.maxSpeedKmh
  );
  const trafficMultiplier = getTrafficMultiplier(
    now,
    scheduleSettings,
    etaSettings.trafficMultiplier
  );
  const effectiveSpeedKmh = boundedSpeed / trafficMultiplier;
  const travelMinutes =
    distanceKm > 0 ? (distanceKm / effectiveSpeedKmh) * 60 : 0;
  const dwellMinutes =
    distanceKm > 0 ? etaSettings.averageDwellSeconds / 60 : 0;
  const minutes = Math.max(1, Math.ceil(travelMinutes + dwellMinutes));
  const absoluteArrival = Number.isFinite(now.getTime())
    ? new Date(now.getTime() + minutes * 60_000).toISOString()
    : null;

  return {
    minutes,
    absoluteArrival,
    distanceKm,
    effectiveSpeedKmh,
    confidence: estimateConfidence(
      bus,
      etaSettings,
      now,
      historicalSpeedKmh.length,
      distanceKm
    ),
  };
}

function getRouteMetrics(polyline: [number, number][]) {
  const segmentLengthsKm = polyline.slice(1).map((point, index) => {
    const previous = polyline[index];
    return haversineDistanceKm(previous[0], previous[1], point[0], point[1]);
  });

  return {
    segmentLengthsKm,
    totalRouteKm: segmentLengthsKm.reduce((total, length) => total + length, 0),
  };
}

export function projectToRoute(
  lat: number,
  lng: number,
  polyline: [number, number][] = ROUTE_POLYLINE
): { lat: number; lng: number; progress: number; distanceKm: number } {
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;
  const { segmentLengthsKm, totalRouteKm } = getRouteMetrics(activeLine);

  let best = {
    lat: activeLine[0][0],
    lng: activeLine[0][1],
    progress: 0,
    distanceKm: Number.POSITIVE_INFINITY,
  };

  let distanceAlongRouteKm = 0;
  const totalSegments = activeLine.length - 1;

  for (let i = 0; i < totalSegments; i++) {
    const [lat1, lng1] = activeLine[i];
    const [lat2, lng2] = activeLine[i + 1];
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((lng - lng1) * dx + (lat - lat1) * dy) / lengthSquared
            )
          );
    const projectedLat = lat1 + dy * t;
    const projectedLng = lng1 + dx * t;
    const distanceKm = haversineDistanceKm(
      lat,
      lng,
      projectedLat,
      projectedLng
    );
    if (distanceKm < best.distanceKm) {
      best = {
        lat: projectedLat,
        lng: projectedLng,
        progress:
          totalRouteKm > 0
            ? (distanceAlongRouteKm + segmentLengthsKm[i] * t) / totalRouteKm
            : 0,
        distanceKm,
      };
    }
    distanceAlongRouteKm += segmentLengthsKm[i];
  }
  return best;
}

export function routeDistanceToStopKm(
  lat: number,
  lng: number,
  stop: BusStop,
  polyline: [number, number][] = ROUTE_POLYLINE
): number {
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;
  const bus = projectToRoute(lat, lng, activeLine);
  const stopPoint = projectToRoute(stop.lat, stop.lng, activeLine);
  let progressDelta = stopPoint.progress - bus.progress;
  if (progressDelta < 0) progressDelta += 1;
  const { totalRouteKm } = getRouteMetrics(activeLine);

  return Math.max(0, totalRouteKm * progressDelta);
}

/**
 * Menghitung posisi interpolasi di sepanjang rute jalan aspal melingkar.
 */
export function interpolateAlongRoute(
  progress: number,
  polyline: [number, number][] = ROUTE_POLYLINE
): {
  lat: number;
  lng: number;
  heading: number;
} {
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;
  const totalSegments = activeLine.length - 1;
  const { segmentLengthsKm, totalRouteKm } = getRouteMetrics(activeLine);
  const wrapped = ((progress % 1) + 1) % 1;
  const targetDistanceKm = wrapped * totalRouteKm;
  let distanceAlongRouteKm = 0;
  let index = totalSegments - 1;
  let t = 1;

  for (let i = 0; i < totalSegments; i++) {
    const segmentLengthKm = segmentLengthsKm[i];
    if (
      targetDistanceKm <= distanceAlongRouteKm + segmentLengthKm ||
      i === totalSegments - 1
    ) {
      index = i;
      t =
        segmentLengthKm > 0
          ? (targetDistanceKm - distanceAlongRouteKm) / segmentLengthKm
          : 0;
      break;
    }
    distanceAlongRouteKm += segmentLengthKm;
  }

  const [lat1, lng1] = activeLine[index];
  const [lat2, lng2] = activeLine[index + 1];

  const lat = lat1 + (lat2 - lat1) * t;
  const lng = lng1 + (lng2 - lng1) * t;
  const heading = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI;

  return { lat, lng, heading };
}

/**
 * Mengembalikan urutan halte yang akan dilewati bus sebelum mencapai halte tujuan.
 * Berguna untuk menampilkan "mini-rute" kepada penumpang.
 * Contoh: bus di FISIP, tujuan FK → returns [FEB, Perpus, FISIP, Teknik, Hukum, Pintu1, FK]
 */
export function getStopsSequenceToDest(
  bus: Pick<BusPosition, 'lat' | 'lng'> & Partial<Pick<BusPosition, 'speedKmh'>>,
  destStop: BusStop,
  stops: BusStop[] = USU_STOPS,
  polyline: [number, number][] = ROUTE_POLYLINE
): BusStop[] {
  if (!stops || stops.length === 0) return [];
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;

  // Sort halte by sequenceOrder
  const ordered = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const n = ordered.length;

  // Find which stop is "next" after the bus
  const upcoming = getUpcomingStop(bus, stops, polyline);
  if (!upcoming) return [];

  const upcomingIdx = ordered.findIndex(s => s.id === upcoming.stop.id);
  if (upcomingIdx === -1) return [];

  const destIdx = ordered.findIndex(s => s.id === destStop.id);
  if (destIdx === -1) return [];

  // Traverse the loop from upcoming → dest
  const result: BusStop[] = [];
  let idx = upcomingIdx;
  for (let i = 0; i < n; i++) {
    result.push(ordered[idx]);
    if (ordered[idx].id === destStop.id) break;
    idx = (idx + 1) % n;
  }
  return result;
}

/**
 * Menemukan halte tujuan berikutnya yang akan dilewati bus di sepanjang rute loop.
 */
export function getUpcomingStop(
  bus: Pick<BusPosition, 'lat' | 'lng'> & Partial<Pick<BusPosition, 'speedKmh'>>,
  stops: BusStop[] = USU_STOPS,
  polyline: [number, number][] = ROUTE_POLYLINE
): {
  stop: BusStop;
  distanceKm: number;
  isAtStop: boolean;
} | null {
  if (!stops || stops.length === 0) return null;
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;

  let stoppedAt: BusStop | null = null;
  for (const s of stops) {
    const d = haversineDistanceKm(bus.lat, bus.lng, s.lat, s.lng);
    if (d <= 0.045 && (bus.speedKmh ?? 0) <= 5) {
      stoppedAt = s;
      break;
    }
  }

  let bestStop: BusStop = stops[0];
  let minForwardDist = Number.POSITIVE_INFINITY;
  const thresholdKm = stoppedAt ? 0.05 : 0.02;

  for (const s of stops) {
    const forwardDist = routeDistanceToStopKm(bus.lat, bus.lng, s, activeLine);
    if (forwardDist > thresholdKm && forwardDist < minForwardDist) {
      minForwardDist = forwardDist;
      bestStop = s;
    }
  }

  return {
    stop: bestStop,
    distanceKm: Number.isFinite(minForwardDist) ? minForwardDist : 0,
    isAtStop: Boolean(stoppedAt),
  };
}
