"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DEFAULT_LINUSKU_SETTINGS,
  ROUTE_POLYLINE,
  USU_STOPS,
  estimateEtaMinutes,
  findNearestStop,
  getLinusOperatingStatus,
  getUpcomingStop,
} from "@/lib/linusku/usuRoutes";

const LinusMap = dynamic(() => import("@/components/LinusMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] lg:h-[460px] w-full rounded-2xl bg-[#eef6f0] dark:bg-[#183022] animate-pulse flex items-center justify-center text-xs font-bold text-[#134e35] dark:text-[#ceeb7a]">
      Memuat Peta CARTO LINUSKU...
    </div>
  ),
});

const ROUTES_LIST = [
  {
    code: "Rute Lingkar USU",
    title: "Lingkar Kampus Padang Bulan (10 Halte)",
    stops: "Pintu 1 – FK / RS USU – Biro Rektor – Vokasi – FMIPA – FEB – Perpustakaan – FISIP – Teknik – Hukum",
    interval: "Setiap 10–15 menit",
  },
];

const MODE_LABEL = {
  live: { text: "GPS Driver Aktif", badge: "bg-[#ceeb7a] text-[#003622]" },
  community: { text: "Laporan Komunitas", badge: "bg-sky-100 text-sky-800" },
  simulation: { text: "Mode Simulasi Rute", badge: "bg-amber-100 text-amber-800" },
  offline: { text: "Armada Offline", badge: "bg-slate-200 text-slate-700" },
};

