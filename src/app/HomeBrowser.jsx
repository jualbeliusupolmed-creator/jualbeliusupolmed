"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  // Filter state
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("bumped");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [campusFilter, setCampusFilter] = useState("Semua");
  const [negoFilter, setNegoFilter] = useState(false);

  // Pagination state
  const [listings, setListings] = useState(initialListings || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);

  const catName = (slug) => CATEGORIES.find((c) => c.slug === slug)?.name || null;

  // Terapkan filter dari URL (?q= dari search navbar / SearchAction Google,
  // ?cat= dari breadcrumb halaman produk) — juga saat URL berubah tanpa remount.
  const searchParams = useSearchParams();
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
        if (negoFilter) params.set("nego", "1");

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
    [cat, q, sort, minPrice, maxPrice, campusFilter]
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
    }, 400);
  }, [applyFilters]);

  function handleCat(newCat) {
    setCat(newCat);
    applyFilters({ newCat });
  }

  function handleSort(newSort) {
    setSort(newSort);
    applyFilters({ newSort });
  }

  function handlePriceApply() {
    applyFilters({});
  }

  function handlePriceClear() {
    setMinPrice("");
    setMaxPrice("");
    applyFilters({ newMin: "", newMax: "" });
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
          <section key="hero" className="pb-6 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">
              Marketplace Kampus · USU &amp; POLMED
            </p>
            <h1 className="mt-2 text-[1.65rem] font-extrabold leading-[1.2] tracking-tight text-gray-900 dark:text-white">
              {heroTitle || "Jual Beli Mahasiswa USU & POLMED"}
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-slate-400">
              {heroSubtitle || "Laptop, buku, kos, fashion & lebih. Aman, cepat, dibantu admin."}
            </p>

            {/* CTAs — single row, pill style */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/jual"
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 active:scale-95 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                + Pasang Iklan
              </Link>
              <Link
                href="/dicari"
                className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:scale-95 dark:border-slate-800 dark:bg-transparent dark:text-slate-200"
              >
                Papan Dicari
              </Link>
              <Link
                href="/cara-bergabung"
                className="px-2 py-2 text-sm text-gray-400 transition hover:text-gray-700 dark:hover:text-slate-200"
              >
                Info
              </Link>
            </div>

            {/* Stats — clean number blocks */}
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
                <div className="mt-5 flex gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {proof.map((p) => (
                    <div key={p.l} className="shrink-0">
                      <div className="text-lg font-extrabold text-gray-900 dark:text-white">{p.v}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500">{p.l}</div>
                    </div>
                  ))}
                </div>
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt={f.title} loading="lazy" className="h-full w-full object-cover" />
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  showPriceFilter || minPrice || maxPrice
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
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    campusFilter === c
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
                  setTimeout(() => {
                    const params = new URLSearchParams({ page: 1, limit: PAGE_SIZE, sort });
                    if (cat !== "all") params.set("cat", catName(cat) || cat);
                    if (q) params.set("q", q);
                    if (minPrice) params.set("minPrice", minPrice);
                    if (maxPrice) params.set("maxPrice", maxPrice);
                    if (campusFilter && campusFilter !== "Semua") params.set("campus", campusFilter);
                    if (next) params.set("nego", "1");
                    fetch(`/api/listings/browse?${params}`)
                      .then((r) => r.json())
                      .then((data) => {
                        setListings(data.listings || []);
                        setTotal(data.total || 0);
                      })
                      .catch(() => {});
                  }, 0);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  negoFilter
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
                  onClick={() => {
                    setCat("all");
                    setQ("");
                    setSort("bumped");
                    setMinPrice("");
                    setMaxPrice("");
                    setCampusFilter("Semua");
                    setNegoFilter(false);
                    setShowPriceFilter(false);
                    applyFilters({ newCat: "all", newQ: "", newSort: "bumped", newMin: "", newMax: "", newCampus: "Semua" });
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
            <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
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
              <div className="mt-4 flex flex-col items-center justify-center py-16 text-center">
                <Icon.Package className="h-10 w-10 text-gray-300 dark:text-slate-700" />
                <p className="mt-2 text-sm text-gray-400">Belum ada barang di sini.</p>
                <Link
                  href="/jual"
                  className="mt-4 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900"
                >
                  Pasang Iklan Pertama
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image_url} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
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
    <main className="mx-auto max-w-6xl px-4 py-6">
      {order.map(renderSection)}
    </main>
  );
}
