import { describe, expect, it } from 'vitest';
import { haversineDistanceKm, USU_STOPS } from '@/data/usuRoutes';
import { getCampusRoadPolyline } from './campusRoute';

describe('campus road route', () => {
  it('uses the detailed OSM geometry for the default USU stop loop', async () => {
    const route = await getCampusRoadPolyline();

    expect(route.source).toBe('osm-cache');
    expect(route.points.length).toBeGreaterThan(100);
    expect(
      haversineDistanceKm(
        route.points[0][0],
        route.points[0][1],
        USU_STOPS[0].lat,
        USU_STOPS[0].lng
      )
    ).toBeLessThan(0.1);
    expect(route.points.at(-1)).toEqual(route.points[0]);
  });
});
