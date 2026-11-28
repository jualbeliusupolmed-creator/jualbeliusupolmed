export const DEFAULT_OPERATING_SETTINGS = {
  serviceDays: [1, 2, 3, 4, 5],
  openingTime: "07:00",
  closingTime: "17:00",
  timeZone: "Asia/Jakarta",
};

export const DEFAULT_SCHEDULE_SETTINGS = {
  firstDepartureTime: "07:00",
  lastDepartureTime: "17:00",
  headwayMinutes: 15,
  timeZone: "Asia/Jakarta",
};

export const DEFAULT_ETA_SETTINGS = {
  minSpeedKmh: 12,
  maxSpeedKmh: 80,
  staleThresholdSeconds: 45,
  averageDwellSeconds: 30,
  trafficMultiplier: 1,
  confidenceThresholdSeconds: 180,
};

export const DEFAULT_MAP_SETTINGS = {
  tileProvider: "carto_voyager",
  fallbackToOsm: true,
};

export const DEFAULT_FEATURE_FLAGS = {
  crowdReportingEnabled: true,
  simulationMode: false,
  maintenanceMode: false,
  pushNotificationsEnabled: false,
  driverAccessRequestsEnabled: false,
};

export const DEFAULT_GEOFENCE_SETTINGS = {
  campusBounds: {
    minLat: 3.55,
    maxLat: 3.575,
    minLng: 98.648,
    maxLng: 98.665,
  },
  maxDistanceFromRouteKm: 0.3,
};

export const DEFAULT_LINUSKU_SETTINGS = {
  service: DEFAULT_OPERATING_SETTINGS,
  schedule: DEFAULT_SCHEDULE_SETTINGS,
  eta: DEFAULT_ETA_SETTINGS,
  map: DEFAULT_MAP_SETTINGS,
  features: DEFAULT_FEATURE_FLAGS,
  geofence: DEFAULT_GEOFENCE_SETTINGS,
};

export const USU_STOPS = [
  {
    id: "halte-pintu-1",
    name: "Halte Pintu 1 / Gelanggang",
    area: "Jl. Universitas (Pintu 1)",
    lat: 3.5656,
    lng: 98.6594,
    sequenceOrder: 1,
  },
  {
    id: "halte-fk",
    name: "Halte FK / RS USU",
    area: "Jl. Dr. T. Mansyur",
    lat: 3.5673,
    lng: 98.6552,
    sequenceOrder: 2,
  },
  {
    id: "halte-biro",
    name: "Halte Biro Rektor / Pancasila",
    area: "Jl. Dr. T. Mansyur",
    lat: 3.5668,
    lng: 98.6528,
    sequenceOrder: 3,
  },
  {
    id: "halte-vokasi",
    name: "Halte Fakultas Vokasi / Pintu 4",
    area: "Jl. Tri Dharma",
    lat: 3.5618,
    lng: 98.6519,
    sequenceOrder: 4,
  },
  {
    id: "halte-fmipa",
    name: "Halte FMIPA & Fasilkom-TI",
    area: "Jl. Bioteknologi",
    lat: 3.5592,
    lng: 98.6542,
    sequenceOrder: 5,
  },
  {
    id: "halte-feb",
    name: "Halte FEB USU",
    area: "Jl. Prof. T.M. Hanafiah",
    lat: 3.5598,
    lng: 98.6562,
    sequenceOrder: 6,
  },
  {
    id: "halte-perpus",
    name: "Halte Perpustakaan USU",
    area: "Jl. Perpustakaan",
    lat: 3.5612,
    lng: 98.6568,
    sequenceOrder: 7,
  },
  {
    id: "halte-fisip",
    name: "Halte FISIP & FIB",
    area: "Jl. Sivitas Akademika",
    lat: 3.5625,
    lng: 98.6572,
    sequenceOrder: 8,
  },
  {
    id: "halte-teknik",
    name: "Halte Fakultas Teknik",
    area: "Jl. Almamater",
    lat: 3.5618,
    lng: 98.6586,
    sequenceOrder: 9,
  },
  {
    id: "halte-hukum",
    name: "Halte Fakultas Hukum",
    area: "Jl. Universitas",
    lat: 3.5639,
    lng: 98.659,
    sequenceOrder: 10,
  },
];

export const ROUTE_POLYLINE = [
  ...USU_STOPS.map((stop) => [stop.lat, stop.lng]),
  [USU_STOPS[0].lat, USU_STOPS[0].lng],
];

export const USU_CENTER = [3.563, 98.6556];

export const USU_MAP_BOUNDS = [
  [3.5572, 98.6472],
  [3.5695, 98.6612],
];

function settingsRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function settingValue(value, camelCaseKey, snakeCaseKey) {
  return value[camelCaseKey] ?? value[snakeCaseKey];
}

