"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, LoaderCircle, MapPin, Package, Search, ShoppingBag, Users } from "lucide-react";
import { rupiah } from "@/lib/fees";
import { useFocusTrap } from "@/lib/useFocusTrap";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const dialogRef = useRef(null);
  const closeReservation = useCallback(() => setSelected(null), []);

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

  useFocusTrap({
    isOpen: Boolean(selected),
    onClose: closeReservation,
    containerRef: dialogRef,
  });

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
    <div className="min-h-screen bg-[#f4faf5] pb-[calc(7rem+env(safe-area-inset-bottom))] text-slate-900 dark:bg-slate-950 dark:text-slate-100 xl:pb-8">
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <header className="flex flex-col gap-4 rounded-2xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-slate-900 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
              <Link href="/" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600">Beranda</Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Open PO</span>
            </nav>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0a2e1f] dark:text-white sm:text-3xl">
              Open PO Kampus
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
              Lihat produk pre-order yang masih menerima pesanan, periksa kuota, lalu pilih lokasi pickup yang tercantum.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Link
              href="/keranjang?tab=po"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-900/20 bg-white px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-4"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Pesanan saya</span>
            </Link>
            <Link
              href={nextPath}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#134e35] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-4"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dashboard PO</span>
            </Link>
          </div>
        </header>

        <section aria-label="Cari dan filter Open PO" className="rounded-2xl border border-emerald-950/10 bg-white p-3 dark:border-white/10 dark:bg-slate-900 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="open-po-search" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Cari batch
              </label>
              <div className="relative mt-1 flex min-h-11 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 transition-colors focus-within:border-emerald-700 focus-within:bg-white dark:border-slate-600 dark:bg-slate-800 dark:focus-within:bg-slate-800">
                <Search className="mr-2 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                <input
                  id="open-po-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari menu kuliner, jastip, merchandise, atau lokasi pickup..."
                  className="w-full min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-100 dark:placeholder:text-slate-300"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Hapus pencarian"
                    className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
            </div>

            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 sm:w-56">
              <span className="block">Kampus</span>
              <select
                value={campusFilter}
                onChange={(event) => setCampusFilter(event.target.value)}
                className="mt-1 min-h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {campuses.map((campus) => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Category Chips Bar */}
          <div role="group" aria-label="Kategori Open PO" className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3 pb-1 text-xs [scrollbar-width:none] xl:hidden dark:border-slate-800">
            {CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={active}
                  className={`min-h-11 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                    active
                      ? "min-h-11 bg-[#134e35] text-white"
                      : "min-h-11 border border-slate-300 bg-white text-slate-800 hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)] xl:items-start">
          <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block" aria-label="Kategori Open PO">
            <section className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <h2 className="mb-3 text-base font-extrabold text-slate-950 dark:text-white">Kategori PO</h2>
              <div role="group" aria-label="Pilih kategori Open PO" className="grid gap-1">
                {CATEGORIES.map((item) => {
                  const active = category === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      aria-pressed={active}
                      className={`min-h-11 cursor-pointer rounded-lg px-3 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                        active
                          ? "bg-[#134e35] text-white"
                          : "text-slate-700 hover:bg-emerald-50 active:bg-emerald-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>

          <section aria-label="Daftar Open PO" className="min-w-0 space-y-4">
            <p role="status" aria-live="polite" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filtered.length} batch ditampilkan
            </p>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-relaxed text-rose-900"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : null}
            {success ? (
              <div
                role="status"
                className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-emerald-950">
                      Reservasi berhasil dibuat
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-950">
                      Pesanan {success.productName} tercatat. Lihat progresnya di Keranjang, tab Pesanan Open PO.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {success.sellerContact ? (
                    <a
                      href={`https://wa.me/${success.sellerContact}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 text-xs font-extrabold text-white transition-colors hover:bg-emerald-950 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      Hubungi penjual
                    </a>
                  ) : null}
                  <Link
                    href="/keranjang?tab=po"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 text-xs font-extrabold text-emerald-950 transition-colors hover:bg-emerald-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Lihat progres pesanan
                  </Link>
                  <Link
                    href="/dashboard?tab=open-po"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 text-xs font-extrabold text-emerald-950 transition-colors hover:bg-emerald-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Dashboard PO
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSuccess(null)}
                    className="min-h-11 min-w-11 cursor-pointer rounded-lg px-3 text-xs font-bold text-emerald-950 transition-colors hover:bg-emerald-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : null}

        {initialError ? (
          <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center">
            <div>
              <CircleAlert className="mx-auto h-7 w-7 text-amber-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-extrabold text-slate-900">Etalase Open PO belum dapat dimuat</p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-700">Ada kendala saat mengambil daftar batch. Coba muat ulang halaman atau buka dashboard PO.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-emerald-800 px-4 text-xs font-bold text-emerald-950 transition-colors hover:bg-emerald-50 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Muat ulang
                </button>
                <Link
                  href={nextPath}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#134e35] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Dashboard PO
                </Link>
              </div>
            </div>
          </div>
        ) : filtered.length ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-3">
            {filtered.map((batch, index) => {
              const remaining = Math.max(0, batch.quota - batch.reserved);
              const reserved = Number(batch.reserved) || 0;
              const quota = Math.max(0, Number(batch.quota) || 0);
              const progress = quota ? Math.min(100, Math.round((reserved / quota) * 100)) : 0;
              return (
                <article key={batch.id} className="group grid grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-emerald-950/10 bg-white transition-colors hover:border-emerald-700/40 dark:border-white/10 dark:bg-slate-900 sm:flex sm:flex-col">
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 sm:h-44 sm:aspect-auto">
                    {batch.photo ? (
                      <img
                        src={batch.photo}
                        alt={batch.title}
                        width="640"
                        height="480"
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400 dark:text-slate-600">
                        <Package className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-[#bef264] px-2 py-1 text-[10px] font-bold text-[#0a2e1f]">
                      {batch.category}
                    </span>
                    <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-[#0a2e1f] px-2 py-1 text-[10px] font-bold text-white">
                      Sisa {remaining} slot
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-sm font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-base">{batch.title}</h2>
                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{batch.seller_name}{batch.faculty ? ` · ${batch.faculty}` : ""}</p>
                      </div>
                      <div className="shrink-0 text-right sm:text-left">
                        <p className="text-sm font-extrabold text-[#134e35] dark:text-emerald-300">{rupiah(batch.price)}</p>
                        <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300">per {batch.unit}</p>
                      </div>
                    </div>
                    {batch.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 sm:min-h-9">{batch.description}</p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 sm:min-h-9">Penjual belum menambahkan deskripsi.</p>
                    )}
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                      <p className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                        <span>{batch.campus} · {batch.pickup_point}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="h-4 w-4 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                        <span>Tutup {dateLabel(batch.closes_at)}</span>
                      </p>
                      <div>
                        <div
                          role="progressbar"
                          aria-label={`${reserved} dari ${quota} slot sudah dipesan`}
                          aria-valuemin={0}
                          aria-valuemax={Math.max(quota, 1)}
                          aria-valuenow={Math.min(reserved, quota)}
                          className="h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
                        >
                          <span className="block h-full rounded-full bg-[#134e35]" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1 text-xs tabular-nums">{reserved} dari {quota} slot dipesan</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.currentTarget.focus();
                        setSelected(batch);
                        setError("");
                        setSuccess(null);
                      }}
                      disabled={remaining < 1}
                      className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#134e35] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
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
              <p className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {initialBatches.length === 0 ? "Belum ada batch Open PO aktif" : "Belum ada batch yang cocok"}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {initialBatches.length === 0
                  ? "Batch yang menerima pesanan akan muncul di sini."
                  : campusFilter !== "Semua kampus"
                    ? `Belum ada Open PO yang cocok di kampus ${campusFilter}.`
                    : "Coba ubah kata pencarian atau pilih kategori lain."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {campusFilter !== "Semua kampus" && (
                  <button
                    type="button"
                    onClick={() => setCampusFilter("Semua kampus")}
                    className="inline-flex min-h-11 items-center rounded-lg border border-emerald-800 bg-emerald-50 px-4 text-xs font-bold text-emerald-950 transition-colors hover:bg-emerald-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
                  >
                    Tampilkan Semua Kampus
                  </button>
                )}
                <Link
                  href={nextPath}
                  className="inline-flex min-h-11 items-center rounded-lg bg-[#134e35] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Buat batch PO
                </Link>
              </div>
            </div>
          </div>
        )}
          </section>
        </div>
      </div>

      {selected ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-po-reservation-title"
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <form onSubmit={reserve} className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Reservasi Slot</p>
                <h2 id="open-po-reservation-title" className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{rupiah(selected.price)} / {selected.unit}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Tutup modal"
                className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 focus:border-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 focus:border-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
              className="mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#134e35] text-xs font-extrabold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
              {!isAuthenticated ? "Masuk untuk memesan" : submitting ? "Menyimpan reservasi…" : "Buat reservasi"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
