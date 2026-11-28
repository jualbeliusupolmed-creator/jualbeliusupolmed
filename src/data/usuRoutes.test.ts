import { describe, expect, it } from 'vitest';
import {
  blendSpeed,
  DEFAULT_ETA_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_LINUSKU_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  estimateEtaDetails,
  estimateEtaMinutes,
  getNextDepartureTimes,
  getStopsSequenceToDest,
  getTrafficMultiplier,
  getUpcomingStop,
  haversineDistanceKm,
  interpolateAlongRoute,
  isInsideCampus,
  findNearestStop,
  getLinusOperatingStatus,
  medianHistoricalSpeed,
  mergeLinuskuSettings,
  projectToRoute,
  routeDistanceToStopKm,
  USU_STOPS,
} from './usuRoutes';

describe('USU route utilities', () => {
  it('rejects coordinates outside the configured campus bounds', () => {
    expect(isInsideCampus(3.5625, 98.6562)).toBe(true);
    expect(isInsideCampus(-6.2, 106.8)).toBe(false);
    expect(isInsideCampus(Number.NaN, 98.6562)).toBe(false);
  });

  it('calculates a positive Haversine distance', () => {
    expect(
      haversineDistanceKm(3.5656, 98.6594, 3.5639, 98.6578)
    ).toBeGreaterThan(0);
  });

  it('wraps route interpolation at the route boundary', () => {
    expect(interpolateAlongRoute(-0.1)).toEqual(interpolateAlongRoute(0.9));
  });

  it('projects a location onto the route', () => {
    const projected = projectToRoute(3.5625, 98.6562);
    expect(projected.distanceKm).toBeLessThan(1);
    expect(projected.progress).toBeGreaterThanOrEqual(0);
    expect(projected.progress).toBeLessThanOrEqual(1);
  });

  it('uses traveled distance rather than segment count for route progress and ETA distance', () => {
    const route: [number, number][] = [
      [0, 0],
      [0, 0.01],
      [0.001, 0.01],
    ];
    const stop = { ...USU_STOPS[0], lat: 0, lng: 0.01 };
    const projected = projectToRoute(0, 0.005, route);
    const expectedDistanceKm = haversineDistanceKm(0, 0.005, 0, 0.01);

    expect(projected.progress).toBeCloseTo(0.455, 2);
    expect(
      routeDistanceToStopKm(0, 0.005, stop, route)
    ).toBeCloseTo(expectedDistanceKm, 2);
    expect(interpolateAlongRoute(projected.progress, route).lng).toBeCloseTo(
      0.005,
      4
    );
  });

  it('computes forward route distance along the campus loop', () => {
    const firstStop = USU_STOPS[0];
    const nextStop = USU_STOPS[1];
    const distKm = routeDistanceToStopKm(firstStop.lat, firstStop.lng, nextStop);
    expect(distKm).toBeGreaterThan(0);
    expect(distKm).toBeLessThan(5);
  });

  it('returns a bounded ETA', () => {
    const eta = estimateEtaMinutes(
      { lat: 3.5656, lng: 98.6594, speedKmh: 18 },
      USU_STOPS[9]
    );
    expect(eta).toBeGreaterThanOrEqual(1);
  });

  it('finds the nearest registered stop', () => {
    const result = findNearestStop(3.5656, 98.6594);
    expect(result.stop.id).toBe('halte-pintu-1');
    expect(result.distanceMeters).toBeGreaterThanOrEqual(0);
  });

  it('marks weekdays outside 07.00 to 17.00 as closed', () => {
    const sunday = new Date('2026-11-22T03:00:00.000Z');
    expect(getLinusOperatingStatus(sunday).isOpen).toBe(false);
  });

  it('opens exactly at 07.00 WIB in Asia/Jakarta', () => {
    expect(getLinusOperatingStatus(new Date('2026-11-22T23:59:59.000Z')).isOpen).toBe(false);
    expect(getLinusOperatingStatus(new Date('2026-11-23T00:00:00.000Z')).isOpen).toBe(true);
  });

  it('closes exactly at 17.00 WIB and stays closed on Saturday and Sunday', () => {
    expect(getLinusOperatingStatus(new Date('2026-11-20T09:59:59.000Z')).isOpen).toBe(true);
    expect(getLinusOperatingStatus(new Date('2026-11-20T10:00:00.000Z')).isOpen).toBe(false);
    expect(getLinusOperatingStatus(new Date('2026-11-21T05:00:00.000Z')).isOpen).toBe(false);
  });

  it('ignores admin schedule settings and keeps the fixed USU operating hours', () => {
    expect(
      getLinusOperatingStatus(
        new Date('2026-11-23T00:30:00.000Z'),
        { serviceDays: [1], openingTime: '08:00', closingTime: '09:00', timeZone: 'Asia/Jakarta' }
      ).isOpen
    ).toBe(true);
  });

  it('normalizes migrated snake-case settings into the application shape', () => {
    const settings = mergeLinuskuSettings({
      service: {
        service_days: [1, 6],
        opening_time: '08:15:00',
        closing_time: '16:45:00',
        time_zone: 'Asia/Jakarta',
      },
      eta: {
        min_speed_kmh: 10,
        max_speed_kmh: 55,
        stale_threshold_seconds: 90,
      },
      features: { crowd_reporting_enabled: false },
    });

    expect(settings.service).toEqual({
      serviceDays: [1, 6],
      openingTime: '08:15',
      closingTime: '16:45',
      timeZone: 'Asia/Jakarta',
    });
    expect(settings.eta.maxSpeedKmh).toBe(55);
    expect(settings.features.crowdReportingEnabled).toBe(false);
    expect(settings.features.simulationMode).toBe(false);
  });
});