export function mergeLinuskuSettings(values = {}) {
  const service = settingsRecord(values.service);
  const schedule = settingsRecord(values.schedule);
  const eta = settingsRecord(values.eta);
  const map = settingsRecord(values.map);
  const features = settingsRecord(values.features);
  const geofence = settingsRecord(values.geofence);
  const campusBounds = settingsRecord(geofence.campusBounds ?? geofence.campus_bounds);

  return {
    service: {
      serviceDays:
        settingValue(service, "serviceDays", "service_days") ??
        DEFAULT_OPERATING_SETTINGS.serviceDays,
      openingTime:
        String(
          settingValue(service, "openingTime", "opening_time") ??
            DEFAULT_OPERATING_SETTINGS.openingTime
        ).slice(0, 5),
      closingTime:
        String(
          settingValue(service, "closingTime", "closing_time") ??
            DEFAULT_OPERATING_SETTINGS.closingTime
        ).slice(0, 5),
      timeZone:
        settingValue(service, "timeZone", "time_zone") ??
        DEFAULT_OPERATING_SETTINGS.timeZone,
    },
    schedule: {
      firstDepartureTime:
        String(
          settingValue(schedule, "firstDepartureTime", "first_departure_time") ??
            DEFAULT_SCHEDULE_SETTINGS.firstDepartureTime
        ).slice(0, 5),
      lastDepartureTime:
        String(
          settingValue(schedule, "lastDepartureTime", "last_departure_time") ??
            DEFAULT_SCHEDULE_SETTINGS.lastDepartureTime
        ).slice(0, 5),
      headwayMinutes:
        settingValue(schedule, "headwayMinutes", "headway_minutes") ??
        DEFAULT_SCHEDULE_SETTINGS.headwayMinutes,
      timeZone:
        settingValue(schedule, "timeZone", "time_zone") ??
        DEFAULT_SCHEDULE_SETTINGS.timeZone,
    },
    eta: {
      minSpeedKmh:
        settingValue(eta, "minSpeedKmh", "min_speed_kmh") ??
        DEFAULT_ETA_SETTINGS.minSpeedKmh,
      maxSpeedKmh:
        settingValue(eta, "maxSpeedKmh", "max_speed_kmh") ??
        DEFAULT_ETA_SETTINGS.maxSpeedKmh,
      staleThresholdSeconds:
        settingValue(eta, "staleThresholdSeconds", "stale_threshold_seconds") ??
        DEFAULT_ETA_SETTINGS.staleThresholdSeconds,
      averageDwellSeconds:
        settingValue(eta, "averageDwellSeconds", "average_dwell_seconds") ??
        DEFAULT_ETA_SETTINGS.averageDwellSeconds,
      trafficMultiplier:
        settingValue(eta, "trafficMultiplier", "traffic_multiplier") ??
        DEFAULT_ETA_SETTINGS.trafficMultiplier,
      confidenceThresholdSeconds:
        settingValue(eta, "confidenceThresholdSeconds", "confidence_threshold_seconds") ??
        DEFAULT_ETA_SETTINGS.confidenceThresholdSeconds,
    },
    map: {
      tileProvider:
        settingValue(map, "tileProvider", "tile_provider") ??
        DEFAULT_MAP_SETTINGS.tileProvider,
      fallbackToOsm:
        settingValue(map, "fallbackToOsm", "fallback_to_osm") ??
        DEFAULT_MAP_SETTINGS.fallbackToOsm,
    },
    features: {
      crowdReportingEnabled:
        settingValue(features, "crowdReportingEnabled", "crowd_reporting_enabled") ??
        DEFAULT_FEATURE_FLAGS.crowdReportingEnabled,
      simulationMode:
        settingValue(features, "simulationMode", "simulation_mode") ??
        DEFAULT_FEATURE_FLAGS.simulationMode,
      maintenanceMode:
        settingValue(features, "maintenanceMode", "maintenance_mode") ??
        DEFAULT_FEATURE_FLAGS.maintenanceMode,
      pushNotificationsEnabled:
        settingValue(features, "pushNotificationsEnabled", "push_notifications_enabled") ??
        DEFAULT_FEATURE_FLAGS.pushNotificationsEnabled,
      driverAccessRequestsEnabled:
        settingValue(features, "driverAccessRequestsEnabled", "driver_access_requests_enabled") ??
        DEFAULT_FEATURE_FLAGS.driverAccessRequestsEnabled,
    },
    geofence: {
      campusBounds: {
        minLat: campusBounds.minLat ?? campusBounds.min_lat ?? DEFAULT_GEOFENCE_SETTINGS.campusBounds.minLat,
        maxLat: campusBounds.maxLat ?? campusBounds.max_lat ?? DEFAULT_GEOFENCE_SETTINGS.campusBounds.maxLat,
        minLng: campusBounds.minLng ?? campusBounds.min_lng ?? DEFAULT_GEOFENCE_SETTINGS.campusBounds.minLng,
        maxLng: campusBounds.maxLng ?? campusBounds.max_lng ?? DEFAULT_GEOFENCE_SETTINGS.campusBounds.maxLng,
      },
      maxDistanceFromRouteKm:
        settingValue(geofence, "maxDistanceFromRouteKm", "max_distance_from_route_km") ??
        DEFAULT_GEOFENCE_SETTINGS.maxDistanceFromRouteKm,
    },
  };
}

