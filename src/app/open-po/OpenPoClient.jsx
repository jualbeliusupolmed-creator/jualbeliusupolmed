"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { rupiah } from "@/lib/fees";
import { cn } from "@/lib/utils";
import { getOpenPoBatchMetrics } from "@/lib/openPoDisplay";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "Semua", label: "Semua", desktopLabel: "Semua Kategori", icon: "apps", emoji: "" },
  { id: "Makanan", label: "Makanan", desktopLabel: "Makanan & Minuman", icon: "restaurant", emoji: "🍱" },
  { id: "Minuman", label: "Minuman", desktopLabel: "Minuman", icon: "local_cafe", emoji: "🧋" },
  { id: "Merchandise", label: "Merch", desktopLabel: "Merchandise", icon: "checkroom", emoji: "👕" },
  { id: "Snack", label: "Snack", desktopLabel: "Snack & Kue", icon: "bakery_dining", emoji: "🍪" },
  { id: "Jastip", label: "Jastip", desktopLabel: "Jastip", icon: "shopping_bag", emoji: "🛍️" },
  { id: "Lainnya", label: "Lainnya", desktopLabel: "Lainnya", icon: "more_horiz", emoji: "📦" },
];

function countdownLabel(value) {
  if (!value) return "Tenggat belum tersedia";
  const closeAt = new Date(value).getTime();
  if (!Number.isFinite(closeAt)) return "Tenggat tidak valid";
  const diffMs = closeAt - Date.now();
  if (diffMs <= 0) return "Ditutup";
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `Tutup ${Math.max(1, hours)} jam lagi`;
  const days = Math.ceil(hours / 24);
  return `Tutup ${days} hari lagi`;
}