describe('Linusku settings foundations', () => {
  it('provides schedule, ETA, and feature defaults', () => {
    expect(DEFAULT_SCHEDULE_SETTINGS).toEqual({
      firstDepartureTime: '07:00',
      lastDepartureTime: '17:00',
      headwayMinutes: 15,
      timeZone: 'Asia/Jakarta',
    });
    expect(DEFAULT_LINUSKU_SETTINGS.schedule).toEqual(DEFAULT_SCHEDULE_SETTINGS);
    expect(DEFAULT_ETA_SETTINGS.averageDwellSeconds).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_ETA_SETTINGS.trafficMultiplier).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_ETA_SETTINGS.confidenceThresholdSeconds).toBeGreaterThan(0);
    expect(DEFAULT_FEATURE_FLAGS.pushNotificationsEnabled).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.driverAccessRequestsEnabled).toBe(false);
    expect(DEFAULT_MAP_SETTINGS.tileProvider).toBe('osm');
    expect(DEFAULT_MAP_SETTINGS.fallbackToOsm).toBe(true);
  });

  it('merges schedule and new settings in snake_case and camelCase', () => {
    const settings = mergeLinuskuSettings({
      schedule: {
        first_departure_time: '08:15:00',
        last_departure_time: '16:45:00',
        headway_minutes: 20,
        time_zone: 'Asia/Jakarta',
      },
      eta: {
        averageDwellSeconds: 45,
        traffic_multiplier: 1.2,
        confidence_threshold_seconds: 240,
      },
      features: {
        push_notifications_enabled: true,
        driverAccessRequestsEnabled: true,
      },
    });

    expect(settings.schedule).toEqual({
      firstDepartureTime: '08:15',
      lastDepartureTime: '16:45',
      headwayMinutes: 20,
      timeZone: 'Asia/Jakarta',
    });
    expect(settings.eta.averageDwellSeconds).toBe(45);
    expect(settings.eta.trafficMultiplier).toBe(1.2);
    expect(settings.eta.confidenceThresholdSeconds).toBe(240);
    expect(settings.features.pushNotificationsEnabled).toBe(true);
    expect(settings.features.driverAccessRequestsEnabled).toBe(true);
  });

  it('falls back safely for invalid new settings', () => {
    const settings = mergeLinuskuSettings({
      schedule: {
        firstDepartureTime: '18:00',
        lastDepartureTime: '17:00',
        headwayMinutes: 0,
        timeZone: 'Invalid/Zone',
      },
      eta: {
        averageDwellSeconds: -1,
        trafficMultiplier: 0,
        confidenceThresholdSeconds: -10,
      },
      features: {
        pushNotificationsEnabled: 'yes',
        driverAccessRequestsEnabled: 1,
      },
    });

    expect(settings.schedule).toEqual(DEFAULT_SCHEDULE_SETTINGS);
    expect(settings.eta.averageDwellSeconds).toBe(
      DEFAULT_ETA_SETTINGS.averageDwellSeconds
    );
    expect(settings.eta.trafficMultiplier).toBe(
      DEFAULT_ETA_SETTINGS.trafficMultiplier
    );
    expect(settings.eta.confidenceThresholdSeconds).toBe(
      DEFAULT_ETA_SETTINGS.confidenceThresholdSeconds
    );
    expect(settings.features.pushNotificationsEnabled).toBe(false);
    expect(settings.features.driverAccessRequestsEnabled).toBe(false);
  });
});

