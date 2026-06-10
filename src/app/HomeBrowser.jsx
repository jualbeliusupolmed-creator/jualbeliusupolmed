"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";

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
  heroTitle,
  heroSubtitle,
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-150/80 bg-gradient-to-br from-white via-white to-gray-50/50 px-4 py-4.5 sm:px-8 sm:py-6 dark:border-slate-900/60 dark:from-slate-900/30 dark:to-slate-950/20 dark:bg-slate-900/10">
        {/* Glow Effects */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/5 blur-2xl dark:bg-accent/5" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-gray-300/5 blur-2xl dark:bg-slate-200/5" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)]" />

        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-slate-500 sm:text-xs">
            Marketplace Kampus · USU &amp; POLMED
          </p>
          <h1 className="mt-1 max-w-3xl text-xl font-extrabold leading-[1.1] tracking-tightest text-gray-900 dark:text-white sm:mt-1.5 sm:text-3xl">
            {heroTitle || "Marketplace Mahasiswa USU & POLMED"}
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500 dark:text-slate-400 sm:mt-2 sm:text-sm">
            {heroSubtitle ||
              "Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5 sm:mt-3.5">
            <Link href="/jual" className="btn-primary px-3 py-1.5 text-xs sm:px-4 sm:py-2">
              Pasang Iklan
            </Link>
            <Link href="/dicari" className="btn-outline px-3 py-1.5 text-xs sm:px-4 sm:py-2">
              🔎 Papan Dicari
            </Link>
            <Link href="/cara-bergabung" className="btn-outline px-3 py-1.5 text-xs sm:px-4 sm:py-2">
              Cara Bergabung
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured?.length > 0 && (
        <section className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-900">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-slate-100 sm:text-sm">Iklan Unggulan</h2>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">Dipromosikan</span>
          </div>
          <div className="mt-2.5 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((f) => (
              <Link
                key={f.id}
                href={`/produk/${f.id}`}
                className="flex w-60 shrink-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition-all hover:border-gray-305 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-950">
                  {f.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">{f.title}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{rupiah(f.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}



      {/* Search + Sort Bar */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
            className="input pl-10"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value)}
          className="input w-auto min-w-[140px] cursor-pointer"
          aria-label="Urutkan"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Harga & Kampus */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPriceFilter((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            showPriceFilter || minPrice || maxPrice
              ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Icon.DollarSign className="h-4 w-4" /> Filter Harga
          {(minPrice || maxPrice) && (
            <span className="rounded-full bg-primary text-white px-1.5 py-0.5 text-[10px]">
              aktif
            </span>
          )}
        </button>

        {/* Campus Filter Segment */}
        <div className="flex bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-medium">
          {["Semua", "USU", "POLMED"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCampus(c)}
              className={`px-3 py-1 rounded-md transition-all ${
                campusFilter === c
                  ? "bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon.MapPin className="h-3 w-3 inline mr-1" /> {c === "Semua" ? "Semua" : c}
            </button>
          ))}
        </div>

        {/* Nego filter toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !negoFilter;
            setNegoFilter(next);
            applyFilters({});
            // re-trigger with updated negoFilter via useEffect workaround
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
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            negoFilter
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Icon.Handshake className="h-4 w-4" /> Nego
          {negoFilter && (
            <span className="rounded-full bg-blue-600 text-white px-1.5 py-0.5 text-[10px]">
              aktif
            </span>
          )}
        </button>
      </div>

        {showPriceFilter && (
          <div className="mt-2 card p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label text-xs">Harga Min (Rp)</label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="input w-36"
              />
            </div>
            <div>
              <label className="label text-xs">Harga Max (Rp)</label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Tidak terbatas"
                className="input w-36"
              />
            </div>
            <button onClick={handlePriceApply} className="btn-primary text-sm">
              Terapkan
            </button>
            {(minPrice || maxPrice) && (
              <button
                onClick={handlePriceClear}
                className="btn-outline text-sm text-gray-500"
              >
                Reset
              </button>
            )}
          </div>
        )}

      {/* Categories */}
      <div className="mt-4">
        <CategoryFilter active={cat} onChange={handleCat} categories={CATEGORIES} />
      </div>

      {/* Header */}
      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">
          {searching ? "Mencari…" : "Iklan Aktif"}
        </h2>
        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <button
              onClick={() => {
                setCat("all");
                setQ("");
                setSort("bumped");
                setMinPrice("");
                setMaxPrice("");
                setCampusFilter("Semua");
                setShowPriceFilter(false);
                applyFilters({ newCat: "all", newQ: "", newSort: "bumped", newMin: "", newMax: "", newCampus: "Semua" });
              }}
              className="text-xs text-primary underline"
            >
              Reset filter
            </button>
          )}
          <span className="text-sm text-gray-400">{total} barang</span>
        </div>
      </div>

      {/* Grid */}
      {searching ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse overflow-hidden bg-white dark:border-slate-800 dark:bg-slate-900/30">
              <div className="aspect-square w-full bg-gray-150 dark:bg-slate-950" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-1/4 rounded bg-gray-150 dark:bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-gray-150 dark:bg-slate-800" />
                <div className="h-4.5 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                <div className="h-3 w-1/3 rounded bg-gray-150 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card mt-4 grid place-items-center py-16 text-center text-gray-400">
          <Icon.Package className="h-12 w-12" />
          <p className="mt-2">Belum ada barang di kategori ini.</p>
          <Link href="/jual" className="btn-primary mt-4">
            Jadi yang pertama pasang iklan
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-outline px-8"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Memuat…
                  </span>
                ) : (
                  `Muat Lebih Banyak (${total - listings.length} lagi)`
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* 🔥 Paling Dilihat — di bawah listing utama */}
      {!hasActiveFilter && trending.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold text-gray-900 dark:text-slate-100 sm:text-sm flex items-center gap-1.5">
            <Icon.TrendingUp className="h-4 w-4 text-rose-500" /> Paling Dilihat
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((t, i) => (
              <Link
                key={t.id}
                href={`/produk/${t.id}`}
                className="card flex w-40 shrink-0 flex-col overflow-hidden transition-all hover:border-gray-305"
              >
                <div className="relative aspect-square bg-gray-100 dark:bg-slate-950">
                  {t.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-gray-300 dark:text-slate-700">
                      <Icon.Package className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{i + 1}
                  </span>
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold dark:text-slate-200">{t.title}</p>
                  <p className="text-xs font-bold text-accent dark:text-accent-light">{rupiah(t.price)}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                    <Icon.Eye className="h-3 w-3" /> {t.views}× dilihat
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
