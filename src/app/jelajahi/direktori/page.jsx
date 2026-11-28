"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOCATION_CATS = [
  "Semua Lokasi",
  "Fakultas",
  "Gedung & Ruang",
  "Laboratorium",
  "Perpustakaan",
  "Kantin",
  "ATM Center",
  "Layanan Kesehatan",
];

const LOCATIONS = [
  {
    id: 1,
    cat: "Perpustakaan",
    name: "Perpustakaan USU",
    type: "Fasilitas Akademik",
    address: "Jl. Universitas No. 1, Medan",
    phone: "(061) 8211633",
    hours: "Buka • 08.00 – 17.00 WIB",
  },
  {
    id: 2,
    cat: "Fakultas",
    name: "Fakultas Ilmu Komputer dan Teknologi Informasi (FASILKOM-TI)",
    type: "Fakultas",
    address: "Jl. Alumni No. 3, Kampus USU",
    phone: "(061) 8228048",
    hours: "Buka • 08.00 – 16.30 WIB",
  },
  {
    id: 3,
    cat: "Layanan Kesehatan",
    name: "Rumah Sakit & Klinik USU",
    type: "Layanan Kesehatan",
    address: "Jl. Dr. T. Mansyur No. 66, Medan",
    phone: "(061) 8216255",
    hours: "Buka • 24 Jam (IGD)",
  },
  {
    id: 4,
    cat: "Gedung & Ruang",
    name: "Biro Rektorat USU",
    type: "Gedung & Ruang",
    address: "Jl. Dr. T. Mansyur No. 9, Medan",
    phone: "(061) 8211633",
    hours: "Buka • 08.00 – 16.00 WIB",
  },
];

export default function DirektoriKampusPage() {
  const [cat, setCat] = useState("Semua Lokasi");
  const [search, setSearch] = useState("");
  const [selectedLoc, setSelectedLoc] = useState(LOCATIONS[0]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LOCATIONS.filter((l) => {
      if (cat !== "Semua Lokasi" && l.cat !== cat) return false;
      if (q && !`${l.name} ${l.address} ${l.type}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cat, search]);

  return (
    <div className="min-h-screen bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5 pb-28 lg:pb-16 space-y-5">
        {/* Header */}
        <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 lg:p-6 shadow-stitch-card space-y-4">
          <div className="flex items-center gap-4">
            <Link
              href="/jelajahi"
              className="w-10 h-10 rounded-full bg-[#e6f8e8] text-[#003622] flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#003622] dark:text-white">Direktori Kampus</h1>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2]">
                Cari lokasi gedung, fakultas, fasilitas, dan layanan resmi di lingkungan kampus.
              </p>
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707972] text-[19px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Cari gedung, fakultas, fasilitas (mis. "FISIP", "perpustakaan")'
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#e6f8e8] dark:bg-[#183022] text-xs outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Categories */}
          <aside className="lg:col-span-3 bg-white dark:bg-[#112218] rounded-3xl p-4 shadow-stitch-card flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
            {LOCATION_CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-colors",
                  cat === c ? "bg-[#e6f8e8] text-[#003622]" : "text-[#404943] dark:text-[#99d3b2] hover:bg-[#e6f8e8]/50"
                )}
              >
                {c}
              </button>
            ))}
          </aside>

          {/* List + Selected Card */}
          <div className="lg:col-span-9 space-y-4">
            {selectedLoc && (
              <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#134e35]/10">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold">
                    {selectedLoc.type}
                  </span>
                  <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">{selectedLoc.name}</h2>
                  <p className="text-xs text-[#404943] dark:text-[#99d3b2]">{selectedLoc.address}</p>
                  <p className="text-xs font-semibold text-[#134e35] dark:text-[#bef264]">
                    {selectedLoc.phone} • {selectedLoc.hours}
                  </p>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedLoc.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-[#003622] text-white text-xs font-bold text-center shrink-0"
                >
                  Buka di Maps ↗
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedLoc(loc)}
                  className={cn(
                    "bg-white dark:bg-[#112218] rounded-2xl p-4 text-left shadow-stitch-card border transition-all space-y-1.5",
                    selectedLoc?.id === loc.id ? "border-[#003622] ring-2 ring-[#003622]/15" : "border-transparent"
                  )}
                >
                  <span className="text-[10px] font-bold text-[#506600] uppercase">{loc.type}</span>
                  <h3 className="text-sm font-bold text-[#101f15] dark:text-white">{loc.name}</h3>
                  <p className="text-xs text-[#404943] dark:text-[#99d3b2]">{loc.address}</p>
                  <p className="text-[11px] font-semibold text-[#003622] dark:text-[#bef264]">{loc.hours}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