describe('historical speed and ETA helpers', () => {
  it('calculates a robust median from historical speeds', () => {
    expect(medianHistoricalSpeed([10, 20, 30])).toBe(20);
    expect(medianHistoricalSpeed([10, 20, 30, 40])).toBe(25);
    expect(medianHistoricalSpeed([0, Number.NaN, 12])).toBe(12);
    expect(medianHistoricalSpeed([])).toBeNull();
  });

  it('blends the current speed with historical speed', () => {
    expect(blendSpeed(40, [10, 30])).toBeCloseTo(34);
    expect(blendSpeed(40, [10, 30], 0.5)).toBeCloseTo(30);
    expect(blendSpeed(0, [10, 30])).toBe(20);
  });

  it('returns detailed ETA values with an absolute arrival time', () => {
    const now = new Date('2026-11-18T06:00:00.000Z');
    const route: [number, number][] = [
      [0, 0],
      [0, 0.01],
    ];
    const stop = { ...USU_STOPS[0], lat: 0, lng: 0.01 };
    const details = estimateEtaDetails(
      {
        lat: 0,
        lng: 0,
        speedKmh: 30,
        updatedAt: now.toISOString(),
      },
      stop,
      {
        now,
        polyline: route,
        etaSettings: {
          minSpeedKmh: 10,
          maxSpeedKmh: 60,
          staleThresholdSeconds: 45,
          averageDwellSeconds: 30,
          trafficMultiplier: 1,
          confidenceThresholdSeconds: 180,
        },
      }
    );

    expect(details.minutes).toBe(3);
    expect(details.absoluteArrival).toBe('2026-11-18T06:03:00.000Z');
    expect(details.distanceKm).toBeGreaterThan(1);
    expect(details.effectiveSpeedKmh).toBe(30);
    expect(details.confidence).toBeGreaterThanOrEqual(0);
    expect(details.confidence).toBeLessThanOrEqual(1);
  });

  it('adds average dwell conservatively and blends historical speed', () => {
    const now = new Date('2026-11-18T06:00:00.000Z');
    const route: [number, number][] = [
      [0, 0],
      [0, 0.01],
    ];
    const stop = { ...USU_STOPS[0], lat: 0, lng: 0.01 };
    const etaSettings = {
      minSpeedKmh: 10,
      maxSpeedKmh: 60,
      staleThresholdSeconds: 45,
      averageDwellSeconds: 120,
      trafficMultiplier: 1,
      confidenceThresholdSeconds: 180,
    };
    const withoutDwell = estimateEtaDetails(
      { lat: 0, lng: 0, speedKmh: 40 },
      stop,
      {
        now,
        polyline: route,
        etaSettings: { ...etaSettings, averageDwellSeconds: 0 },
        historicalSpeedKmh: [10, 20, 30],
      }
    );
    const withDwell = estimateEtaDetails(
      { lat: 0, lng: 0, speedKmh: 40 },
      stop,
      {
        now,
        polyline: route,
        etaSettings,
        historicalSpeedKmh: [10, 20, 30],
      }
    );

    expect(withoutDwell.effectiveSpeedKmh).toBeCloseTo(34);
    expect(withDwell.minutes).toBeGreaterThan(withoutDwell.minutes);
  });

  it('keeps estimateEtaMinutes backward compatible with legacy settings', () => {
    const legacySettings = {
      minSpeedKmh: 12,
      maxSpeedKmh: 80,
      staleThresholdSeconds: 45,
    };
    const eta = estimateEtaMinutes(
      { lat: 3.5656, lng: 98.6594, speedKmh: 18 },
      USU_STOPS[9],
      undefined,
      legacySettings
    );
    expect(eta).toBeGreaterThanOrEqual(1);
  });
});

