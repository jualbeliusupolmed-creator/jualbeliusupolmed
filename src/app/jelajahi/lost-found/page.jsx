"use client";

import { useState } from "react";

const reports = [];

const LOCATIONS = ["Semua Lokasi Kampus", "Area FISIP USU", "Perpustakaan USU", "Kantin Pusat USU", "Parkiran Gedung N Polmed"];

export default function LostFoundPage() {
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("Semua Lokasi Kampus");
  const [selectedReport, setSelectedReport] = useState(null);

  const filtered = reports.filter((r) => {
    if (tab === "Hilang" && r.type !== "HILANG") return false;
    if (tab === "Ditemukan" && r.type !== "DITEMUKAN") return false;
    if (tab === "Selesai" && r.status !== "selesai") return false;
    if (locationFilter !== "Semua Lokasi Kampus" && r.location !== locationFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-16 font-sans text-[#101f15] dark:text-[#ecfeee]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#003622] dark:text-[#bef264] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">inventory_2</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">Lost & Found</h1>
              <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-400">
                Laporkan barang hilang atau ditemukan di area kampus USU & Polmed.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-200 text-slate-600 text-xs font-extrabold">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Pelaporan belum tersedia
          </span>
        </div>

        {/* Status Tabs + Counters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {["Semua", "Hilang", "Ditemukan", "Selesai"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
                  tab === t
                    ? "bg-[#003622] text-white"
                    : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 hover:bg-[#e6f8e8]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-[#404943] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <b className="text-[#101f15] dark:text-white">{reports.filter((r) => r.type === "HILANG" && r.status === "aktif").length}</b> Hilang Aktif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <b className="text-[#101f15] dark:text-white">{reports.filter((r) => r.type === "DITEMUKAN" && r.status === "aktif").length}</b> Siap Diambil
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#134e35]" />
              <b className="text-[#101f15] dark:text-white">{reports.filter((r) => r.status === "selesai").length}</b> Selesai
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar Filter */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#101f15] dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  Filter Laporan
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setTab("Semua");
                    setLocationFilter("Semua Lokasi Kampus");
                    setSearch("");
                  }}
                  className="text-xs font-bold text-[#134e35] dark:text-[#bef264] hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#707972]">Jenis Laporan</p>
                <div className="space-y-1.5">
                  {["Semua", "Hilang", "Ditemukan"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        tab === t
                          ? "bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#003622] dark:text-[#bef264]"
                          : "text-[#404943] dark:text-slate-300 hover:bg-[#f4faf5] dark:hover:bg-white/5"
                      }`}
                    >
                      {t === "Hilang" ? "Hilang (Barang dicari)" : t === "Ditemukan" ? "Ditemukan (Diamankan)" : "Semua Laporan"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#707972]">Lokasi Kampus</p>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full rounded-xl bg-[#e6f8e8]/70 dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-3 py-2.5 text-xs font-semibold text-[#101f15] dark:text-white focus:outline-none"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-[#e6f8e8]/70 dark:bg-[#134e35]/20 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#003622] dark:text-[#bef264]">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Verifikasi Kepemilikan
                </div>
                <p className="text-[11px] leading-relaxed text-[#404943] dark:text-slate-300">
                  Pastikan membawa Kartu Tanda Mahasiswa (KTM) saat proses serah terima barang di Posko Satpam atau Sekretariat terkait.
                </p>
              </div>
            </div>
          </aside>

          {/* Right List */}
          <div className="lg:col-span-9 space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707972] text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, ciri khusus, atau lokasi..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white dark:bg-[#112218] text-sm text-[#101f15] dark:text-white placeholder:text-[#707972] shadow-[0_2px_10px_-2px_rgba(19,78,53,0.06)] focus:outline-none focus:ring-2 focus:ring-[#134e35]"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#112218] rounded-3xl p-10 text-center space-y-2 shadow-xs">
                <span className="material-symbols-outlined text-[36px] text-[#707972]">search_off</span>
                <p className="text-sm font-bold text-[#101f15] dark:text-white">Belum ada data laporan</p>
                <p className="text-xs text-[#707972]">Layanan Lost & Found belum memiliki backend untuk membaca atau menyimpan laporan. Form dinonaktifkan agar tidak dianggap terkirim.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-[#112218] rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                  >
                    <div className="relative w-full sm:w-40 h-32 rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/30 flex items-center justify-center shrink-0 overflow-hidden">
                      <span className="material-symbols-outlined text-[42px] text-[#134e35]/40 dark:text-[#bef264]/40">
                        {item.type === "HILANG" ? "backpack" : "devices"}
                      </span>
                      <span
                        className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          item.type === "HILANG"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-[#ceeb7a] text-[#003622]"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-[#101f15] dark:text-white">{item.title}</h3>
                        {item.status === "selesai" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-[#404943] dark:text-slate-300">
                            Selesai
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#404943] dark:text-slate-300 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#707972]">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {item.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {item.time}
                        </span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#134e35] text-white text-[10px] font-extrabold flex items-center justify-center">
                            {item.initials}
                          </div>
                          <span className="text-xs font-semibold text-[#101f15] dark:text-white">{item.reporter}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedReport(item)}
                          className="px-4 py-1.5 rounded-full bg-[#e6f8e8] dark:bg-white/10 hover:bg-[#ceeb7a] text-[#003622] dark:text-white text-xs font-bold transition"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-white dark:bg-[#112218] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${selectedReport.type === "HILANG" ? "bg-rose-100 text-rose-700" : "bg-[#ceeb7a] text-[#003622]"}`}>
                {selectedReport.type}
              </span>
              <button type="button" onClick={() => setSelectedReport(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-[#003622] dark:text-white">{selectedReport.title}</h3>
            <p className="text-sm text-[#404943] dark:text-slate-300 leading-relaxed">{selectedReport.description}</p>
            <div className="rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-3.5 space-y-1.5 text-xs">
              <p><b>Lokasi:</b> {selectedReport.location}</p>
              <p><b>Waktu:</b> {selectedReport.time}</p>
              <p><b>Pelapor:</b> {selectedReport.reporter}</p>
              <p><b>Kontak / Titik Klaim:</b> {selectedReport.contact}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="w-full py-2.5 rounded-full bg-[#003622] text-white text-xs font-extrabold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
