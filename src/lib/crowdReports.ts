import type { BusPosition, OccupancyLevel } from '@/data/usuRoutes';

export interface CrowdReport {
  busId: string;
  lat: number;
  lng: number;
  occupancy: OccupancyLevel;
  updatedAt: string;
}

const reports = new Map<string, CrowdReport>();

export function saveCrowdReport(report: CrowdReport) {
  reports.set(report.busId, report);
}

export function getCrowdPositions(maxAgeMs = 45000): BusPosition[] {
  const now = Date.now();
  return Array.from(reports.values())
    .filter((report) => now - new Date(report.updatedAt).getTime() <= maxAgeMs)
    .map((report) => ({
      busId: report.busId,
      name: `${report.busId} - Rute Kampus`,
      lat: report.lat,
      lng: report.lng,
      speedKmh: 18,
      heading: 0,
      occupancy: report.occupancy,
      sourceType: 'crowd',
      updatedAt: report.updatedAt,
    }));
}