export function isInsideCampus(lat, lng, bounds = DEFAULT_GEOFENCE_SETTINGS.campusBounds) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

export function isInsideCampusWithSettings(lat, lng, settings = DEFAULT_LINUSKU_SETTINGS) {
  return isInsideCampus(lat, lng, settings?.geofence?.campusBounds || DEFAULT_GEOFENCE_SETTINGS.campusBounds);
}

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
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

export function findNearestStop(lat, lng, stops = USU_STOPS) {
  const availableStops = stops.length > 0 ? stops : USU_STOPS;
  return availableStops
    .map((stop) => {
      const straightDistanceKm = haversineDistanceKm(lat, lng, stop.lat, stop.lng);
      return {
        stop,
        distanceKm: straightDistanceKm,
        distanceMeters: Math.round(straightDistanceKm * 1250),
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
}

function getRouteMetrics(polyline) {
  const segmentLengthsKm = polyline.slice(1).map((point, index) => {
    const previous = polyline[index];
    return haversineDistanceKm(previous[0], previous[1], point[0], point[1]);
  });

  return {
    segmentLengthsKm,
    totalRouteKm: segmentLengthsKm.reduce((total, length) => total + length, 0),
  };
}

export function projectToRoute(lat, lng, polyline = ROUTE_POLYLINE) {
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
        : Math.max(0, Math.min(1, ((lng - lng1) * dx + (lat - lat1) * dy) / lengthSquared));
    const projectedLat = lat1 + dy * t;
    const projectedLng = lng1 + dx * t;
    const distanceKm = haversineDistanceKm(lat, lng, projectedLat, projectedLng);
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

export function routeDistanceToStopKm(lat, lng, stop, polyline = ROUTE_POLYLINE) {
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;
  const bus = projectToRoute(lat, lng, activeLine);
  const stopPoint = projectToRoute(stop.lat, stop.lng, activeLine);
  let progressDelta = stopPoint.progress - bus.progress;
  if (progressDelta < 0) progressDelta += 1;
  const { totalRouteKm } = getRouteMetrics(activeLine);
  return Math.max(0, totalRouteKm * progressDelta);
}

export function estimateEtaMinutes(
  bus,
  stop,
  polyline = ROUTE_POLYLINE,
  etaSettings = DEFAULT_ETA_SETTINGS
) {
  const roadDistanceKm = routeDistanceToStopKm(bus.lat, bus.lng, stop, polyline);
  const effectiveSpeed = Math.min(
    Math.max(bus.speedKmh || etaSettings.minSpeedKmh, etaSettings.minSpeedKmh),
    etaSettings.maxSpeedKmh
  );
  const minutes = Math.round((roadDistanceKm / effectiveSpeed) * 60);
  return Math.max(minutes, 1);
}

export function interpolateAlongRoute(progress, polyline = ROUTE_POLYLINE) {
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
    if (targetDistanceKm <= distanceAlongRouteKm + segmentLengthKm || i === totalSegments - 1) {
      index = i;
      t = segmentLengthKm > 0 ? (targetDistanceKm - distanceAlongRouteKm) / segmentLengthKm : 0;
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

export function getUpcomingStop(bus, stops = USU_STOPS, polyline = ROUTE_POLYLINE) {
  if (!stops || stops.length === 0) return null;
  const activeLine = polyline.length >= 2 ? polyline : ROUTE_POLYLINE;

  let stoppedAt = null;
  for (const s of stops) {
    const d = haversineDistanceKm(bus.lat, bus.lng, s.lat, s.lng);
    if (d <= 0.045 && (bus.speedKmh ?? 0) <= 5) {
      stoppedAt = s;
      break;
    }
  }

  let bestStop = stops[0];
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

export function getLinusOperatingStatus(now = new Date(), settings = DEFAULT_OPERATING_SETTINGS) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings?.timeZone || "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const totalMinutes = hour * 60 + minute;
  const weekdayNumber = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  const [openH = 7, openM = 0] = String(settings?.openingTime || "07:00").split(":").map(Number);
  const [closeH = 17, closeM = 0] = String(settings?.closingTime || "17:00").split(":").map(Number);
  const openingMinutes = openH * 60 + openM;
  const closingMinutes = closeH * 60 + closeM;
  const serviceDays = Array.isArray(settings?.serviceDays) ? settings.serviceDays : [1, 2, 3, 4, 5];

  const isOpen =
    serviceDays.includes(weekdayNumber[weekday]) &&
    totalMinutes >= openingMinutes &&
    totalMinutes < closingMinutes;

  return {
    isOpen,
    label: isOpen ? "Sedang Beroperasi" : "Di Luar Jam Operasional",
    detail: `Senin–Jumat ${String(settings?.openingTime || "07:00")}–${String(settings?.closingTime || "17:00")} WIB`,
  };
}