export default function OpenPoClient({ initialBatches = [], isAuthenticated = false, initialError = "" }) {
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState("Semua");
  const [category, setCategory] = useState("Semua");
  const [statusTab, setStatusTab] = useState("all"); // all | active | closing
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [buyerName, setBuyerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(null);
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_campus");
      if (saved && saved !== "Semua") {
        const match = initialBatches.find(
          (b) => String(b.campus || "").toLowerCase() === saved.toLowerCase()
        );
        if (match) setCampusFilter(match.campus);
      }
    } catch {}
  }, [initialBatches]);

  const campuses = useMemo(
    () => ["Semua", ...new Set(initialBatches.map((b) => b.campus).filter(Boolean))],
    [initialBatches]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = initialBatches.filter((batch) => {
      const text = `${batch.title || ""} ${batch.name || ""} ${batch.description || ""} ${batch.pickup_point || ""} ${batch.seller_name || ""}`.toLowerCase();
      if (needle && !text.includes(needle)) return false;
      if (campusFilter !== "Semua" && batch.campus !== campusFilter) return false;
      if (category !== "Semua") {
        const cat = String(batch.category || "").toLowerCase();
        if (!cat.includes(category.toLowerCase())) return false;
      }
      if (statusTab === "closing") {
        const closeAt = new Date(batch.closes_at || "").getTime();
        const diff = closeAt - Date.now();
        if (!Number.isFinite(closeAt) || diff > 48 * 3600000 || diff <= 0) return false;
      }
      return true;
    });

    if (sortBy === "cheapest") {
      list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "quota") {
      list = [...list].sort((a, b) => Number(b.quota || 0) - Number(a.quota || 0));
    }
    return list;
  }, [initialBatches, query, campusFilter, category, statusTab, sortBy]);

  async function reserve(event) {
    event.preventDefault();
    if (!selected) return;
    if (!isAuthenticated) {
      window.location.href = `/dashboard/login?next=${encodeURIComponent("/open-po")}`;
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/open-po/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selected.id, buyerName, quantity, contactConsent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Reservasi gagal dibuat.");
      setSuccess({ order: result.order, sellerContact: result.sellerContact, productName: result.productName });
      toast.success("Pesanan PO berhasil dicatat!");
      setSelected(null);
      setBuyerName("");
      setQuantity(1);
      setContactConsent(false);
    } catch (cause) {
      setError(cause.message);
      toast.error(cause.message);
    } finally {
      setSubmitting(false);
    }
  }

  const nextPath = isAuthenticated ? "/dashboard/open-po" : "/dashboard/login?next=%2Fdashboard%2Fopen-po";

  return (
    <div className="min-h-screen bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      {/* ==================== MOBILE VIEW (< lg) — 100% STITCH open_po_1 ==================== */}
      <div className="lg:hidden max-w-md mx-auto px-4 pt-3 pb-28">
        <div className="mb-3.5">
          <h1 className="text-[22px] font-extrabold text-[#134e35] dark:text-white tracking-tight leading-tight">
            Open Pre-Order
          </h1>
          <p className="text-[13px] text-[#404943] dark:text-[#99d3b2] font-normal">
            Preorder bareng teman kampus, kuota tercapai lebih hemat!
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full mb-3">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#404943] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari makanan, minuman, merch kampus..."
            className="w-full bg-white dark:bg-[#112218] text-[#101f15] dark:text-white placeholder:text-[#404943]/70 text-[13px] rounded-2xl pl-10 pr-10 py-2.5 border border-[#134e35]/15 focus:outline-none focus:ring-2 focus:ring-[#134e35] shadow-xs transition"
          />
          <Link
            href="/keranjang?tab=po"
            aria-label="Pesanan PO Saya"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-[#ecfeee] flex items-center justify-center text-[#134e35] hover:bg-[#bef264] transition"
          >
            <span className="material-symbols-outlined text-[17px]">shopping_bag</span>
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 -mx-4 px-4">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-[12px] whitespace-nowrap flex items-center gap-1.5 transition active:scale-95",
                  active
                    ? "font-semibold bg-[#134e35] text-white shadow-xs"
                    : "font-medium bg-white dark:bg-[#112218] text-[#101f15] dark:text-[#ecfeee] border border-[#134e35]/15 hover:bg-[#e0f3e3]"
                )}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Horizontal Pre-Order Cards List */}
        <div className="flex flex-col gap-3 mb-5">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-8 text-center border border-[#134e35]/10">
              <span className="material-symbols-outlined text-[36px] text-[#707972]">inventory_2</span>
              <p className="mt-2 text-sm font-bold text-[#101f15] dark:text-white">Belum ada Open PO aktif</p>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2] mt-1">Coba kata kunci atau kategori lain, atau buka PO baru.</p>
            </div>
          ) : (
            filtered.map((batch) => {
              const { quota, reserved: ordered, progress: pct, photo, closesAt } = getOpenPoBatchMetrics(batch);
              const title = batch.title || batch.name || "Open PO Kampus";
              const isFav = !!favorites[batch.id];

              return (
                <article
                  key={batch.id}
                  onClick={() => setSelected(batch)}
                  className="bg-white dark:bg-[#112218] rounded-2xl p-3 border border-[#134e35]/10 shadow-sm flex gap-3 relative transition hover:shadow-md cursor-pointer"
                >
                  <div className="relative w-[104px] h-[104px] shrink-0 rounded-xl overflow-hidden bg-[#e6f8e8]">
                    {photo ? (
                      <img src={photo} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#134e35]">
                        <span className="material-symbols-outlined text-[32px]">local_mall</span>
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-[#bef264] text-[#134e35] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                      {batch.category || "PO"}
                    </span>
                  </div>

                  <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-[14px] text-[#101f15] dark:text-white truncate">{title}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavorites((p) => ({ ...p, [batch.id]: !p[batch.id] }));
                          }}
                          aria-label="Favorit"
                          className={cn("p-0.5 transition-colors", isFav ? "text-[#ba1a1a]" : "text-[#707972] hover:text-[#ba1a1a]")}
                        >
                          <span className="material-symbols-outlined text-[19px]">favorite</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] truncate mt-0.5">
                        oleh {batch.seller_name || "Penjual"} • {batch.pickup_point || batch.campus || "Kampus"}
                      </p>
                      <div className="text-[15px] font-extrabold text-[#134e35] dark:text-[#bef264] mt-1">
                        {rupiah(batch.price)}
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#134e35] dark:text-white">
                          <span className="text-[#506600] dark:text-[#bef264]">{ordered}</span>/{quota} slot
                        </span>
                        <span className="text-[#404943] dark:text-[#99d3b2] text-[10.5px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-[#ba1a1a]">schedule</span>
                          {countdownLabel(closesAt)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#e0f3e3] rounded-full overflow-hidden">
                        <div className="h-full bg-[#134e35] dark:bg-[#bef264] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Banner Ajakan Buka PO Sendiri */}
        <section className="relative bg-[#134e35] text-white rounded-2xl p-4 shadow-sm overflow-hidden mb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 pr-1">
              <div className="flex items-center gap-1.5 text-[#bef264] text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-[14px]">storefront</span>
                PUNYA USAHA SENDIRI?
              </div>
              <h2 className="text-[15px] font-extrabold leading-snug">Mau buka Preorder sendiri?</h2>
              <p className="text-[11px] text-[#b4f0cd] mt-1 leading-relaxed">
                Ajak teman satu kampus barengan, kuota kumpul lebih cepat &amp; hemat ongkir!
              </p>
            </div>
            <Link
              href={nextPath}
              className="shrink-0 px-3.5 py-2 rounded-full bg-[#bef264] text-[#134e35] text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
            >
              + Buka PO
            </Link>
          </div>
        </section>
      </div>

      {/* ==================== DESKTOP VIEW (lg+) — 100% STITCH open_po_2 ==================== */}
      <div className="hidden lg:flex max-w-7xl mx-auto w-full px-6 py-6 pb-20 flex-col gap-6">
        {/* Header Banner */}
        <div className="w-full bg-white dark:bg-[#112218] rounded-2xl p-6 shadow-sm flex items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#e0f3e3] flex items-center justify-center text-[#003622] flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[36px]">storefront</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-[24px] font-extrabold text-[#003622] dark:text-white tracking-tight">Open PO</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold uppercase">
                  Pre-order Bareng
                </span>
              </div>
              <p className="text-[13px] text-[#404943] dark:text-[#99d3b2] mt-1">
                Temukan dan ikuti sistem preorder bareng di lingkungan kampus. Lebih hemat, transparan, dan terpercaya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 z-10 justify-end">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#e6f8e8] dark:bg-[#183022] rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-[#ceeb7a] flex items-center justify-center text-[#161f00] shadow-sm">
                <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#404943] dark:text-[#99d3b2] font-bold">BATCH AKTIF</span>
                <span className="text-[14px] text-[#003622] dark:text-white font-bold">
                  {initialBatches.length} Pesanan Terbuka
                </span>
              </div>
            </div>
            <Link
              href={nextPath}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#134e35] hover:bg-[#003622] text-white text-[13px] font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Buat Open PO</span>
            </Link>
          </div>
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#ceeb7a]/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Sidebar */}
          <aside className="col-span-3 flex flex-col gap-4 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 pb-2">
                <h2 className="text-[16px] text-[#003622] dark:text-white font-bold">Kategori PO</h2>
                <span className="material-symbols-outlined text-[#707972] text-[20px]">category</span>
              </div>
              <nav className="flex flex-col gap-1.5">
                {CATEGORIES.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all",
                        active
                          ? "bg-[#e0f3e3] text-[#003622] text-[13px] font-bold"
                          : "hover:bg-[#e6f8e8] text-[#404943] dark:text-[#99d3b2] text-[13px]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("material-symbols-outlined text-[20px]", active ? "text-[#003622]" : "text-[#707972]")}>
                          {cat.icon}
                        </span>
                        <span>{cat.desktopLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="bg-[#134e35] text-white rounded-2xl p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#ceeb7a] text-[#161f00] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
              <span className="text-[14px] font-bold">Titik Pickup Terverifikasi</span>
              <p className="text-[11px] text-[#85be9e]">
                Semua batch Open PO menyepakati titik temu atau pickup jelas di lingkungan kampus.
              </p>
            </div>
          </aside>

          {/* Right Main Area */}
          <div className="col-span-9 flex flex-col gap-6">
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707972] text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Cari Open PO, misalnya "makanan", "merch USU", "buku"...'
                  className="w-full pl-11 pr-4 py-2.5 bg-[#e6f8e8] dark:bg-[#183022] text-[#101f15] dark:text-white text-[13px] rounded-xl outline-none placeholder:text-[#707972]"
                />
              </div>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="bg-[#e6f8e8] dark:bg-[#183022] text-[#101f15] dark:text-white text-[12px] py-2.5 px-3.5 rounded-xl outline-none cursor-pointer"
              >
                {campuses.map((c) => (
                  <option key={c} value={c}>{c === "Semua" ? "Semua Kampus" : c}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#e6f8e8] dark:bg-[#183022] text-[#101f15] dark:text-white text-[12px] py-2.5 px-3.5 rounded-xl outline-none cursor-pointer"
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="quota">Kuota Terbanyak</option>
                <option value="cheapest">Harga Terendah</option>
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: "Semua PO" },
                { id: "active", label: "Sedang Berjalan" },
                { id: "closing", label: "Segera Ditutup" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusTab(t.id)}
                  className={cn(
                    "px-5 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors shadow-sm",
                    statusTab === t.id
                      ? "bg-[#134e35] text-white"
                      : "bg-white dark:bg-[#112218] text-[#404943] dark:text-[#99d3b2] hover:bg-[#e6f8e8]"
                  )}
                >
                  {t.label}
                </button>
              ))}
              <Link
                href="/keranjang?tab=po"
                className="px-5 py-2 rounded-full bg-white dark:bg-[#112218] text-[#404943] dark:text-[#99d3b2] hover:bg-[#e6f8e8] text-[13px] font-bold whitespace-nowrap shadow-sm ml-auto"
              >
                Pesanan Saya
              </Link>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#112218] rounded-2xl p-12 text-center shadow-sm">
                <span className="material-symbols-outlined text-[42px] text-[#707972]">inventory_2</span>
                <p className="mt-2 text-base font-bold text-[#101f15] dark:text-white">Belum ada Open PO yang cocok</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((batch) => {
                  const { quota, reserved: ordered, remaining: sisa, progress: pct, photo, closesAt } = getOpenPoBatchMetrics(batch);
                  const title = batch.title || batch.name || "Open PO Kampus";
                  const isFav = !!favorites[batch.id];

                  return (
                    <div
                      key={batch.id}
                      className="bg-white dark:bg-[#112218] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#e0f3e3]">
                          {photo ? (
                            <img
                              src={photo}
                              alt={title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#134e35]">
                              <span className="material-symbols-outlined text-[44px]">local_mall</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFavorites((p) => ({ ...p, [batch.id]: !p[batch.id] }))}
                            className={cn(
                              "absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center transition-colors",
                              isFav ? "text-[#ba1a1a]" : "text-[#404943] hover:text-[#ba1a1a]"
                            )}
                          >
                            <span className="material-symbols-outlined text-[18px]">favorite</span>
                          </button>
                          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold shadow-sm">
                            Sisa {sisa} kuota
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#404943] dark:text-[#99d3b2] font-medium">
                              {batch.category || "Open PO"} • {batch.seller_name || "Mahasiswa"}
                            </span>
                            <span className="material-symbols-outlined text-[#707972] text-[16px]">verified</span>
                          </div>
                          <h3 className="text-[14px] text-[#101f15] dark:text-white font-bold mt-0.5 line-clamp-1">
                            {title}
                          </h3>
                          <span className="text-[20px] text-[#003622] dark:text-[#bef264] font-extrabold mt-1">
                            {rupiah(batch.price)}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-1">
                          <div className="w-full bg-[#e0f3e3] rounded-full h-2 overflow-hidden">
                            <div className="bg-[#134e35] dark:bg-[#bef264] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#404943] dark:text-[#99d3b2]">
                            <span>Progres pesanan</span>
                            <span className="font-bold text-[#003622] dark:text-white">{ordered}/{quota} kuota</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#ba1a1a] text-[10px] font-semibold">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>{countdownLabel(closesAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-4 pt-3 bg-[#e6f8e8]/60 dark:bg-[#183022] -mx-4 -mb-4 p-4 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#404943] dark:text-[#99d3b2] font-semibold truncate">
                            {batch.pickup_point || "Titik Pickup Kampus"}
                          </span>
                          <span className="text-[10px] text-[#707972] shrink-0">{batch.campus || "Kampus"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected(batch)}
                          className="w-full py-2.5 rounded-xl bg-[#134e35] hover:bg-[#003622] text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Ikuti PO</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Reservasi Open PO */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#112218] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#161f00]">
                  Ikuti Open PO
                </span>
                <h3 className="text-lg font-extrabold text-[#003622] dark:text-white mt-1.5">
                  {selected.title || selected.name}
                </h3>
                <p className="text-xs text-[#404943] dark:text-[#99d3b2]">
                  {rupiah(selected.price)} • Pickup: {selected.pickup_point || selected.campus || "Kampus"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-[#e6f8e8] flex items-center justify-center text-[#003622]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={reserve} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#101f15] dark:text-white mb-1">Nama Pemesan</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama lengkap kamu"
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#101f15] dark:text-white mb-1">Jumlah Pesanan</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                />
              </div>
              <label className="flex items-start gap-2.5 text-xs text-[#404943] dark:text-[#99d3b2] cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                  className="mt-0.5 rounded accent-[#134e35]"
                />
                <span>Saya setuju kontak saya diteruskan ke penyelenggara PO untuk koordinasi pickup.</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#134e35] hover:bg-[#003622] text-white text-sm font-bold shadow-md disabled:opacity-50"
              >
                {submitting ? "Memproses..." : `Konfirmasi Pesanan (${rupiah(Number(selected.price || 0) * quantity)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sukses Reservasi */}
      {success && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#112218] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ceeb7a] text-[#134e35] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h3 className="text-lg font-extrabold text-[#003622] dark:text-white">Reservasi Berhasil!</h3>
            <p className="text-xs text-[#404943] dark:text-[#99d3b2]">
              Pesanan untuk <strong>{success.productName}</strong> telah dicatat.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="w-full py-2.5 rounded-full bg-[#134e35] text-white text-sm font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
