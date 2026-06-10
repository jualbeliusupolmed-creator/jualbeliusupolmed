"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";

const SORT_OPTIONS = [
  { value: "bumped", label: "Paling Relevan" },
  { value: "newest", label: "Terbaru" },
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
    } = {}) => {
      setSearching(true);
      setPage(1);
      try {
        const params = new URLSearchParams({ page: 1, limit: PAGE_SIZE, sort: newSort });
        if (newCat !== "all") params.set("cat", catName(newCat) || newCat);
        if (newQ) params.set("q", newQ);
        if (newMin) params.set("minPrice", newMin);
        if (newMax) params.set("maxPrice", newMax);

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
    [cat, q, sort, minPrice, maxPrice]
  );

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
    cat !== "all" || q || sort !== "bumped" || minPrice || maxPrice;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Featured banner */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white sm:p-10">
        <h1 className="text-2xl font-extrabold sm:text-4xl">
          {heroTitle || "Marketplace Mahasiswa USU & POLMED"}
        </h1>
        <p className="mt-2 max-w-xl text-white/80">
          {heroSubtitle ||
            "Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/jual" className="btn bg-white text-primary hover:bg-white/90">
            + Pasang Iklan
          </Link>
          <Link
            href="/cara-bergabung"
            className="btn bg-white/15 text-white hover:bg-white/25"
          >
            Cara Bergabung
          </Link>
        </div>

        {featured?.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-white/80">⭐ Iklan Unggulan</p>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featured.map((f) => (
                <Link
                  key={f.id}
                  href={`/produk/${f.id}`}
                  className="flex w-44 shrink-0 gap-2 rounded-xl bg-white/10 p-2 hover:bg-white/20"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/20">
                    {f.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{f.title}</p>
                    <p className="text-xs text-white/80">{rupiah(f.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 🔥 Paling Dilihat — disembunyikan saat sedang memfilter */}
      {!hasActiveFilter && trending.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">🔥 Paling Dilihat</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((t, i) => (
              <Link
                key={t.id}
                href={`/produk/${t.id}`}
                className="card flex w-40 shrink-0 flex-col overflow-hidden hover:border-primary/30 hover:shadow-md transition"
              >
                <div className="relative aspect-square bg-gray-100">
                  {t.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl">📦</div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{i + 1}
                  </span>
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold">{t.title}</p>
                  <p className="text-xs font-bold text-primary">{rupiah(t.price)}</p>
                  <p className="text-[10px] text-gray-400">👁️ {t.views}× dilihat</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search + Sort Bar */}
      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari barang… (laptop, buku, kos)"
            className="input pl-9"
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

      {/* Filter Harga */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowPriceFilter((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            showPriceFilter || minPrice || maxPrice
              ? "bg-primary/10 text-primary"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          💰 Filter Harga
          {(minPrice || maxPrice) && (
            <span className="rounded-full bg-primary text-white px-1.5 py-0.5 text-[10px]">
              aktif
            </span>
          )}
        </button>

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
      </div>

      {/* Categories */}
      <div className="mt-4">
        <CategoryFilter active={cat} onChange={handleCat} categories={CATEGORIES} />
      </div>

      {/* Header */}
      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
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
                setShowPriceFilter(false);
                applyFilters({ newCat: "all", newQ: "", newSort: "bumped", newMin: "", newMax: "" });
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
            <div key={i} className="card animate-pulse aspect-[3/4] bg-gray-100" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card mt-4 grid place-items-center py-16 text-center text-gray-400">
          <p className="text-4xl">🪹</p>
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
    </div>
  );
}
