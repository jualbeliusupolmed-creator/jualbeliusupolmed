"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Semua", "Seminar", "Workshop", "Lomba", "Kegiatan Mahasiswa"];
const PAGE_SIZE = 15;

function formatPublishedDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Tanggal publikasi tidak tersedia";
  return `Diumumkan ${date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export default function AgendaKampusPage() {
  const [selectedCat, setSelectedCat] = useState("Semua");
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      try {
        const response = await fetch(`/api/mading?type=event&page=1&limit=${PAGE_SIZE}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Pengumuman kegiatan belum dapat dimuat.");
        if (!Array.isArray(result.posts)) throw new Error("Respons pengumuman kegiatan tidak valid.");
        setEvents(result.posts);
        setHasMore(Number(result.totalPages) > 1);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Pengumuman kegiatan belum dapat dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();
    return () => controller.abort();
  }, []);

  async function loadMoreEvents() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/mading?type=event&page=${nextPage}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Pengumuman berikutnya belum dapat dimuat.");
      if (!Array.isArray(result.posts)) throw new Error("Respons pengumuman kegiatan tidak valid.");
      setEvents((current) => {
        const seen = new Set(current.map((event) => String(event.id)));
        return [...current, ...result.posts.filter((event) => !seen.has(String(event.id)))];
      });
      setPage(nextPage);
      setHasMore(Number(result.totalPages) > nextPage);
    } catch (cause) {
      setLoadMoreError(cause instanceof Error ? cause.message : "Pengumuman berikutnya belum dapat dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(
    () => events.filter((event) => {
      if (selectedCat === "Semua") return true;
      const text = `${event.title || ""} ${event.content || ""}`.toLowerCase();
      const term = selectedCat === "Kegiatan Mahasiswa" ? "kegiatan" : selectedCat.toLowerCase();
      return text.includes(term);
    }),
    [events, selectedCat]
  );

  return (
    <div className="min-h-screen bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5 pb-28 lg:pb-16 space-y-5">
        {/* Header */}
        <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 lg:p-6 shadow-stitch-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/jelajahi"
              className="w-10 h-10 rounded-full bg-[#e6f8e8] text-[#003622] flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#003622] dark:text-white">Agenda Kampus</h1>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2]">
                Pengumuman kegiatan terbaru dari Mading Kampus Kita. Periksa isi pengumuman untuk tanggal dan informasi pendaftaran.
              </p>
            </div>
          </div>

          <span className="px-5 py-2.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Pengajuan belum tersedia</span>
          </span>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCat(c)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                selectedCat === c
                  ? "bg-[#003622] text-white"
                  : "bg-white dark:bg-[#112218] text-[#404943] dark:text-[#99d3b2]"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid: Calendar + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Registration details are provided by each published announcement. */}
          <aside className="lg:col-span-4 bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#e6f8e8] text-[#003622] flex items-center justify-center">
              <span className="material-symbols-outlined">info</span>
            </div>
            <h2 className="text-sm font-bold text-[#003622] dark:text-white">Informasi pendaftaran</h2>
            <p className="text-xs leading-relaxed text-[#404943] dark:text-[#99d3b2]">
              Agenda belum memiliki data tanggal acara atau pendaftaran terstruktur. Tombol pendaftaran hanya ditampilkan jika tersedia pada pengumuman aslinya.
            </p>
          </aside>

          {/* Event Cards */}
          <div className="lg:col-span-8 space-y-3.5">
            {loading ? (
              <div role="status" className="bg-white dark:bg-[#112218] rounded-2xl p-8 text-center text-sm text-[#404943] dark:text-[#99d3b2]">
                Memuat pengumuman kegiatan…
              </div>
            ) : error ? (
              <div role="alert" className="bg-white dark:bg-[#112218] rounded-2xl p-8 text-center text-sm text-rose-700">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#112218] rounded-2xl p-8 text-center shadow-stitch-card">
                <span className="material-symbols-outlined text-3xl text-[#707972]">event_busy</span>
                <p className="mt-2 text-sm font-bold text-[#101f15] dark:text-white">
                  {events.length ? "Tidak ada pengumuman pada kategori ini" : "Belum ada pengumuman kegiatan"}
                </p>
                <p className="mt-1 text-xs text-[#707972]">Data agenda dibaca dari pengumuman Mading, bukan contoh statis.</p>
              </div>
            ) : (
              filtered.map((event) => (
                <article
                  key={event.id}
                  className="bg-white dark:bg-[#112218] rounded-2xl p-4 shadow-stitch-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold">
                      Pengumuman kegiatan
                    </span>
                    <h3 className="text-sm lg:text-base font-bold text-[#101f15] dark:text-white">
                      {event.title || event.content?.slice(0, 100) || "Pengumuman tanpa judul"}
                    </h3>
                    <p className="text-xs text-[#404943] dark:text-[#99d3b2] line-clamp-3">
                      {event.content || "Buka detail pengumuman untuk informasi selengkapnya."}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-[#707972]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatPublishedDate(event.created_at)}
                    </span>
                  </div>
                  <Link
                    href={`/mading/${encodeURIComponent(String(event.id))}`}
                    className="px-5 py-2.5 rounded-full bg-[#003622] text-white text-xs font-bold shrink-0 hover:bg-[#134e35] text-center"
                  >
                    Lihat detail pengumuman
                  </Link>
                </article>
              ))
            )}
            {hasMore && !loading && !error && (
              <div className="space-y-2 pt-2">
                {loadMoreError && <p role="alert" className="text-center text-xs text-rose-700">{loadMoreError}</p>}
                <button
                  type="button"
                  onClick={loadMoreEvents}
                  disabled={loadingMore}
                  className="w-full px-5 py-3 rounded-full bg-white dark:bg-[#112218] border border-[#134e35]/15 text-[#003622] dark:text-white text-xs font-bold disabled:opacity-60"
                >
                  {loadingMore ? "Memuat..." : "Muat pengumuman lainnya"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
