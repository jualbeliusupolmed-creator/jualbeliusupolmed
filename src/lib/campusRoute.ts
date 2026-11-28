import {
  USU_STOPS,
  type BusStop,
} from '@/data/usuRoutes';

const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam
const DEFAULT_OSM_ROUTE_ENCODED = [
  "alwTyndyQM??g@@WkABeB@yCB?j@A`A?hB?d@?`A?|C?BAV?zF?hA?V?vB?`AErGAd@\\?F@B?fDDAPuACoACE?E?]A",
  "A`@Cf@AtAxCDfA@~ABtBD|DJlCDrABp@@fBD|AB?B?D?h@A`@@kA?E?C}ACgBEq@AsACmCE}DKuBE_BCgAAyCE?@?J",
  "CdEA`A?f@?bBAxA?tAAzAArA?NGA?C?I?mD?o@B_F?qA?k@@sD?C@O?mABsABcIRAErGAd@\\?F@B?fDDn@@H?P@lDH",
  "hCFbGH`CB~BBhB@hBBJ?fIF?GAiE?oBM?K?U?C??nA?L?}AB?T?J?L??E?kA?oDOSOY}@@u@@gABC{DA_CmD@@vC@D",
  "??@D@F@\\A]AGAEAEAwCcD@sEB@`@?`@@j@H???I?Ak@?a@Aa@?_@CeB?EH?|A?tA?R?J?FQBEHE??HEBABC@MDWEVA",
  "LCBC@IDIDCDGPK?S?uA?}A?I??YK?M?W?[?k@?E@??CB?TBBF?f@?`A?L??E?YCiDC_BA_A?WkA@_BBaDDmBBE?qA@",
  "AV?f@L?",
].join('');

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

const DEFAULT_OSM_ROUTE_POINTS = decodePolyline(DEFAULT_OSM_ROUTE_ENCODED);

let cachedRoadPolyline: {
  signature: string;
  points: [number, number][];
  source: 'osrm' | 'osm-cache' | 'fallback';
  expiresAt: number;
} | null = null;

/**
 * Mengambil geometri rute jalan aspal sebenarnya di Kampus USU Padang Bulan
 * dari OpenStreetMap (OSRM), di-cache 24 jam di server agar nol beban ke API eksternal.
 */
export async function getCampusRoadPolyline(): Promise<{
  points: [number, number][];
  source: 'osrm' | 'osm-cache' | 'fallback';
}>;
export async function getCampusRoadPolyline(
  stops: BusStop[]
): Promise<{
  points: [number, number][];
  source: 'osrm' | 'osm-cache' | 'fallback';
}>;
export async function getCampusRoadPolyline(
  stops: BusStop[] = USU_STOPS
): Promise<{
  points: [number, number][];
  source: 'osrm' | 'osm-cache' | 'fallback';
}> {
  const now = Date.now();
  const routeStops = stops.length >= 2 ? stops : USU_STOPS;
  const signature = routeStops
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|');

  const matchesDefaultStops =
    routeStops.length === USU_STOPS.length &&
    routeStops.every(
      (stop, index) =>
        stop.lat === USU_STOPS[index].lat &&
        stop.lng === USU_STOPS[index].lng
    );

  if (matchesDefaultStops) {
    return {
      points: DEFAULT_OSM_ROUTE_POINTS,
      source: 'osm-cache',
    };
  }

  if (
    cachedRoadPolyline &&
    cachedRoadPolyline.signature === signature &&
    now < cachedRoadPolyline.expiresAt
  ) {
    return {
      points: cachedRoadPolyline.points,
      source: cachedRoadPolyline.source,
    };
  }

  try {
    const waypoints = [...routeStops, routeStops[0]]
      .map((stop) => `${stop.lng},${stop.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let leafletPoints: [number, number][];

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`OSRM HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        code?: string;
        routes?: Array<{
          geometry?: {
            coordinates?: [number, number][];
          };
        }>;
      };

      const coords = data.routes?.[0]?.geometry?.coordinates;
      if (!coords || coords.length < 10) {
        throw new Error('OSRM geometry empty');
      }

      // OSRM mengembalikan [lng, lat], Leaflet memakai [lat, lng]
      leafletPoints = coords.map(([lng, lat]) => [lat, lng]);
    } finally {
      clearTimeout(timeout);
    }

    cachedRoadPolyline = {
      signature,
      points: leafletPoints,
      source: 'osrm',
      expiresAt: now + ROUTE_CACHE_TTL_MS,
    };

    return { points: leafletPoints, source: 'osrm' };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : error instanceof Error && error.message.startsWith('OSRM HTTP ')
          ? error.message
          : 'network-or-invalid-geometry';
    console.warn('LINUSKU road route lookup failed; using stop fallback.', {
      reason,
    });

    const fallbackPoints: [number, number][] = [
      ...routeStops.map((stop): [number, number] => [stop.lat, stop.lng]),
      [routeStops[0].lat, routeStops[0].lng],
    ];
    cachedRoadPolyline = {
      signature,
      points: fallbackPoints,
      source: 'fallback',
      expiresAt: now + 60 * 1000, // coba ulang 1 menit lagi jika gagal
    };
    return { points: fallbackPoints, source: 'fallback' };
  }
}
