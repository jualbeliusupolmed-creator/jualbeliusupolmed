"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { CATEGORIES as DEFAULT_CATEGORIES, POPULAR_AREAS } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import { buildSlug } from "@/lib/slug";

const SORT_OPTIONS = [
  { value: "bumped", label: "Paling Relevan" },
  { value: "newest", label: "Terbaru" },
  { value: "views", label: "Paling Populer" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
];

const PAGE_SIZE = 20;

export default function HomeBrowser({
  initialListings,
  initialTotal,
  featured,
  trending = [],
  categories,
  stats = null,
  heroTitle,
  heroSubtitle,
  layoutOrder = ["hero", "featured", "main"],
}) {
  const CATEGORIES =
    categories && categories.length ? categories : DEFAULT_CATEGORIES;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filter state from URL params for shareable links
  const [cat, setCat] = useState(() => {
    const urlCat = searchParams.get("cat");
    return CATEGORIES.find((c) => c.name === urlCat || c.slug === urlCat)?.slug || "all";
  });
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "bumped");
  const [minPrice, setMinPrice] = useState(() => searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("maxPrice") || "");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [campusFilter, setCampusFilter] = useState(() => searchParams.get("campus") || "Semua");
  const [negoFilter, setNegoFilter] = useState(() => searchParams.get("nego") === "1");

  // Pagination state
  const [listings, setListings] = useState(initialListings || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);

  // PWA Install prompt state
  const [pwaReady, setPwaReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sudah ada prompt yang disimpan di InstallPrompt.jsx (mungkin sudah fired sebelumnya)
    if (window.pwaDeferredPrompt) setPwaReady(true);

    const onPrompt = () => setPwaReady(true);
    const onInstalled = () => setPwaReady(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handlePwaInstall(e) {
    e.preventDefault();
    const prompt = window.pwaDeferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      window.pwaDeferredPrompt = null;
      setPwaReady(false);
    }
  }

  const catName = (slug) => CATEGORIES.find((c) => c.slug === slug)?.name || null;

  // Sync filter state to URL for shareable links
  function syncToUrl(overrides = {}) {
    const params = new URLSearchParams();
    const state = {
      cat,
      q,
      sort,
      minPrice,
      maxPrice,
      campusFilter,
      negoFilter,
      ...overrides,
    };
    if (state.q) params.set("q", state.q);
    if (state.cat && state.cat !== "all") {
      params.set("cat", catName(state.cat) || state.cat);
    }
    if (state.sort && state.sort !== "bumped") params.set("sort", state.sort);
    if (state.minPrice) params.set("minPrice", state.minPrice);
    if (state.maxPrice) params.set("maxPrice", state.maxPrice);
    if (state.campusFilter && state.campusFilter !== "Semua") params.set("campus", state.campusFilter);
    if (state.negoFilter) params.set("nego", "1");
    const str = params.toString();
    router.replace(`${pathname}${str ? `?${str}` : ""}`, { scroll: false });
  }

  // Terapkan filter dari URL (?q= dari search navbar / SearchAction Google,
  // ?cat= dari breadcrumb halaman produk) — juga saat URL berubah tanpa remount.
  useEffect(() => {
    const urlQ = searchParams.get("q");
    const urlCat = searchParams.get("cat");
    const catSlug = urlCat
      ? CATEGORIES.find((c) => c.name === urlCat || c.slug === urlCat)?.slug || null
      : null;
    if (urlQ === null && !catSlug) return;
    if (urlQ !== null) setQ(urlQ);
    if (catSlug) setCat(catSlug);
    applyFilters({
      ...(urlQ !== null ? { newQ: urlQ } : {}),
      ...(catSlug ? { newCat: catSlug } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Saat filter berubah, fetch ulang dari page 1
  const applyFilters = useCallback(
    async ({
      newCat = cat,
      newQ = q,
      newSort = sort,
      newMin = minPrice,
      newMax = maxPrice,
      newCampus = campusFilter,
      newNego = negoFilter, // FIXED: pass negoFilter as explicit param (was stale in closure)
    } = {}) => {
      setSearching(true);
      setPage(1);
      try {
        const params = new URLSearchParams({ page: 1, limit: PAGE_SIZE, sort: newSort });
        if (newCat !== "all") params.set("cat", catName(newCat) || newCat);
        if (newQ) params.set("q", newQ);
        if (newMin) params.set("minPrice", newMin);
        if (newMax) params.set("maxPrice", newMax);
        if (newCampus && newCampus !== "Semua") params.set("campus", newCampus);
        if (newNego) params.set("nego", "1"); // FIXED: use newNego param, not stale closure

        const res = await fetch(`/api/listings/browse?${params}`);
        const data = await res.json();
        setListings(data.listings || []);
        setTotal(data.total || 0);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    },
    // FIXED: added negoFilter to dependency array
    [cat, q, sort, minPrice, maxPrice, campusFilter, negoFilter]
  );

  function handleCampus(newCampus) {
    setCampusFilter(newCampus);
    applyFilters({ newCampus });
  }

  // Debounce search
  const handleSearch = useCallback((val) => {
    setQ(val);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      applyFilters({ newQ: val });
      syncToUrl({ q: val });
    }, 400);
  }, [applyFilters]);

  function handleCat(newCat) {
    setCat(newCat);
    applyFilters({ newCat });
    syncToUrl({ cat: newCat });
  }

  function handleSort(newSort) {
    setSort(newSort);
    applyFilters({ newSort });
    syncToUrl({ sort: newSort });
  }

  function handlePriceApply() {
    applyFilters({});
    syncToUrl({});
  }

  function handlePriceClear() {
    setMinPrice("");
    setMaxPrice("");
    applyFilters({ newMin: "", newMax: "" });
    syncToUrl({ minPrice: "", maxPrice: "" });
  }

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({ page: nextPage, limit: PAGE_SIZE, sort });
      if (cat !== "all") params.set("cat", catName(cat) || cat);
      if (q) params.set("q", q);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (campusFilter && campusFilter !== "Semua") params.set("campus", campusFilter);
      if (negoFilter) params.set("nego", "1");

      const res = await fetch(`/api/listings/browse?${params}`);
      const data = await res.json();
      setListings((prev) => [...prev, ...(data.listings || [])]);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = listings.length < total;
  const hasActiveFilter =
    cat !== "all" || q || sort !== "bumped" || minPrice || maxPrice || campusFilter !== "Semua" || negoFilter;

  const order = layoutOrder && layoutOrder.length > 0 ? layoutOrder : ["hero", "featured", "main"];

  const renderSection = (key) => {
    switch (key) {
      case "hero":
        return (
          <section key="hero" className="pb-5 pt-0">
            <h1 className="whitespace-nowrap text-xs font-extrabold uppercase tracking-widest text-gray-900 dark:text-white">
              Marketplace Kampus · USU &amp; POLMED
            </h1>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400 truncate">
              Jual-beli laptop, buku, kos & jasa. Aman, cepat, dibantu admin.
            </p>

            {/* CTAs — single row, pill style */}
            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/jual"
                className="whitespace-nowrap rounded-full bg-gray-900 px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-gray-700 active:scale-95 dark:bg-white dark:text-gray-900"
              >
                + Pasang Iklan
              </Link>
              <Link
                href="/dicari"
                className="whitespace-nowrap rounded-full border border-gray-200 px-3.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-slate-800 dark:text-slate-400"
              >
                Papan Dicari
              </Link>
              <button
                onClick={pwaReady ? handlePwaInstall : undefined}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 px-3.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-slate-800 dark:text-slate-400"
                title="Install Aplikasi"
              >
                <Icon.Download className="h-3 w-3" />
                Install
              </button>
            </div>

            {/* Stats — inline compact */}
            {(() => {
              const proof = [
                total > 0 && { v: total, l: "iklan" },
                stats?.sellers > 1 && { v: stats.sellers, l: "penjual" },
                stats?.wanted > 0 && { v: stats.wanted, l: "dicari" },
                stats?.sold > 0 && { v: stats.sold, l: "terjual" },
                { v: POPULAR_AREAS.length, l: "lokasi COD" },
              ].filter(Boolean);
              if (!proof.length) return null;
              return (
                <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-500">
                  {proof.map((p, i) => (
                    <span key={p.l}>
                      {i > 0 && <span className="mx-1.5">·</span>}
                      <span className="font-bold text-gray-600 dark:text-slate-300">{p.v}</span>
                      {" "}{p.l}
                    </span>
                  ))}
                </p>
              );
            })()}
          </section>
        );

      case "featured":
        if (!featured?.length) return null;
        return (
          <section key="featured" className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Unggulan</h2>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">Dipromosikan</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featured.map((f) => (
                <Link
                  key={f.id}
                  href={`/produk/${buildSlug(f.title, f.id)}`}
                  className="flex w-52 shrink-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 transition hover:border-gray-200 hover:bg-gray-50 dark:border-slate-800/70 dark:bg-slate-900/40 dark:hover:border-slate-700"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-slate-800">
                    {f.image_url && (
                      <Image src={f.image_url} alt={f.title} width={48} height={48} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-slate-200">{f.title}</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{rupiah(f.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "main":
        return (
          <div key="main">
            {/* Search bar — pill shaped */}
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari barang… laptop, buku, kos"
                className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/5 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-slate-600"
              />
            </div>

            {/* Filter chips — single horizontal scroll */}
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value)}
                aria-label="Urutkan"
                className="shrink-0 cursor-pointer appearance-none rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 outline-none transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Price */}
              <button
                type="button"
                onClick={() => setShowPriceFilter((v) => !v)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${showPriceFilter || minPrice || maxPrice
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
              >
                Harga{minPrice || maxPrice ? " ✓" : ""}
              </button>

              {/* Campus */}
              {["Semua", "USU", "POLMED"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCampus(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${campusFilter === c
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                    }`}
                >
                  {c}
                </button>
              ))}

              {/* Nego */}
              <button
                type="button"
                onClick={() => {
                  const next = !negoFilter;
                  setNegoFilter(next);
                  // FIXED: use applyFilters with explicit newNego param
                  applyFilters({ newNego: next });
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${negoFilter
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
              >
                Nego{negoFilter ? " ✓" : ""}
              </button>

              {/* Reset */}
              {hasActiveFilter && (
                <button
                  type="button"
                  aria-label="Reset semua filter"
                  onClick={() => {
                    setCat("all");
                    setQ("");
                    setSort("bumped");
                    setMinPrice("");
                    setMaxPrice("");
                    setCampusFilter("Semua");
                    setNegoFilter(false);
                    setShowPriceFilter(false);
                    applyFilters({ newCat: "all", newQ: "", newSort: "bumped", newMin: "", newMax: "", newCampus: "Semua", newNego: false });
                    syncToUrl({ cat: "all", q: "", sort: "bumped", minPrice: "", maxPrice: "", campusFilter: "Semua", negoFilter: false });
                  }}
                  className="shrink-0 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                >
                  × Reset
                </button>
              )}
            </div>

            {/* Price filter panel */}
            {showPriceFilter && (
              <div className="mt-2 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div>
                  <label className="label text-xs">Min (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="input w-28 text-sm"
                  />
                </div>
                <div>
                  <label className="label text-xs">Max (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="∞"
                    className="input w-28 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePriceApply}
                    className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-900"
                  >
                    Terapkan
                  </button>
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={handlePriceClear}
                      className="rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-slate-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="mt-3">
              <CategoryFilter active={cat} onChange={handleCat} categories={CATEGORIES} />
            </div>

            {/* Count */}
            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              {searching ? "Mencari…" : `${total} iklan`}
            </p>

            {/* Grid */}
            {searching ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card animate-pulse overflow-hidden bg-white dark:border-slate-800 dark:bg-slate-900/30">
                    <div className="aspect-square w-full bg-gray-100 dark:bg-slate-950" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-slate-800" />
                      <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-slate-800" />
                      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="mt-8 mb-12 flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border border-gray-100 dark:border-slate-800/60">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-32 h-32 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"></div>
                  <svg className="w-32 h-32 text-gray-300 dark:text-slate-700 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Belum ada barang di kategori ini</h3>
                <p className="max-w-md text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Jadilah yang pertama menawarkan produkmu di sini! Ribuan mahasiswa USU dan POLMED sedang mencari barang incaran mereka.
                </p>
                <Link
                  href="/jual"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-4 px-8 font-bold text-white bg-primary hover:bg-primary-dark transition-all duration-300 active:scale-95 shadow-lg shadow-primary/30"
                >
                  <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                  <span className="relative flex items-center gap-2">
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Pasang Iklan Sekarang
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {listings.map((l) => (
                    <ProductCard key={l.id} listing={l} />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full border border-gray-200 px-8 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                          Memuat…
                        </span>
                      ) : (
                        `Muat lebih banyak (${total - listings.length} lagi)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Paling Dilihat */}
            {!hasActiveFilter && trending.length > 0 && (
              <section className="mt-8 border-t border-gray-100 pt-6 dark:border-slate-900/60">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <Icon.TrendingUp className="h-3.5 w-3.5 text-rose-400" /> Paling Dilihat
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {trending.map((t, i) => (
                    <Link
                      key={t.id}
                      href={`/produk/${buildSlug(t.title, t.id)}`}
                      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80 transition hover:border-gray-200 dark:border-slate-800/70 dark:bg-slate-900/40 dark:hover:border-slate-700"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-slate-950">
                        {t.image_url ? (
                          <Image src={t.image_url} alt={t.title} width={144} height={144} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-gray-300 dark:text-slate-700">
                            <Icon.Package className="h-8 w-8" />
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          #{i + 1}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-xs font-semibold dark:text-slate-200">{t.title}</p>
                        <p className="text-xs font-bold text-accent dark:text-accent-light">{rupiah(t.price)}</p>
                        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                          <Icon.Eye className="h-3 w-3" /> {t.views}×
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pt-3 pb-6">
      {order.map(renderSection)}
    </main>
  );
}
