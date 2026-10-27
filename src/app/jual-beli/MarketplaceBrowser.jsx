"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import FavoriteButton from "@/components/FavoriteButton";
import ProductCard from "@/components/ProductCard";
import { Icon } from "@/components/Icons";
import { cn } from "@/lib/utils";

// Mock ticker items as defined in desktop marketplace blueprint
const WTB_TICKER_ITEMS = [
  {
    title: "Kalkulator Casio fx-991EX",
    meta: "[Teknik Sipil '23]",
    desc: "Max 250rb COD FT",
    tagColor: "bg-emerald-600",
  },
  {
    title: "Buku Purcell Kalkulus Edisi 9",
    meta: "[MIPA USU]",
    desc: "Butuh cepat sebelum kuis",
    tagColor: "bg-amber-500",
  },
  {
    title: "Papan Gambar Segitiga A3 Rotring",
    meta: "[Arsitektur POLMED]",
    desc: "Budget 150k",
    tagColor: "bg-emerald-800",
  },
  {
    title: "Jas Lab Kimia Ukuran L / XL",
    meta: "[Farmasi USU]",
    desc: "Siap ambil di Pendopo",
    tagColor: "bg-teal-600",
  },
];

const QUICK_CATEGORIES = [
  { id: "all", label: "Semua", filterVal: "all" },
  { id: "elektronik", label: "💻 Elektronik", filterVal: "laptop" },
  { id: "buku", label: "📚 Buku & Modul", filterVal: "buku" },
  { id: "lab", label: "🥼 Jas Lab & Alat", filterVal: "lab" },
  { id: "fashion", label: "👔 Kemeja & Formal", filterVal: "fashion" },
  { id: "transportasi", label: "🚲 Transportasi", filterVal: "transportasi" },
  { id: "kos", label: "🛏️ Kos & Furniture", filterVal: "kos" },
];

