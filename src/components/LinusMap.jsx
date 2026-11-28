"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_ETA_SETTINGS,
  ROUTE_POLYLINE,
  USU_CENTER,
  USU_MAP_BOUNDS,
  USU_STOPS,
  estimateEtaMinutes,
  getUpcomingStop,
} from "@/lib/linusku/usuRoutes";
import {
  createBusMarkerElement,
  createBusPopupElement,
  createMapTooltip,
} from "@/lib/linusku/mapDom";

const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

const CITY_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
  (CARTO_API_KEY
    ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png");

const CITY_DARK_TILE_URL = CARTO_API_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";

const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const SATELLITE_LABELS_URL = CARTO_API_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png";

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const [[SOUTH, WEST], [NORTH, EAST]] = USU_MAP_BOUNDS;
const OUTSIDE_CAMPUS_MASK = [
  [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ],
  [
    [SOUTH, WEST],
    [NORTH, WEST],
    [NORTH, EAST],
    [SOUTH, EAST],
  ],
];

const occupancyLabel = { low: "Lega", medium: "Sedang", full: "Penuh" };
const occupancyColor = { low: "#10b981", medium: "#f59e0b", full: "#ef4444" };

export default function LinusMap({
  buses = [],
  stops = USU_STOPS,
  routePolyline = ROUTE_POLYLINE,
  selectedStopId = null,
  onSelectStop,
  onLocateMe,
  isLocating = false,
  currentLocation = null,
  etaSettings = DEFAULT_ETA_SETTINGS,
  heightClass = "h-[360px] lg:h-[460px]",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({
    tile: null,
    labels: null,
    route: null,
    stops: null,
    buses: null,
    user: null,
  });
  const [mapMode, setMapMode] = useState("city"); // "city" | "satellite"
  const [isDark, setIsDark] = useState(false);

  // Watch dark mode class on <html>
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Initialize Leaflet map once on client
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: USU_CENTER,
        zoom: 16,
        minZoom: 15,
        maxZoom: 19,
        maxBounds: USU_MAP_BOUNDS,
        maxBoundsViscosity: 0.85,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Soft mask outside USU campus
      L.polygon(OUTSIDE_CAMPUS_MASK, {
        stroke: false,
        fillColor: "#0a1710",
        fillOpacity: 0.14,
        interactive: false,
      }).addTo(map);

      layersRef.current.route = L.layerGroup().addTo(map);
      layersRef.current.stops = L.layerGroup().addTo(map);
      layersRef.current.buses = L.layerGroup().addTo(map);
      layersRef.current.user = L.layerGroup().addTo(map);

      mapRef.current = map;
      // Trigger tile/layer sync
      setMapMode((m) => m);
    }

    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update CARTO / Satellite tile layers
  useEffect(() => {
    let active = true;
    async function syncTiles() {
      const map = mapRef.current;
      if (!map) return;
      const L = (await import("leaflet")).default;
      if (!active) return;

      if (layersRef.current.tile) {
        map.removeLayer(layersRef.current.tile);
        layersRef.current.tile = null;
      }
      if (layersRef.current.labels) {
        map.removeLayer(layersRef.current.labels);
        layersRef.current.labels = null;
      }

      if (mapMode === "satellite") {
        layersRef.current.tile = L.tileLayer(SATELLITE_TILE_URL, {
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 19,
        }).addTo(map);
        layersRef.current.labels = L.tileLayer(SATELLITE_LABELS_URL, {
          attribution: CARTO_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);
      } else {
        layersRef.current.tile = L.tileLayer(isDark ? CITY_DARK_TILE_URL : CITY_TILE_URL, {
          attribution: CARTO_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);
      }
    }
    syncTiles();
    return () => {
      active = false;
    };
  }, [mapMode, isDark]);

  // Update route polyline
  useEffect(() => {
    let active = true;
    async function syncRoute() {
      const map = mapRef.current;
      const group = layersRef.current.route;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      if (!active) return;

      group.clearLayers();
      const line = routePolyline.length >= 2 ? routePolyline : ROUTE_POLYLINE;

      L.polyline(line, {
        color: "#003622",
        weight: 7,
        opacity: 0.25,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(group);

      L.polyline(line, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(group);
    }
    syncRoute();
    return () => {
      active = false;
    };
  }, [routePolyline]);

  // Update stops markers
  useEffect(() => {
    let active = true;
    async function syncStops() {
      const map = mapRef.current;
      const group = layersRef.current.stops;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      if (!active) return;

      group.clearLayers();
      const activeStops = stops.length > 0 ? stops : USU_STOPS;

      for (const stop of activeStops) {
        const isSelected = stop.id === selectedStopId;
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: isSelected ? 9 : 6,
          color: isSelected ? "#ceeb7a" : "#003622",
          weight: isSelected ? 3 : 2.5,
          fillColor: isSelected ? "#003622" : "#ffffff",
          fillOpacity: 1,
        }).addTo(group);

        marker.bindTooltip(createMapTooltip(stop.name), {
          direction: "top",
          offset: [0, -6],
          className: "linus-stop-tooltip",
        });

        marker.on("click", () => {
          onSelectStop?.(stop);
          map.panTo([stop.lat, stop.lng], { animate: true });
        });
      }
    }
    syncStops();
    return () => {
      active = false;
    };
  }, [stops, selectedStopId, onSelectStop]);

  // Update bus markers
  useEffect(() => {
    let active = true;
    async function syncBuses() {
      const map = mapRef.current;
      const group = layersRef.current.buses;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      if (!active) return;

      group.clearLayers();
      const activeStops = stops.length > 0 ? stops : USU_STOPS;
      const activeLine = routePolyline.length >= 2 ? routePolyline : ROUTE_POLYLINE;

      for (const bus of buses) {
        const badgeColor = occupancyColor[bus.occupancy] || "#10b981";
        const icon = L.divIcon({
          className: "linus-bus-marker",
          html: createBusMarkerElement(bus, badgeColor),
          iconSize: [70, 66],
          iconAnchor: [35, 48],
        });

        const upcoming = getUpcomingStop(bus, activeStops, activeLine);
        const eta = upcoming ? estimateEtaMinutes(bus, upcoming.stop, activeLine, etaSettings) : null;
        const occText = occupancyLabel[bus.occupancy] || "Sedang";

        const marker = L.marker([bus.lat, bus.lng], { icon }).addTo(group);
        marker.bindPopup(createBusPopupElement(bus, occText, upcoming, eta));
      }
    }
    syncBuses();
    return () => {
      active = false;
    };
  }, [buses, stops, routePolyline, etaSettings]);

  // Update user location marker
  useEffect(() => {
    let active = true;
    async function syncUser() {
      const map = mapRef.current;
      const group = layersRef.current.user;
      if (!map || !group) return;
      const L = (await import("leaflet")).default;
      if (!active) return;

      group.clearLayers();
      if (currentLocation) {
        L.circleMarker([currentLocation.lat, currentLocation.lng], {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2563eb",
          fillOpacity: 1,
        })
          .bindTooltip("Lokasi Kamu", { direction: "top" })
          .addTo(group);
        map.panTo([currentLocation.lat, currentLocation.lng], { animate: true });
      }
    }
    syncUser();
    return () => {
      active = false;
    };
  }, [currentLocation]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[#134e35]/15 bg-[#eef6f0] ${heightClass}`}>
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Top-Left Map Mode Switcher (CARTO Voyager / Satelit) */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1 rounded-full bg-white/95 dark:bg-[#112218]/95 p-1 shadow-md border border-[#e2f0e6] dark:border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMapMode("city")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
            mapMode === "city"
              ? "bg-[#003622] text-[#ceeb7a]"
              : "text-[#404943] dark:text-[#9db8a2] hover:text-[#003622]"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">map</span>
          <span>CARTO</span>
        </button>
        <button
          type="button"
          onClick={() => setMapMode("satellite")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
            mapMode === "satellite"
              ? "bg-[#003622] text-[#ceeb7a]"
              : "text-[#404943] dark:text-[#9db8a2] hover:text-[#003622]"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
          <span>Satelit</span>
        </button>
      </div>

      {/* Bottom-Left Locate Me Button */}
      {onLocateMe && (
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          className="absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 rounded-full bg-[#003622] hover:bg-[#134e35] text-white px-3.5 py-2 text-[11px] font-bold shadow-md transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[15px] text-[#ceeb7a]">
            {isLocating ? "progress_activity" : "my_location"}
          </span>
          <span>{isLocating ? "Mencari..." : "Halte Terdekat"}</span>
        </button>
      )}
    </div>
  );
}
