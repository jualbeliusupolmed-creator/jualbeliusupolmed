"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, LoaderCircle, MapPin, Package, Search, ShoppingBag, Sparkles, Users } from "lucide-react";
import { rupiah } from "@/lib/fees";

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Merchandise", "Jastip", "Lainnya"];

function dateLabel(value) {
  if (!value) return "Waktu tutup belum ditentukan";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OpenPoClient({ initialBatches = [], isAuthenticated = false, initialError = "" }) {
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState("Semua kampus");
  const [category, setCategory] = useState("Semua");
  const [selected, setSelected] = useState(null);
  const [buyerName, setBuyerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_campus");
      if (saved && saved !== "Semua") {
        const match = initialBatches.find(
          (b) => String(b.campus || "").toLowerCase() === saved.toLowerCase()
        );
        if (match) {
          setCampusFilter(match.campus);
        }
      }
    } catch {}

    const onCampus = (e) => {
      if (e.detail?.campus && e.detail.campus !== "Semua") {
        setCampusFilter(e.detail.campus);
      }
    };
    window.addEventListener("campus:change", onCampus);
    return () => window.removeEventListener("campus:change", onCampus);
  }, [initialBatches]);

  const campuses = useMemo(() => ["Semua kampus", ...new Set(initialBatches.map((batch) => batch.campus).filter(Boolean))], [initialBatches]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialBatches.filter((batch) => {
      const text = `${batch.title} ${batch.name} ${batch.description} ${batch.pickup_point} ${batch.seller_name}`.toLowerCase();
      return (!needle || text.includes(needle)) && (campusFilter === "Semua kampus" || batch.campus === campusFilter) && (category === "Semua" || batch.category === category);
    });
  }, [initialBatches, query, campusFilter, category]);

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
      setSelected(null);
      setBuyerName("");
      setQuantity(1);
      setContactConsent(false);
    } catch (cause) { setError(cause.message); }
    finally { setSubmitting(false); }
  }

  const nextPath = isAuthenticated ? "/dashboard/open-po" : "/dashboard/login?next=%2Fdashboard%2Fopen-po";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Compact Minimalist Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
              <Link href="/" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600">Beranda</Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Open PO</span>
            </nav>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Open PO Kampus
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Kuliner, jastip, dan merchandise pre-order mahasiswa dengan sistem slot dan kuota transparan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/keranjang?tab=po"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-2xs"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Pesanan saya</span>
            </Link>
            <Link
              href={nextPath}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-800 px-4 text-xs font-semibold text-white hover:bg-emerald-900 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-xs"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dashboard PO</span>
            </Link>
          </div>
        </div>

        {/* Minimalist Search & Filter Hub */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-xs flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors">
              <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Cari batch Open PO"
                placeholder="Cari menu kuliner, jastip, merchandise, atau lokasi pickup..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Hapus pencarian"
                  className="text-xs text-slate-400 hover:text-slate-600 px-1 focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Campus Selector */}
            <select
              value={campusFilter}
              onChange={(event) => setCampusFilter(event.target.value)}
              aria-label="Filter Open PO berdasarkan kampus"
              className="h-10 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/70 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-600 shrink-0"
            >
              {campuses.map((campus) => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100 dark:border-slate-800 text-xs [scrollbar-width:none]">
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    active
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-rose-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</div> : null}
        {success ? <div role="status" className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"><Check className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-sm font-extrabold text-emerald-950">Reservasi berhasil dibuat</p><p className="mt-1 text-xs leading-relaxed text-emerald-900/70">Pesanan {success.productName} tercatat. Lihat progresnya di Keranjang → Pesanan Open PO.</p></div></div><div className="flex flex-wrap gap-2">{success.sellerContact ? <a href={`https://wa.me/${success.sellerContact}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white active:translate-y-px transition-colors">Hubungi penjual</a> : null}<Link href="/keranjang?tab=po" className="inline-flex min-h-9 items-center justify-center rounded-full border border-emerald-200 px-4 text-xs font-extrabold text-emerald-900 active:translate-y-px transition-colors">Lihat progres pesanan</Link><Link href="/dashboard?tab=open-po" className="inline-flex min-h-9 items-center justify-center rounded-full border border-emerald-200 px-4 text-xs font-extrabold text-emerald-900 active:translate-y-px transition-colors">Dashboard PO</Link><button type="button" onClick={() => setSuccess(null)} className="rounded-full px-3 text-xs font-bold text-emerald-700 active:translate-y-px transition-colors">Tutup</button></div></div> : null}

        {initialError ? (
          <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center">
            <div>
              <CircleAlert className="mx-auto h-7 w-7 text-amber-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-extrabold text-slate-800">Etalase PO belum siap</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">Database Open PO baru belum tersedia. Jalankan migrasi proyek ini sebelum batch dapat dipublikasikan.</p>
              <Link href={nextPath} className="mt-4 inline-flex min-h-9 items-center rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white active:translate-y-px transition-colors">Buka dashboard PO</Link>
            </div>
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 pt-1">
            {filtered.map((batch, index) => {
              const remaining = Math.max(0, batch.quota - batch.reserved);
              return (
                <article key={batch.id} className="group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xs transition-colors hover:border-emerald-700/50">
                  <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                    {batch.photo ? (
                      <img
                        src={batch.photo}
                        alt={batch.title}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400 dark:text-slate-600">
                        <Package className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 dark:bg-slate-900/95 px-3 py-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                      {batch.category}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white shadow-2xs">
                      Sisa {remaining} slot
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="line-clamp-1 text-base font-bold tracking-tight text-slate-900 dark:text-white">{batch.title}</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{batch.seller_name}{batch.faculty ? ` · ${batch.faculty}` : ""}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400">{rupiah(batch.price)}</p>
                        <p className="text-[10px] text-slate-400">/ {batch.unit}</p>
                      </div>
                    </div>
                    {batch.description ? (
                      <p className="mt-2.5 line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{batch.description}</p>
                    ) : (
                      <p className="mt-2.5 min-h-9 text-xs text-slate-400">Detail produk tersedia dari penjual.</p>
                    )}
                    <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-[10px] font-semibold text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                        <span>{batch.campus} · {batch.pickup_point}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                        <span>Tutup {dateLabel(batch.closes_at)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelected(batch); setError(""); setSuccess(null); }}
                      disabled={remaining < 1}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                      <span>Pesan slot</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
            <div>
              <ShoppingBag className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Belum ada batch yang cocok</p>
              <p className="mt-1 text-xs text-slate-400">
                {campusFilter !== "Semua kampus" ? `Belum ada Open PO di kampus ${campusFilter}.` : "Coba ubah kata pencarian atau filter kategori."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {campusFilter !== "Semua kampus" && (
                  <button
                    type="button"
                    onClick={() => setCampusFilter("Semua kampus")}
                    className="inline-flex min-h-9 items-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                  >
                    Tampilkan Semua Kampus
                  </button>
                )}
                <Link
                  href={nextPath}
                  className="inline-flex min-h-9 items-center rounded-full bg-emerald-800 px-4 text-xs font-bold text-white hover:bg-emerald-900 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  Buat batch PO
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <form onSubmit={reserve} className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-lg sm:p-6 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Reservasi Slot</p>
                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{rupiah(selected.price)} / {selected.unit}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Tutup modal"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-px transition-colors"
              >
                ✕
              </button>
            </div>
            {!isAuthenticated ? (
              <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                Masuk dengan akun JB untuk memesan. Akun marketplace yang sama digunakan untuk semua aktivitas.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Nama pemesan
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm outline-none focus:border-emerald-600"
                    placeholder="Nama yang dapat dikenali penjual"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Jumlah
                  <input
                    required
                    type="number"
                    min="1"
                    max={Math.max(1, selected.quota - selected.reserved)}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
                <p className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total: {rupiah(selected.price * quantity)}
                </p>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-[11px] leading-relaxed text-emerald-950 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-900/40">
                  <input
                    required
                    type="checkbox"
                    checked={contactConsent}
                    onChange={(event) => setContactConsent(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700"
                  />
                  <span>Saya setuju nomor WhatsApp akun JB saya dibagikan kepada penjual untuk kebutuhan reservasi ini.</span>
                </label>
              </div>
            )}
            {error ? <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 text-xs font-extrabold text-white hover:bg-emerald-900 active:translate-y-px transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
              {!isAuthenticated ? "Masuk untuk memesan" : submitting ? "Menyimpan reservasi…" : "Buat reservasi"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