export default function MarketplaceBrowser({
  initialListings = [],
  initialTotal = 0,
  categories = [],
  stats = { wanted: 0, sold: 0, sellers: 0 },
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State filtering & search
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCampus, setSelectedCampus] = useState(
    searchParams.get("campus") || "all"
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("cat") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");

  // Pagination state
  const [listings, setListings] = useState(initialListings);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialListings.length < initialTotal);

  // Sync state if initialListings updates
  useEffect(() => {
    setListings(initialListings);
    setTotalCount(initialTotal);
    setHasMore(initialListings.length < initialTotal);
  }, [initialListings, initialTotal]);

  // Client-side quick filter & sort over current listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.area?.toLowerCase().includes(q) ||
          item.seller_name?.toLowerCase().includes(q)
      );
    }

    if (selectedCampus !== "all") {
      result = result.filter((item) => {
        const itemCampus = (item.campus || "").toLowerCase();
        if (selectedCampus === "usu") {
          return itemCampus.includes("usu") || itemCampus === "" || itemCampus === "semua";
        }
        if (selectedCampus === "polmed") {
          return itemCampus.includes("polmed") || itemCampus === "semua";
        }
        return true;
      });
    }

    if (selectedCategory !== "all") {
      result = result.filter((item) => {
        const itemCat = (item.category || "").toLowerCase();
        if (selectedCategory === "laptop" || selectedCategory === "elektronik") {
          return itemCat.includes("laptop") || itemCat.includes("elektronik") || itemCat.includes("hp");
        }
        if (selectedCategory === "buku") {
          return itemCat.includes("buku") || itemCat.includes("diktat") || itemCat.includes("modul");
        }
        if (selectedCategory === "fashion") {
          return itemCat.includes("fashion") || itemCat.includes("pakaian") || itemCat.includes("baju") || itemCat.includes("kemeja");
        }
        if (selectedCategory === "lab") {
          return itemCat.includes("lab") || itemCat.includes("praktikum") || itemCat.includes("alat");
        }
        if (selectedCategory === "kos") {
          return itemCat.includes("kos") || itemCat.includes("furniture") || itemCat.includes("kamar");
        }
        if (selectedCategory === "transportasi") {
          return itemCat.includes("transport") || itemCat.includes("motor") || itemCat.includes("sepeda") || itemCat.includes("helm");
        }
        return itemCat.includes(selectedCategory.toLowerCase());
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "verified") {
        const aVer = a.featured || (a.seller_name && !a.seller_name.startsWith("User"));
        const bVer = b.featured || (b.seller_name && !b.seller_name.startsWith("User"));
        if (aVer && !bVer) return -1;
        if (!aVer && bVer) return 1;
        return new Date(b.bumped_at || b.created_at) - new Date(a.bumped_at || a.created_at);
      }
      return new Date(b.bumped_at || b.created_at) - new Date(a.bumped_at || a.created_at);
    });

    return result;
  }, [listings, searchQuery, selectedCampus, selectedCategory, sortBy]);

  // Load more pagination function
  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", "12");
      if (selectedCategory !== "all") params.set("cat", selectedCategory);
      if (selectedCampus !== "all") params.set("campus", selectedCampus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (sortBy !== "newest") params.set("sort", sortBy);

      const res = await fetch(`/api/listings/browse?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.listings || [];
        setListings((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const filtered = newItems.filter((item) => !ids.has(item.id));
          return [...prev, ...filtered];
        });
        setPage(nextPage);
        setTotalCount(data.total || totalCount);
        if (newItems.length < 12 || listings.length + newItems.length >= (data.total || totalCount)) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Gagal memuat barang berikutnya:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Quick category select handler
  function handleQuickCategory(catVal) {
    setSelectedCategory(catVal);
  }

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 pb-24 md:pb-6 flex-1 w-full text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* BEGIN: Real-time WTB Announcement Ticker (Ultra Compact & Padat) */}
      <div className="w-full bg-slate-100/90 dark:bg-slate-800/60 rounded-xl px-2.5 py-1.5 mb-2.5 flex items-center justify-between gap-2 border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] border border-amber-200 dark:border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
            WTB
          </span>
          <span className="hidden sm:inline font-bold text-[10px] text-slate-500 uppercase tracking-wider">
            Cari Cepat:
          </span>
        </div>

        {/* WTB Marquee Viewport */}
        <div className="wtb-marquee-container flex-1 overflow-hidden relative select-none">
          <div className="wtb-marquee-track flex items-center gap-5 text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
            {[...WTB_TICKER_ITEMS, ...WTB_TICKER_ITEMS].map((item, idx) => (
              <Link
                key={idx}
                href="/dicari"
                className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.tagColor)}></span>
                <strong className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</strong>
                <span className="text-slate-400 text-[10px] font-semibold">{item.meta}</span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pasang WTB CTA Action Button */}
        <Link
          href="/dicari"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full border border-slate-200 dark:border-white/10 shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span className="hidden xs:inline">Pasang</span>
        </Link>
      </div>
      {/* END: Real-time WTB Announcement Ticker */}

      {/* BEGIN: Marketplace Header & Filter Controls (Ultra Rapat) */}
      <div className="flex flex-col gap-2 mb-3">
        {/* Header Banner Title & Counter (1 Baris Ringkas & Efisien) */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Marketplace Preloved
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-full shrink-0">
                Verified COD
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Jual-beli aman mahasiswa USU &amp; POLMED Padang Bulan.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] sm:text-xs border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {filteredListings.length} Barang Aktif
            </span>
          </div>
        </div>

        {/* Search Bar & Integrated Filter Hub (Sangat Rapat) */}
        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-slate-400 mr-1.5 text-[17px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent w-full text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-400 focus:outline-none"
                placeholder="Cari laptop, buku kalkulus, jas lab, kemeja, kos..."
                type="text"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                  className="min-h-10 min-w-10 text-slate-400 hover:text-slate-600"
                  title="Hapus pencarian"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Selectors Group */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
              {/* Campus Selector Dropdown */}
              <div className="relative flex-1 sm:w-32">
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 pr-6 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">Semua Kampus</option>
                  <option value="usu">Kampus USU</option>
                  <option value="polmed">POLMED</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Category Selector Dropdown */}
              <div className="relative flex-1 sm:w-36">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 pr-6 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="laptop">Elektronik &amp; Laptop</option>
                  <option value="buku">Buku &amp; Diktat TPB</option>
                  <option value="fashion">Fashion Preloved</option>
                  <option value="lab">Alat Lab &amp; Praktikum</option>
                  <option value="kos">Perlengkapan Kos</option>
                  <option value="transportasi">Transportasi</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative hidden sm:block sm:w-36">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 pr-6 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="newest">Urut: Terbaru</option>
                  <option value="price_asc">Harga: Terendah</option>
                  <option value="price_desc">Harga: Tertinggi</option>
                  <option value="verified">Prioritas Verifikasi</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100 dark:border-white/5 text-xs">
            {QUICK_CATEGORIES.map((chip) => {
              const active = selectedCategory === chip.filterVal;
              return (
                <button
                  key={chip.id}
                  onClick={() => handleQuickCategory(chip.filterVal)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all",
                    active
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* END: Marketplace Header & Filter Controls */}

      {/* BEGIN: Products 2-Column Mobile & 4-Column Desktop Grid (Mantap & Kokoh) */}
      {filteredListings.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5 text-slate-400">
            <span className="material-symbols-outlined text-[28px]">inventory_2</span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Tidak ada barang yang cocok
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
            Coba ubah kata kunci pencarian atau ganti kategori untuk menemukan barang preloved mahasiswa.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedCampus("all");
            }}
            className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full text-xs font-bold shadow-xs transition"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3.5 mb-6">
          {filteredListings.map((item) => (
            <ProductCard key={item.id} listing={item} />
          ))}
        </div>
      )}
      {/* END: Products Grid */}

      {/* BEGIN: Pagination & Infinite Stream Controller (Padat) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-8">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>
            Menampilkan <strong>{filteredListings.length}</strong> dari <strong>{totalCount}</strong> barang preloved aktif di USU &amp; POLMED
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[16px]",
                  isLoadingMore && "animate-spin"
                )}
              >
                sync
              </span>
              <span>
                {isLoadingMore
                  ? "Memuat..."
                  : `Muat Lebih Banyak (${Math.max(0, totalCount - filteredListings.length)} lagi)`}
              </span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-1">
            <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white text-xs flex items-center justify-center font-bold">
              {page}
            </span>
          </div>
        </div>
      </div>
      {/* END: Pagination & Infinite Stream Controller */}

      {/* Floating Sticky Bar for Quick COD Inquiry in Mobile - Elevated above mobile nav dock */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3.5 z-40 md:hidden">
        <Link
          href="/jual"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white font-bold text-xs rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all border border-emerald-700/60"
        >
          <span className="material-symbols-outlined text-[17px]">add_shopping_cart</span>
          <span>+ Jual Cepat</span>
        </Link>
      </div>
    </main>
  );
}