export default function LinuskuFrame() {
  const [activeTab, setActiveTab] = useState("peta"); // peta | rute | halte | info
  const [stops, setStops] = useState(USU_STOPS);
  const [routePolyline, setRoutePolyline] = useState(ROUTE_POLYLINE);
  const [buses, setBuses] = useState([]);
  const [feedMode, setFeedMode] = useState("simulation");
  const [settings, setSettings] = useState(DEFAULT_LINUSKU_SETTINGS);
  const [selectedStopId, setSelectedStopId] = useState(USU_STOPS[0]?.id || null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Load initial stops, OSRM road route, and settings
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/linusku/stops").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/linusku/route").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/linusku/settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([stopsData, routeData, settingsData]) => {
      if (!active) return;
      if (Array.isArray(stopsData?.stops) && stopsData.stops.length > 0) {
        setStops(stopsData.stops);
        setSelectedStopId((prev) => prev || stopsData.stops[0].id);
      }
      if (Array.isArray(routeData?.points) && routeData.points.length >= 2) {
        setRoutePolyline(routeData.points);
      }
      if (settingsData?.settings) {
        setSettings(settingsData.settings);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Poll live bus positions every 5 seconds
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/linusku/positions", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.buses)) setBuses(data.buses);
      if (data?.mode) setFeedMode(data.mode);
    } catch {
      // Keep last known positions
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const handleLocateMe = useCallback(() => {
    if (!navigator?.geolocation) {
      toast.error("Browser tidak mendukung deteksi lokasi GPS.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(loc);
        const nearest = findNearestStop(loc.lat, loc.lng, stops);
        if (nearest?.stop) {
          setSelectedStopId(nearest.stop.id);
          toast.success(`Halte terdekat: ${nearest.stop.name} (± ${nearest.distanceMeters} m)`);
        }
        setIsLocating(false);
      },
      () => {
        toast.error("Izin lokasi ditolak atau GPS tidak tersedia.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [stops]);

  const operatingStatus = useMemo(
    () => getLinusOperatingStatus(new Date(), settings.service),
    [settings.service]
  );

  // Enrich stops with nearest incoming bus ETA & distance from user
  const enrichedStops = useMemo(() => {
    return stops.map((stop) => {
      let bestEta = null;
      let bestBus = null;
      for (const bus of buses) {
        const eta = estimateEtaMinutes(bus, stop, routePolyline, settings.eta);
        if (bestEta === null || eta < bestEta) {
          bestEta = eta;
          bestBus = bus.busId;
        }
      }
      const userDist = currentLocation
        ? findNearestStop(currentLocation.lat, currentLocation.lng, [stop])?.distanceMeters
        : null;
      return {
        ...stop,
        etaText: bestEta !== null ? `± ${bestEta} mnt` : "Menunggu",
        busText: bestBus ? `${bestBus} tiba` : "Jadwal reguler",
        distText: userDist !== null ? `${userDist}m` : `#${stop.sequenceOrder}`,
      };
    });
  }, [stops, buses, routePolyline, settings.eta, currentLocation]);

  // Enrich buses with upcoming stop + ETA
  const enrichedBuses = useMemo(() => {
    return buses.map((bus) => {
      const upcoming = getUpcomingStop(bus, stops, routePolyline);
      const eta = upcoming
        ? estimateEtaMinutes(bus, upcoming.stop, routePolyline, settings.eta)
        : null;
      return {
        ...bus,
        upcomingName: upcoming?.stop?.name || "Rute Kampus",
        etaText: eta ? `± ${eta} mnt` : "-",
      };
    });
  }, [buses, stops, routePolyline, settings.eta]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "LINUSKU — Peta Bus Kampus USU", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Tautan LINUSKU disalin");
      }
    } catch {}
  };

  const modeBadge = MODE_LABEL[feedMode] || MODE_LABEL.simulation;

  return (
    <div className="min-h-screen bg-[#f4faf5] lg:bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      {/* ==================== MOBILE VIEW (< lg) — STITCH + LIVE CARTO MAP ==================== */}
      <div className="lg:hidden max-w-md mx-auto px-4 pt-3 pb-28 flex flex-col gap-4">
        {/* Top Action Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "peta", label: "Peta Live", icon: "location_on" },
              { id: "rute", label: "Rute", icon: "alt_route" },
              { id: "halte", label: "Halte", icon: "departure_board" },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] whitespace-nowrap active:scale-95 transition-all shadow-xs",
                    active
                      ? "font-bold bg-[#134e35] text-white"
                      : "font-medium bg-white dark:bg-[#112218] text-slate-600 dark:text-[#99d3b2] border border-emerald-950/10"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-[15px]", active ? "text-[#bef264]" : "text-emerald-800 dark:text-[#ceeb7a]")}>
                    {t.icon}
                  </span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Bagikan Rute"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#112218] border border-emerald-900/10 text-[#134e35] dark:text-[#ceeb7a] flex items-center justify-center shadow-xs shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
          </button>
        </div>

        {/* Map Widget */}
        {activeTab === "peta" && (
          <>
            <section className="relative w-full rounded-2xl bg-white dark:bg-[#112218] border border-emerald-900/15 overflow-hidden shadow-sm flex flex-col">
              <LinusMap
                buses={buses}
                stops={stops}
                routePolyline={routePolyline}
                selectedStopId={selectedStopId}
                onSelectStop={(stop) => setSelectedStopId(stop.id)}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
                currentLocation={currentLocation}
                etaSettings={settings.eta}
                heightClass="h-[340px]"
              />

              <div className="bg-white dark:bg-[#112218] px-3.5 py-2.5 border-t border-emerald-900/10 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#bef264] text-[#134e35] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px]">campaign</span>
                  </div>
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-[#134e35] dark:text-white truncate leading-tight">
                      {operatingStatus.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-[#99d3b2] truncate leading-tight">
                      {operatingStatus.detail}
                    </p>
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0", modeBadge.badge)}>
                  {modeBadge.text}
                </span>
              </div>
            </section>

            {/* 3 Stat Cards */}
            <section className="grid grid-cols-3 gap-2.5">
              <div className="bg-white dark:bg-[#112218] rounded-2xl p-3 text-center border border-[#134e35]/10 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-[#e6f8e8] text-[#134e35] flex items-center justify-center mx-auto mb-1.5">
                  <span className="material-symbols-outlined text-[18px]">directions_bus</span>
                </div>
                <p className="text-[10px] text-[#404943] dark:text-[#99d3b2]">Bus Aktif</p>
                <p className="text-sm font-extrabold text-[#134e35] dark:text-white">{buses.length} unit</p>
              </div>
              <div className="bg-white dark:bg-[#112218] rounded-2xl p-3 text-center border border-[#134e35]/10 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-[#e6f8e8] text-[#134e35] flex items-center justify-center mx-auto mb-1.5">
                  <span className="material-symbols-outlined text-[18px]">departure_board</span>
                </div>
                <p className="text-[10px] text-[#404943] dark:text-[#99d3b2]">Total Halte</p>
                <p className="text-sm font-extrabold text-[#134e35] dark:text-white">{stops.length} titik</p>
              </div>
              <div className="bg-white dark:bg-[#112218] rounded-2xl p-3 text-center border border-[#134e35]/10 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-[#e6f8e8] text-[#134e35] flex items-center justify-center mx-auto mb-1.5">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                </div>
                <p className="text-[10px] text-[#404943] dark:text-[#99d3b2]">Operasional</p>
                <p className="text-sm font-extrabold text-[#134e35] dark:text-white">
                  {settings.service.openingTime}–{settings.service.closingTime}
                </p>
              </div>
            </section>

            {/* Halte Terdekat Kamu */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#134e35] dark:text-white">Estimasi Kedatangan Halte</h2>
                <button type="button" onClick={() => setActiveTab("halte")} className="text-xs font-semibold text-[#134e35] dark:text-[#ceeb7a] hover:underline">
                  Semua Halte &gt;
                </button>
              </div>
              <div className="space-y-2.5">
                {enrichedStops.slice(0, 4).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedStopId(h.id)}
                    className={cn(
                      "w-full text-left bg-white dark:bg-[#112218] rounded-2xl p-3.5 border shadow-xs flex items-center justify-between gap-3 transition-colors",
                      selectedStopId === h.id ? "border-[#134e35] ring-1 ring-[#134e35]/30" : "border-[#134e35]/10"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e6f8e8] text-[#134e35] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">departure_board</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-[#101f15] dark:text-white truncate">{h.name}</h3>
                          <span className="px-1.5 py-0.5 rounded bg-[#e6f8e8] text-[#134e35] text-[10px] font-bold shrink-0">{h.distText}</span>
                        </div>
                        <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] truncate mt-0.5">{h.area}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-[#134e35] dark:text-[#bef264]">{h.etaText}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-[#e6f8e8] text-[#134e35] text-[10px] font-semibold">
                        {h.busText}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "rute" && (
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[#134e35] dark:text-white">Daftar Rute LINUSKU</h2>
            {ROUTES_LIST.map((r) => (
              <div key={r.code} className="bg-white dark:bg-[#112218] rounded-2xl p-4 border border-[#134e35]/10 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#bef264] text-[#134e35] text-xs font-bold">{r.code}</span>
                  <span className="text-xs font-semibold text-[#506600] dark:text-[#ceeb7a]">{r.interval}</span>
                </div>
                <h3 className="text-sm font-bold text-[#101f15] dark:text-white">{r.title}</h3>
                <p className="text-xs text-[#404943] dark:text-[#99d3b2]">{r.stops}</p>
              </div>
            ))}
          </section>
        )}

        {activeTab === "halte" && (
          <section className="space-y-2.5">
            <h2 className="text-base font-extrabold text-[#134e35] dark:text-white">Semua Halte Kampus ({enrichedStops.length})</h2>
            {enrichedStops.map((h) => (
              <div key={h.id} className="bg-white dark:bg-[#112218] rounded-2xl p-3.5 border border-[#134e35]/10 shadow-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#101f15] dark:text-white">{h.name}</h3>
                  <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] mt-0.5">{h.area}</p>
                </div>
                <span className="text-xs font-bold text-[#134e35] dark:text-[#ceeb7a] shrink-0">{h.etaText}</span>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (lg+) — STITCH + LIVE CARTO MAP ==================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 pb-16">
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* Left Sidebar */}
          <aside className="col-span-3 flex flex-col gap-5 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e6f8e8] text-[#003622] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">directions_bus</span>
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-[#003622] dark:text-white leading-tight">LINUSKU</h1>
                  <p className="text-[11px] text-[#404943] dark:text-[#99d3b2]">Peta CARTO &amp; tracking bus USU real-time.</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {[
                  { id: "peta", label: "Peta & Bus", icon: "map" },
                  { id: "rute", label: "Rute", icon: "alt_route" },
                  { id: "halte", label: "Halte", icon: "departure_board" },
                  { id: "info", label: "Informasi Layanan", icon: "info" },
                ].map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-colors",
                        active
                          ? "bg-[#e6f8e8] text-[#003622]"
                          : "text-[#404943] dark:text-[#99d3b2] hover:bg-[#e6f8e8]/60"
                      )}
                    >
                      <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-3">
              <h2 className="text-sm font-bold text-[#101f15] dark:text-white">Status &amp; Jam Operasional</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#003622] dark:text-[#ceeb7a]">schedule</span>
                  <div>
                    <p className="font-bold text-[#101f15] dark:text-white">{operatingStatus.label}</p>
                    <p className="text-[#404943] dark:text-[#99d3b2]">{operatingStatus.detail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#003622] dark:text-[#ceeb7a]">sensors</span>
                  <div>
                    <p className="font-bold text-[#101f15] dark:text-white">Sumber Posisi</p>
                    <p className="text-[#404943] dark:text-[#99d3b2]">{modeBadge.text}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Map / Content */}
          <section className="col-span-6 bg-white dark:bg-[#112218] rounded-3xl p-4 shadow-stitch-card">
            {activeTab === "peta" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-[#003622] dark:text-white">Peta Rute &amp; Posisi Bus Kampus (CARTO)</h2>
                  <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold", modeBadge.badge)}>
                    {modeBadge.text}
                  </span>
                </div>

                <LinusMap
                  buses={buses}
                  stops={stops}
                  routePolyline={routePolyline}
                  selectedStopId={selectedStopId}
                  onSelectStop={(stop) => setSelectedStopId(stop.id)}
                  onLocateMe={handleLocateMe}
                  isLocating={isLocating}
                  currentLocation={currentLocation}
                  etaSettings={settings.eta}
                  heightClass="h-[460px]"
                />
              </div>
            )}

            {activeTab === "rute" && (
              <div className="space-y-3 p-2">
                <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Rute Operasional LINUSKU</h2>
                {ROUTES_LIST.map((r) => (
                  <div key={r.code} className="p-4 rounded-2xl bg-[#e6f8e8] dark:bg-[#183022] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[#003622] text-[#ceeb7a] text-xs font-bold">{r.code}</span>
                      <span className="text-xs font-semibold text-[#506600] dark:text-[#ceeb7a]">{r.interval}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#101f15] dark:text-white">{r.title}</h3>
                    <p className="text-xs text-[#404943] dark:text-[#99d3b2]">{r.stops}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "halte" && (
              <div className="space-y-2.5 p-2">
                <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Daftar Halte Resmi ({enrichedStops.length})</h2>
                {enrichedStops.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-2xl bg-[#e6f8e8] dark:bg-[#183022] flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#101f15] dark:text-white">{h.name}</h3>
                      <p className="text-xs text-[#404943] dark:text-[#99d3b2]">{h.area}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white text-[#003622] text-xs font-bold shrink-0">{h.etaText}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "info" && (
              <div className="space-y-3 p-2">
                <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Informasi Layanan LINUSKU</h2>
                <p className="text-sm text-[#404943] dark:text-[#99d3b2] leading-relaxed">
                  LINUSKU adalah layanan bus listrik dan shuttle internal kampus Universitas Sumatera Utara untuk memudahkan mobilitas mahasiswa antar fakultas, perpustakaan, dan gerbang utama secara gratis.
                </p>
              </div>
            )}
          </section>

          {/* Right Sidebar */}
          <aside className="col-span-3 flex flex-col gap-5 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-3">
              <h2 className="text-base font-bold text-[#101f15] dark:text-white">Bus Aktif ({enrichedBuses.length})</h2>
              <div className="space-y-2.5">
                {enrichedBuses.length === 0 ? (
                  <p className="text-xs text-[#707972] dark:text-[#99d3b2]">Belum ada armada aktif saat ini.</p>
                ) : (
                  enrichedBuses.map((b) => (
                    <div key={b.busId} className="p-3 rounded-2xl bg-[#e6f8e8] dark:bg-[#183022] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#003622] text-[#ceeb7a] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[17px]">directions_bus</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#101f15] dark:text-white truncate">{b.busId}</p>
                          <p className="text-[10px] text-[#404943] dark:text-[#99d3b2] truncate">→ {b.upcomingName}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-[#ceeb7a] text-[#161f00]">
                        {b.etaText}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-3">
              <h2 className="text-base font-bold text-[#101f15] dark:text-white">Halte Terdekat</h2>
              <div className="space-y-2">
                {enrichedStops.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStopId(s.id)}
                    className="w-full text-left p-3 rounded-2xl bg-[#e6f8e8] dark:bg-[#183022] flex items-center justify-between gap-2 hover:bg-[#ceeb7a]/30 transition-colors"
                  >
                    <span className="text-xs font-bold text-[#101f15] dark:text-white truncate">{s.name}</span>
                    <span className="text-[11px] font-extrabold text-[#003622] dark:text-[#ceeb7a] shrink-0">{s.etaText}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
