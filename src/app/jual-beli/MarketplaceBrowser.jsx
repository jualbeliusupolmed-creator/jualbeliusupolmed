"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import FavoriteButton from "@/components/FavoriteButton";
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
      // default: newest / bumped
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
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex-1 w-full text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* BEGIN: Real-time WTB Announcement Ticker */}
      <div className="w-full bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl px-3 py-2.5 sm:py-3 mb-6 flex items-center justify-between gap-3 border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800/60">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            WTB Ticker
          </span>
          <span className="hidden md:inline font-bold text-xs text-slate-500 uppercase tracking-wider">
            Cari Cepat:
          </span>
        </div>

        {/* WTB Marquee Viewport */}
        <div className="wtb-marquee-container flex-1 overflow-hidden relative select-none">
          <div className="wtb-marquee-track flex items-center gap-8 text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
            {/* Duplicated set for seamless infinite animation */}
            {[...WTB_TICKER_ITEMS, ...WTB_TICKER_ITEMS].map((item, idx) => (
              <Link
                key={idx}
                href="/dicari"
                className="inline-flex items-center gap-2 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.tagColor)}></span>
                <strong className="font-bold text-slate-900 dark:text-white">{item.title}</strong>
                <span className="text-slate-400 text-[11px] font-semibold">{item.meta}</span>
                <span className="text-slate-600 dark:text-slate-300">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pasang WTB CTA Action Button */}
        <Link
          href="/dicari"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full border border-slate-200 dark:border-white/10 shadow-xs transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          <span className="hidden sm:inline">Pasang WTB</span>
        </Link>
      </div>
      {/* END: Real-time WTB Announcement Ticker */}

      {/* BEGIN: Marketplace Header & Filter Controls */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Header Banner Title & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Marketplace Preloved Mahasiswa</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                Verified COD
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Jual-beli aman &amp; terverifikasi stambuk antar sesama mahasiswa USU &amp; POLMED Padang Bulan.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              {filteredListings.length} Barang Aktif Hari Ini
            </span>
          </div>
        </div>

        {/* Search Bar & Integrated Filter Hub */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent w-full text-slate-800 dark:text-slate-100 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none"
                placeholder="Cari laptop, buku kalkulus, jas lab, kemeja sidang, papan gambar, kos..."
                type="text"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-1 mr-1"
                  title="Hapus pencarian"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
              <button
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                title="Filter lanjutan"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </button>
            </div>

            {/* Selectors Group */}
            <div className="flex items-center gap-2">
              {/* Campus Selector Dropdown */}
              <div className="relative min-w-[140px] flex-1 sm:flex-none">
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 pr-8 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">Semua Kampus</option>
                  <option value="usu">Kampus USU</option>
                  <option value="polmed">Kampus POLMED</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Category Selector Dropdown */}
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 pr-8 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="laptop">Elektronik &amp; Laptop</option>
                  <option value="buku">Buku &amp; Diktat TPB</option>
                  <option value="fashion">Fashion Preloved</option>
                  <option value="lab">Alat Lab &amp; Praktikum</option>
                  <option value="kos">Perlengkapan Kos</option>
                  <option value="transportasi">Transportasi Mahasiswa</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative min-w-[150px] hidden sm:block">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 pr-8 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="newest">Urutkan: Terbaru</option>
                  <option value="price_asc">Harga: Terendah</option>
                  <option value="price_desc">Harga: Tertinggi</option>
                  <option value="verified">Prioritas Terverifikasi</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
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
                    "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all",
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

      {/* BEGIN: Campus COD Trust Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <span>Jual Beli Aman Bebas Tipu di Kampus Kita</span>
              <span className="text-[10px] font-extrabold uppercase bg-emerald-200/70 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                Zona Resmi
              </span>
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
              Bertemu langsung di titik temu resmi mahasiswa yang ramai &amp; berpenerangan:{" "}
              <strong>Pendopo USU, Pintu 1-4 Dr. Mansyur, Gazebo FIB, Kantin FEB, atau Gedung Z POLMED</strong>.
            </p>
          </div>
        </div>
        <Link
          href="/panduan-aman"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-emerald-100/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">local_police</span>
          <span>Panduan COD Mahasiswa</span>
        </Link>
      </div>
      {/* END: Campus COD Trust Banner */}

      {/* BEGIN: Products 4-Column Grid */}
      {filteredListings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <span className="material-symbols-outlined text-[32px]">inventory_2</span>
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
            Tidak ada barang yang cocok
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Coba ubah kata kunci pencarian atau ganti kategori untuk menemukan barang preloved mahasiswa.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedCampus("all");
            }}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full text-xs font-bold shadow-xs transition"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredListings.map((item) => {
            const slug = buildSlug(item.title, item.id);
            const detailUrl = `/produk/${slug}`;
            const sellerInitial = (item.seller_name || "M").charAt(0).toUpperCase();

            // WhatsApp inquiry link generator
            let waLink = detailUrl;
            if (item.seller_wa) {
              const numOnly = item.seller_wa.replace(/\D/g, "");
              const cleanWa = numOnly.startsWith("0")
                ? "62" + numOnly.slice(1)
                : numOnly.startsWith("62")
                ? numOnly
                : "62" + numOnly;
              const waText = `Halo kak ${item.seller_name || ""}, saya lihat "${item.title}" di Kampus Kita. Apakah masih tersedia?`;
              waLink = `https://wa.me/${cleanWa}?text=${encodeURIComponent(waText)}`;
            }

            const isSold = item.status === "sold";
            const condLabel = item.condition === "new" ? "Baru 100%" : item.condition || "Preloved";

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image container: 4:3 Aspect Ratio */}
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
                    {item.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Icon.Package className="w-10 h-10 text-slate-300 stroke-[1.2]" />
                        <span className="text-[10px] font-medium text-slate-400 mt-1">
                          Foto dari Penjual
                        </span>
                      </div>
                    )}

                    {/* Favorite Button in Top-Right */}
                    <FavoriteButton
                      listing={item}
                      className="!absolute !top-2 !right-2 !w-7 !h-7 !rounded-full !bg-white/90 dark:!bg-black/60 shadow-xs hover:!bg-white dark:hover:!bg-black flex items-center justify-center text-slate-400 hover:text-rose-500 z-10"
                    />

                    {/* Status Badge in Bottom-Left */}
                    {isSold ? (
                      <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white font-extrabold text-[10px] tracking-wider shadow-xs">
                        TERJUAL
                      </span>
                    ) : item.featured ? (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-800 text-white font-semibold text-[10px] flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Stambuk Terverifikasi
                      </span>
                    ) : (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-800/90 text-white font-semibold text-[10px] flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Terverifikasi COD
                      </span>
                    )}
                  </div>

                  {/* Price & Condition Badge */}
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base sm:text-lg font-extrabold text-emerald-800 dark:text-emerald-400">
                      {rupiah(item.price)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {condLabel}
                    </span>
                  </div>

                  {/* Product Title */}
                  <Link href={detailUrl}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  {/* Seller Box */}
                  <div className="flex items-center gap-2 mt-2 pt-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-white/5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 flex items-center justify-center text-xs font-bold shrink-0">
                      {sellerInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.seller_name || "Mahasiswa USU"}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {item.area || "Kampus USU"} • {item.campus === "polmed" ? "POLMED" : "USU"}
                      </p>
                    </div>
                  </div>

                  {/* COD Location */}
                  <div className="flex items-center gap-1.5 mt-2.5 text-slate-500 dark:text-slate-400 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700 dark:text-emerald-400 shrink-0">
                      location_on
                    </span>
                    <span className="truncate">
                      {item.area || "Titik COD Resmi Kampus Kita"}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons (Detail & Tanya WA) */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/10">
                  <Link
                    href={detailUrl}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs transition-colors text-center font-bold"
                  >
                    Detail
                  </Link>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs transition-colors text-center flex items-center justify-center gap-1 font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">chat</span>
                    <span>Tanya</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* END: Products 4-Column Grid */}

      {/* BEGIN: Pagination & Infinite Stream Controller */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-10">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span>
            Menampilkan <strong>{filteredListings.length}</strong> dari <strong>{totalCount}</strong> barang preloved aktif di USU &amp; POLMED
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isLoadingMore && "animate-spin"
                )}
              >
                sync
              </span>
              <span>
                {isLoadingMore
                  ? "Memuat..."
                  : `Muat Lebih Banyak Barang (${Math.max(0, totalCount - filteredListings.length)} lagi)`}
              </span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-emerald-800 text-white text-xs flex items-center justify-center font-bold">
              {page}
            </span>
          </div>
        </div>
      </div>
      {/* END: Pagination & Infinite Stream Controller */}

      {/* Floating Sticky Bar for Quick COD Inquiry in Mobile */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <Link
          href="/jual"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          <span>+ Jual Cepat</span>
        </Link>
      </div>
    </main>
  );
}
