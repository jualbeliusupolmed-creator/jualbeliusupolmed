"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";

export default function SellerAnalyticsView({
  analytics,
  loading,
  onRefresh,
  onOpenBumpModal,
  onOpenBagikanModal,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("views_desc");

  const summary = analytics?.summary || {
    totalViews: 0,
    totalActive: 0,
    totalSold: 0,
    totalPending: 0,
    totalExpired: 0,
    totalSoldRevenue: 0,
    totalActiveAssetValue: 0,
    totalOffers: 0,
    acceptedOffers: 0,
    pendingOffers: 0,
    avgRating: null,
    totalRatings: 0,
    conversionRate: "0.0",
    totalListings: 0,
  };

  const listings = useMemo(() => analytics?.allListings || [], [analytics?.allListings]);
  const maxViews = useMemo(() => {
    return Math.max(...listings.map((l) => l.views || 0), 1);
  }, [listings]);

  const filteredAndSortedListings = useMemo(() => {
    return listings
      .filter((l) => {
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "views_desc") return (b.views || 0) - (a.views || 0);
        if (sortBy === "views_asc") return (a.views || 0) - (b.views || 0);
        if (sortBy === "offers_desc") return (b.offers_count || 0) - (a.offers_count || 0);
        if (sortBy === "price_desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
        if (sortBy === "price_asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (sortBy === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        return 0;
      });
  }, [listings, searchTerm, statusFilter, sortBy]);

  function exportDataCSV() {
    if (!listings.length) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const rows = listings.map((l) => ({
      ID: l.id,
      Judul: l.title,
      Kategori: l.category || "-",
      Kondisi: l.condition || "-",
      Harga: l.price,
      Status: l.status,
      Total_Views: l.views || 0,
      Views_Per_Hari: l.views_per_day || 0,
      Jumlah_Tawaran: l.offers_count || 0,
      Hari_Aktif: l.days_active || 1,
      Tanggal_Dibuat: l.created_at ? new Date(l.created_at).toLocaleDateString("id-ID") : "-",
    }));
    downloadCSV(`statistik_penjual_${Date.now()}.csv`, rows);
    toast.success("Laporan statistik berhasil diunduh.");
  }

  if (loading) {
    return (
      <div className="space-y-6 mt-6 animate-pulse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-40 rounded-2xl bg-gray-100 dark:bg-slate-800" />
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card p-12 text-center mt-6 space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">
          📊
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Statistik Toko & Iklan
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Pantau jumlah tayangan, omset penjualan, dan efektivitas iklanmu secara real-time.
          </p>
        </div>
        <button onClick={onRefresh} className="btn-primary inline-flex items-center gap-2">
          <span>Muat Statistik Sekarang</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span>Performa Toko & Penjualan</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Live Real-time
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Data analitik terintegrasi untuk memaksimalkan penjualan di kampus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportDataCSV}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
            title="Download CSV"
          >
            <span>📥 Ekspor CSV</span>
          </button>
          <button
            onClick={onRefresh}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <span>🔄 Segarkan</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Total Views</span>
            <span className="text-lg">👁️</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {(summary.totalViews || 0).toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Dari {summary.totalListings} iklan
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Omset Terjual</span>
            <span className="text-lg">💵</span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {rupiah(summary.totalSoldRevenue || 0)}
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-500 mt-0.5">
              {summary.totalSold} barang laku
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Nilai Aset Aktif</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black tracking-tight text-sky-600 dark:text-sky-400 truncate">
              {rupiah(summary.totalActiveAssetValue || 0)}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {summary.totalActive} barang siap jual
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Konversi</span>
            <span className="text-lg">⚡</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
              {summary.conversionRate}%
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Laku vs total views
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tawaran Masuk</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {summary.totalOffers}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {summary.acceptedOffers} disetujui
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Kepuasan</span>
            <span className="text-lg">⭐</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black tracking-tight text-amber-500">
              {summary.avgRating ? `${summary.avgRating} / 5.0` : "—"}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {summary.totalRatings > 0 ? `${summary.totalRatings} ulasan` : "Belum ada ulasan"}
            </p>
          </div>
        </div>
      </div>

      {/* SMART INSIGHTS SECTION */}
      {analytics.insights && analytics.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            💡 Rekomendasi & Insight Cerdas
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {analytics.insights.map((ins, i) => {
              const bgClass =
                ins.type === "warning"
                  ? "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 text-amber-900 dark:text-amber-200"
                  : ins.type === "success"
                  ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                  : ins.type === "action"
                  ? "bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200"
                  : "bg-sky-50/80 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/50 text-sky-900 dark:text-sky-200";

              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-3.5 flex items-start gap-3 transition-all ${bgClass}`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{ins.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{ins.title}</p>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{ins.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY BREAKDOWN VISUAL */}
      {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
        <div className="card p-5 border border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🏷️ Distribusi Kategori Barang</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Perbandingan jumlah iklan dan tayangan yang diperoleh di tiap kategori.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {analytics.categoryBreakdown.slice(0, 6).map((cat) => {
              const totalV = summary.totalViews || 1;
              const viewPct = Math.round(((cat.views || 0) / totalV) * 100);

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="font-semibold">{cat.name}</span>
                      <span className="text-gray-400 text-[11px]">({cat.count} barang · {cat.sold} laku)</span>
                    </span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">
                      {cat.views} views <span className="text-gray-400 font-normal">({viewPct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500"
                      style={{ width: `${Math.max(viewPct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INTERACTIVE LISTINGS PERFORMANCE TABLE */}
      <div className="card p-5 border border-black/[0.04] dark:border-white/[0.06] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📈 Performa Detail Per Iklan</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredAndSortedListings.length}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Urutkan dan pantau efektivitas setiap barang jualanmu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari judul iklan..."
                className="input py-1.5 pl-8 pr-3 text-xs w-40 sm:w-48 shadow-sm"
              />
              <span className="absolute left-2.5 top-2 text-xs text-gray-400">🔍</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 px-2.5 text-xs shadow-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="sold">Terjual</option>
              <option value="expired">Expired</option>
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input py-1.5 px-2.5 text-xs shadow-sm"
            >
              <option value="views_desc">Views Terbanyak</option>
              <option value="views_asc">Views Terendah</option>
              <option value="offers_desc">Paling Banyak Ditawar</option>
              <option value="price_desc">Harga Tertinggi</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="newest">Terbaru</option>
            </select>
          </div>
        </div>

        {filteredAndSortedListings.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            Tidak ada iklan yang cocok dengan pencarian atau filter.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredAndSortedListings.map((l) => {
              const pct = Math.round(((l.views || 0) / maxViews) * 100);
              const sharePct =
                summary.totalViews > 0
                  ? Math.round(((l.views || 0) / summary.totalViews) * 100)
                  : 0;

              return (
                <div key={l.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 border border-black/[0.04] dark:border-white/[0.06]">
                      {l.image_url ? (
                        <Image
                          src={l.image_url}
                          alt={l.title || ""}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          📦
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/produk/${l.slug || l.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-primary dark:text-white truncate max-w-[280px]"
                        >
                          {l.title}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            l.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : l.status === "sold"
                              ? "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                          }`}
                        >
                          {l.status === "active" ? "Aktif" : l.status === "sold" ? "Terjual" : l.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">
                          {rupiah(l.price)}
                        </span>
                        <span>•</span>
                        <span>{l.category || "Umum"}</span>
                        <span>•</span>
                        <span>{l.views_per_day} views/hari</span>
                        {l.offers_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              💰 {l.offers_count} tawaran
                            </span>
                          </>
                        )}
                      </div>

                      {/* Visual Popularity Bar */}
                      <div className="mt-2 h-1.5 w-full max-w-md rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            l.status === "sold" ? "bg-gray-400" : "bg-sky-500"
                          }`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Views Metric & Quick Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-black text-gray-900 dark:text-white">
                        {(l.views || 0).toLocaleString("id-ID")}
                        <span className="text-xs text-gray-400 font-normal ml-1">views</span>
                      </div>
                      {sharePct > 0 && (
                        <p className="text-[10px] text-gray-400">
                          {sharePct}% dari total tayangan
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {l.status === "active" && onOpenBumpModal && (
                        <button
                          type="button"
                          onClick={() => onOpenBumpModal(l)}
                          className="btn-outline py-1 px-2 text-xs text-primary border-primary/30 hover:bg-primary/5 rounded-lg"
                          title="Sundul Iklan"
                        >
                          🚀 Sundul
                        </button>
                      )}
                      {onOpenBagikanModal && (
                        <button
                          type="button"
                          onClick={() => onOpenBagikanModal(l)}
                          className="btn-outline py-1 px-2 text-xs rounded-lg"
                          title="Bagikan Iklan"
                        >
                          📤
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT RATINGS & REVIEWS */}
      {analytics.recentRatings && analytics.recentRatings.length > 0 && (
        <div className="card p-5 border border-black/[0.04] dark:border-white/[0.06]">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>⭐ Ulasan Pembeli Terbaru</span>
          </h3>
          <div className="space-y-3">
            {analytics.recentRatings.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-800 dark:text-slate-200">
                    {r.buyer_name || "Mahasiswa"}
                  </span>
                  <span className="text-amber-500 font-bold">
                    {"★".repeat(r.rating || 5)}{"☆".repeat(5 - (r.rating || 5))}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-gray-600 dark:text-slate-300 italic">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