describe('schedule and traffic helpers', () => {
  const schedule = {
    firstDepartureTime: '08:00',
    lastDepartureTime: '10:00',
    headwayMinutes: 30,
    timeZone: 'Asia/Jakarta',
  };

  it('returns upcoming departures as ISO instants in WIB', () => {
    expect(
      getNextDepartureTimes(
        new Date('2026-11-18T02:00:00.000Z'),
        schedule,
        3
      )
    ).toEqual([
      '2026-11-18T02:00:00.000Z',
      '2026-11-18T02:30:00.000Z',
      '2026-11-18T03:00:00.000Z',
    ]);
  });

  it('uses the first departure before opening and rolls to the next day after closing', () => {
    expect(
      getNextDepartureTimes(
        new Date('2026-11-18T00:30:00.000Z'),
        schedule,
        1
      )
    ).toEqual(['2026-11-18T01:00:00.000Z']);
    expect(
      getNextDepartureTimes(
        new Date('2026-11-18T04:00:00.000Z'),
        schedule,
        1
      )
    ).toEqual(['2026-11-19T01:00:00.000Z']);
  });

  it('accepts a calendar date in the schedule timezone', () => {
    expect(getNextDepartureTimes('2026-11-18', schedule, 1)).toEqual([
      '2026-11-18T01:00:00.000Z',
    ]);
  });

  it('applies a higher traffic multiplier during operational peak hours', () => {
    const peak = getTrafficMultiplier(
      new Date('2026-11-18T00:30:00.000Z'),
      DEFAULT_SCHEDULE_SETTINGS
    );
    const normal = getTrafficMultiplier(
      new Date('2026-11-18T06:00:00.000Z'),
      DEFAULT_SCHEDULE_SETTINGS
    );
    const outside = getTrafficMultiplier(
      new Date('2026-11-18T11:00:00.000Z'),
      DEFAULT_SCHEDULE_SETTINGS
    );

    expect(peak).toBeGreaterThan(normal);
    expect(normal).toBe(1);
    expect(outside).toBe(1);
  });

  it('determines the upcoming stop along the loop route', () => {
    const firstStop = USU_STOPS[0];
    const upcoming = getUpcomingStop(
      { lat: firstStop.lat, lng: firstStop.lng, speedKmh: 15 },
      USU_STOPS
    );
    expect(upcoming).not.toBeNull();
    expect(upcoming?.stop.id).not.toBe(firstStop.id);
    expect(upcoming?.distanceKm).toBeGreaterThan(0);
  });

  it('generates the sequence of stops towards the destination stop', () => {
    const busPos = { lat: USU_STOPS[0].lat, lng: USU_STOPS[0].lng, speedKmh: 20 };
    const dest = USU_STOPS[4];
    const sequence = getStopsSequenceToDest(busPos, dest, USU_STOPS);
    expect(sequence.length).toBeGreaterThan(0);
    expect(sequence[sequence.length - 1].id).toBe(dest.id);
  });
});
