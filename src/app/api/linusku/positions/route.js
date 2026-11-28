import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  DEFAULT_LINUSKU_SETTINGS,
  interpolateAlongRoute,
  isInsideCampusWithSettings,
  mergeLinuskuSettings,
} from "@/lib/linusku/usuRoutes";
import { getCampusRoadPolyline } from "@/lib/linusku/campusRoute";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 3000;
let memoryCache = null;
let inflightRequest = null;

const SIMULATED_FLEET = [
  { busId: "LINUS-01", name: "Linus 01 — Rute Kampus", offset: 0.05, speedKmh: 20, occupancy: "medium" },
  { busId: "LINUS-02", name: "Linus 02 — Rute Kampus", offset: 0.42, speedKmh: 18, occupancy: "low" },
  { busId: "LINUS-03", name: "Linus 03 — Rute Kampus", offset: 0.74, speedKmh: 22, occupancy: "full" },
];

function buildSimulatedBuses(nowMs, roadPolyline) {
  const cycleProgress = (nowMs % 720000) / 720000;
  const isoNow = new Date(nowMs).toISOString();

  return SIMULATED_FLEET.map((item) => {
    const pos = interpolateAlongRoute(item.offset + cycleProgress, roadPolyline);
    return {
      busId: item.busId,
      name: item.name,
      lat: pos.lat,
      lng: pos.lng,
      speedKmh: item.speedKmh,
      heading: pos.heading,
      occupancy: item.occupancy,
      sourceType: "simulator",
      updatedAt: isoNow,
    };
  });
}

async function fetchFreshPositions() {
  const nowMs = Date.now();
  let supabase;
  try {
    supabase = getAdminClient();
  } catch {
    supabase = null;
  }

  if (!supabase) {
    return {
      buses: [],
      mode: "offline",
      cachedAt: new Date(nowMs).toISOString(),
    };
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from("linusku_settings_v2")
    .select("key, value")
    .in("key", ["eta", "features", "geofence"]);

  const settings =
    !settingsError && settingsRows?.length
      ? mergeLinuskuSettings(Object.fromEntries(settingsRows.map((row) => [row.key, row.value])))
      : DEFAULT_LINUSKU_SETTINGS;

  if (settings.features.simulationMode) {
    const { points } = await getCampusRoadPolyline();
    return {
      buses: buildSimulatedBuses(nowMs, points),
      mode: "simulation",
      cachedAt: new Date(nowMs).toISOString(),
    };
  }

  const cutoffIso = new Date(nowMs - settings.eta.staleThresholdSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("bus_positions")
    .select("bus_id, lat, lng, speed_kmh, heading, occupancy, source_type, updated_at")
    .eq("bus_is_active", true)
    .gte("updated_at", cutoffIso)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("LINUSKU bus positions query failed.");
  }

  const officialBuses = (data || [])
    .filter((row) => row.source_type === "driver" && isInsideCampusWithSettings(row.lat, row.lng, settings))
    .map((row) => ({
      busId: row.bus_id,
      name: `${row.bus_id} — Rute Kampus`,
      lat: row.lat,
      lng: row.lng,
      speedKmh: row.speed_kmh,
      heading: row.heading,
      occupancy: row.occupancy,
      sourceType: row.source_type,
      updatedAt: row.updated_at,
    }));

  let crowdPositions = [];
  if (settings.features.crowdReportingEnabled) {
    const { data: crowdData } = await supabase
      .from("crowd_reports")
      .select("bus_id, lat, lng, occupancy, created_at")
      .gte("created_at", cutoffIso)
      .not("bus_id", "is", null)
      .order("created_at", { ascending: false });

    const seen = new Set();
    for (const row of crowdData || []) {
      if (!row.bus_id || seen.has(row.bus_id) || !isInsideCampusWithSettings(row.lat, row.lng, settings)) {
        continue;
      }
      seen.add(row.bus_id);
      crowdPositions.push({
        busId: row.bus_id,
        name: `${row.bus_id} — Rute Kampus`,
        lat: row.lat,
        lng: row.lng,
        speedKmh: 18,
        heading: 0,
        occupancy: row.occupancy,
        sourceType: "crowd",
        updatedAt: row.created_at,
      });
    }
  }

  const mergedBuses = [...officialBuses];
  for (const crowd of crowdPositions) {
    if (!mergedBuses.some((bus) => bus.busId === crowd.busId)) {
      mergedBuses.push(crowd);
    }
  }

  return {
    buses: mergedBuses,
    mode: officialBuses.length > 0 ? "live" : mergedBuses.length > 0 ? "community" : "offline",
    cachedAt: new Date(nowMs).toISOString(),
  };
}

export async function GET() {
  const now = Date.now();
  if (memoryCache && now < memoryCache.expiresAt) {
    return NextResponse.json(memoryCache.data, {
      headers: { "Cache-Control": "no-store", "X-Linus-Cache": "HIT" },
    });
  }

  try {
    if (!inflightRequest) {
      inflightRequest = fetchFreshPositions().finally(() => {
        inflightRequest = null;
      });
    }

    const freshData = await inflightRequest;
    memoryCache = { data: freshData, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(freshData, {
      headers: { "Cache-Control": "no-store", "X-Linus-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[linusku/positions]", err?.message || err);
    return NextResponse.json({ error: "Posisi bus belum dapat dimuat.", buses: [], mode: "offline" }, { status: 503 });
  }
}
