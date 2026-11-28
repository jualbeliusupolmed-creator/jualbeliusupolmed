"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { toggleCartItem } from "@/lib/cart";
import { openWhatsAppContact } from "@/lib/openWhatsAppContact";
import { useSesi } from "@/components/SesiProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Semua", icon: "apps" },
  { label: "Buku & Referensi", match: ["buku", "modul", "referensi", "atk"], icon: "menu_book" },
  { label: "Elektronik", match: ["elektronik", "laptop", "gadget", "hp"], icon: "devices" },
  { label: "Perlengkapan Kuliah", match: ["perlengkapan", "tas", "kuliah", "alat"], icon: "school" },
  { label: "Fashion", match: ["fashion", "baju", "celana", "jaket", "sepatu"], icon: "checkroom" },
  { label: "Konsumsi", match: ["makanan", "minuman", "snack", "konsumsi", "kuliner"], icon: "bakery_dining" },
  { label: "Kebutuhan Harian", match: ["kos", "harian", "kamar", "perabot"], icon: "shopping_basket" },
  { label: "Lainnya", match: ["lainnya", "jasa"], icon: "more_horiz" },
];

function getWantedIcon(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("buku") || value.includes("referensi")) return "auto_stories";
  if (value.includes("elektronik") || value.includes("laptop")) return "devices";
  if (value.includes("kalkulator")) return "calculate";
  return "manage_search";
}

function formatWantedTime(value) {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return "Tanggal tidak tersedia";
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60_000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function formatCondition(cond) {
  const c = String(cond || "").toLowerCase();
  if (c === "new" || c === "baru") return { label: "Baru", isNew: true };
  return { label: "Preloved", isNew: false };
}

function getListingImage(item) {
  if (Array.isArray(item?.images) && item.images.length > 0 && item.images[0]) return item.images[0];
  if (item?.image_url) return item.image_url;
  return null;
}

export default function SuperAppHome({
  latestListings = [],
  initialPoBatches = [],
}) {
  const router = useRouter();
  const { nama: sesiNama, profil } = useSesi();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedCampus, setSelectedCampus] = useState("Semua");
  const [condNew, setCondNew] = useState(false);
  const [condUsed, setCondUsed] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [visibleCount, setVisibleCount] = useState(16);
  const [wantedItems, setWantedItems] = useState([]);
  const [wantedLoading, setWantedLoading] = useState(true);
  const [wantedError, setWantedError] = useState("");

  useEffect(() => {
    try {
      const savedFav = JSON.parse(localStorage.getItem("kk_favorites") || "{}");
      if (savedFav && typeof savedFav === "object") setFavorites(savedFav);
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWantedItems() {
      try {
        const response = await fetch("/api/wanted", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Daftar barang dicari belum dapat dimuat.");
        if (!Array.isArray(result.listings)) throw new Error("Respons barang dicari tidak valid.");
        setWantedItems(result.listings.slice(0, 3));
      } catch (cause) {
        if (!controller.signal.aborted) {
          setWantedError(cause instanceof Error ? cause.message : "Daftar barang dicari belum dapat dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setWantedLoading(false);
      }
    }

    loadWantedItems();
    return () => controller.abort();
  }, []);

  const campusOptions = useMemo(() => {
    const set = new Set(["Semua"]);
    latestListings.forEach((l) => {
      if (l.campus) set.add(l.campus);
    });
    return Array.from(set);
  }, [latestListings]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return latestListings.filter((item) => {
      if (q) {
        const hay = `${item.title || ""} ${item.description || ""} ${item.category || ""} ${item.area || ""} ${item.seller_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedCategory !== "Semua") {
        const catObj = CATEGORIES.find((c) => c.label === selectedCategory);
        const itemCat = String(item.category || "").toLowerCase();
        const itemTitle = String(item.title || "").toLowerCase();
        if (catObj?.match) {
          const matched = catObj.match.some((m) => itemCat.includes(m) || itemTitle.includes(m));
          if (!matched) return false;
        } else if (!itemCat.includes(selectedCategory.toLowerCase())) {
          return false;
        }
      }
      if (selectedCampus !== "Semua" && item.campus !== selectedCampus) return false;
      if (condNew && !condUsed) {
        const c = String(item.condition || "").toLowerCase();
        if (c !== "new" && c !== "baru") return false;
      } else if (condUsed && !condNew) {
        const c = String(item.condition || "").toLowerCase();
        if (c === "new" || c === "baru") return false;
      }
      const priceNum = Number(item.price || 0);
      if (maxPrice < 5000000 && priceNum > maxPrice) return false;
      return true;
    });
  }, [latestListings, searchQuery, selectedCategory, selectedCampus, condNew, condUsed, maxPrice]);

  const displayedListings = filteredListings.slice(0, visibleCount);

  const toggleFav = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("kk_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddCart = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCartItem({
      id: item.id,
      title: item.title,
      price: item.price,
      image_url: getListingImage(item),
      seller_wa: item.seller_wa,
      seller_name: item.seller_name,
      campus: item.campus,
    });
    toast.success("Ditambahkan ke keranjang");
  };

  const handleWaClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    openWhatsAppContact({
      wa: item.seller_wa,
      listingTitle: item.title,
      listingUrl: typeof window !== "undefined" ? `${window.location.origin}/produk/${buildSlug(item.title, item.id)}` : "",
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
    setSelectedCampus("Semua");
    setCondNew(false);
    setCondUsed(false);
    setMaxPrice(5000000);
  };

  const greetingName = sesiNama || profil?.name || "Mahasiswa";

  return (
    <div className="w-full min-h-screen bg-[#f4faf5] lg:bg-[#ecfeee] dark:bg-[#0a1710]">
      {/* ==================== MOBILE VIEW (< lg) — 100% STITCH jual_beli_beranda ==================== */}
      <div className="lg:hidden max-w-md mx-auto px-4 pt-3 pb-28 space-y-4">
        {/* Greeting & Top Sub-actions */}
        <section className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-emerald-200/60 bg-[#134e35] text-[#bef264] flex items-center justify-center flex-shrink-0 shadow-sm font-extrabold text-base">
              {greetingName.charAt(0).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-lime-500 rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-[16px] text-slate-900 dark:text-white leading-tight truncate">
                  Halo, {greetingName}!
                </h1>
                <span className="text-sm">👋</span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-[#99d3b2] leading-tight mt-0.5 font-medium">
                Selamat datang di Kampus Kita
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/chat"
              aria-label="Pesan Chat"
              className="relative w-9 h-9 rounded-full bg-white dark:bg-[#112218] text-slate-700 dark:text-white shadow-sm border border-slate-100 dark:border-white/10 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[19px]">chat_bubble_outline</span>
            </Link>
            <Link
              href="/favorit"
              aria-label="Favorit"
              className="relative w-9 h-9 rounded-full bg-white dark:bg-[#112218] text-slate-700 dark:text-white shadow-sm border border-slate-100 dark:border-white/10 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">favorite_border</span>
            </Link>
          </div>
        </section>

        {/* Search Bar */}
        <section>
          <div className="w-full bg-white dark:bg-[#112218] rounded-2xl shadow-sm border border-emerald-950/5 dark:border-white/10 flex items-center px-3.5 py-2.5 gap-2.5 focus-within:ring-2 focus-within:ring-[#134e35]/20 focus-within:border-[#134e35] transition-all">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari barang yang kamu butuhkan..."
              className="w-full bg-transparent text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none font-normal"
            />
            <button
              type="button"
              onClick={() => setShowMobileFilter((v) => !v)}
              aria-label="Filter"
              className={cn(
                "p-1 rounded-lg transition-colors",
                showMobileFilter ? "bg-[#134e35] text-[#bef264]" : "text-slate-400 hover:text-[#134e35]"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          {showMobileFilter && (
            <div className="mt-2 bg-white dark:bg-[#112218] rounded-2xl p-3.5 border border-emerald-950/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#134e35] dark:text-white">Filter Cepat</span>
                <button type="button" onClick={resetFilters} className="text-[11px] font-semibold text-[#506600] hover:underline">
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="bg-[#e6f8e8] text-[#101f15] text-xs rounded-xl px-2.5 py-2 outline-none"
                >
                  {campusOptions.map((c) => (
                    <option key={c} value={c}>{c === "Semua" ? "Semua Kampus" : c}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCondNew((v) => !v)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                      condNew ? "bg-[#134e35] text-white border-[#134e35]" : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondUsed((v) => !v)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors",
                      condUsed ? "bg-[#134e35] text-white border-[#134e35]" : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    Preloved
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions Grid (Jual Barang & Buat WTB) */}
        <section className="grid grid-cols-2 gap-2.5">
          <Link
            href="/jual"
            className="flex items-center justify-between p-3 bg-[#134e35] text-white rounded-2xl shadow-sm hover:bg-[#1b6345] active:scale-[0.98] transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-[#bef264] flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-bold block leading-tight text-white">Jual Barang</span>
                <span className="text-[11px] text-emerald-200/90 leading-tight block mt-0.5 truncate">Pasang iklan kilat</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#bef264] text-[18px] opacity-80 shrink-0">chevron_right</span>
          </Link>

          <Link
            href="/dicari"
            className="flex items-center justify-between p-3 bg-white dark:bg-[#112218] text-[#134e35] border border-emerald-900/10 rounded-2xl shadow-sm hover:bg-emerald-50/50 active:scale-[0.98] transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/70 flex items-center justify-center text-[#134e35] flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">assignment</span>
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-bold block leading-tight text-slate-900 dark:text-white">Buat WTB</span>
                <span className="text-[11px] text-slate-500 dark:text-[#99d3b2] leading-tight block mt-0.5 truncate">Cari kebutuhan</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#134e35]/60 text-[18px] shrink-0">chevron_right</span>
          </Link>
        </section>

        {/* Promotional Banner: Open Preorder */}
        <Link
          href="/open-po"
          className="relative overflow-hidden bg-gradient-to-br from-emerald-100/80 via-white to-lime-100/70 dark:from-[#134e35] dark:via-[#112218] dark:to-[#183022] p-3.5 rounded-2xl border border-emerald-200/50 shadow-sm flex items-center justify-between active:scale-[0.99] transition-transform"
        >
          <div className="max-w-[74%] space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-300 text-lime-950 text-[10px] font-bold tracking-wide uppercase">
              <span className="material-symbols-outlined text-[12px]">local_mall</span>
              HEMAT ONGKIR
            </span>
            <h2 className="text-[15px] font-bold text-[#134e35] dark:text-[#bef264] leading-snug">Open Preorder</h2>
            <p className="text-[11px] text-slate-600 dark:text-[#e6f8e8] leading-snug font-normal">
              Preorder makanan &amp; merchandise kampus bareng mahasiswa lain.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#134e35]/10 border border-[#134e35]/10 flex items-center justify-center text-[#134e35] dark:text-[#bef264] flex-shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[30px]">shopping_bag</span>
          </div>
        </Link>

        {/* Category Filter Tabs */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">Produk Terbaru</h2>
            <Link href="/jual-beli" className="inline-flex items-center gap-0.5 text-[12px] text-[#134e35] dark:text-[#bef264] font-semibold hover:underline">
              Lihat semua
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setSelectedCategory(cat.label)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors",
                    active
                      ? "bg-[#134e35] text-[#bef264] font-semibold shadow-sm"
                      : "bg-white dark:bg-[#112218] text-slate-600 dark:text-[#99d3b2] border border-slate-200/80 dark:border-white/10 font-medium hover:bg-slate-50"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Product Listing Grid (2 Columns) */}
        {displayedListings.length === 0 ? (
          <div className="bg-white dark:bg-[#112218] rounded-2xl p-8 text-center border border-slate-200/60 space-y-2">
            <span className="material-symbols-outlined text-[36px] text-slate-400">inventory_2</span>
            <p className="text-sm font-bold text-slate-700 dark:text-white">Belum ada produk yang cocok</p>
            <button type="button" onClick={resetFilters} className="text-xs font-bold text-[#134e35] underline">
              Reset Pencarian
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-2.5">
            {displayedListings.map((item) => {
              const img = getListingImage(item);
              const cond = formatCondition(item.condition);
              const href = `/produk/${buildSlug(item.title, item.id)}`;
              const sellerInitial = (item.seller_name || "M").charAt(0).toUpperCase();

              return (
                <article
                  key={item.id}
                  onClick={() => router.push(href)}
                  className="flex flex-col justify-between bg-white dark:bg-[#112218] rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden p-2.5 space-y-2 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100">
                      {img ? (
                        <img
                          src={img}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-[36px]">image</span>
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-tight shadow-sm",
                          cond.isNew ? "bg-[#134e35]" : "bg-slate-700/80 backdrop-blur-xs"
                        )}
                      >
                        {cond.label}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleAddCart(e, item)}
                        aria-label="Tambah ke keranjang"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow-sm hover:text-[#134e35] active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-lime-200 text-lime-900 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {sellerInitial}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">
                        {item.seller_name || "Mahasiswa"}
                      </span>
                      {item.campus && (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">({item.campus})</span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-[#99d3b2] line-clamp-1 leading-normal">
                        {item.description || "Siap COD di area kampus"}
                      </p>
                      <p className="text-[14px] font-extrabold text-[#134e35] dark:text-[#bef264] pt-0.5">
                        {rupiah(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 dark:text-[#99d3b2] text-[11px]">
                      <span className="material-symbols-outlined text-[13px] text-[#134e35] dark:text-[#bef264]">location_on</span>
                      <span className="truncate">{item.area || item.campus || "Area Kampus"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">visibility</span>
                      Detail
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => handleWaClick(e, item)}
                      className="py-1 px-2 rounded-lg bg-[#134e35] hover:bg-[#1b6345] text-white text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">chat</span>
                      WA
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {filteredListings.length > visibleCount && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 16)}
              className="px-6 py-2.5 rounded-full bg-white border border-[#134e35]/15 text-xs font-bold text-[#134e35] shadow-sm hover:bg-[#e6f8e8] transition-colors"
            >
              Muat Lebih Banyak
            </button>
          </div>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (lg+) — 100% STITCH jual_beli ==================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 w-full pt-5 pb-16">
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* SIDEBAR KIRI (Kategori & Filter) Col 1-3 */}
          <aside className="col-span-3 flex flex-col gap-5 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
              <div className="flex items-center gap-2 mb-4 pb-1">
                <span className="material-symbols-outlined text-[#003622] dark:text-[#bef264] text-[20px]">grid_view</span>
                <h2 className="text-[16px] font-bold text-[#101f15] dark:text-white tracking-tight">Kategori</h2>
              </div>
              <nav className="flex flex-col gap-1">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all",
                        active
                          ? "bg-[#e6f8e8] text-[#003622] font-semibold text-[14px]"
                          : "text-[#404943] dark:text-[#99d3b2] text-[13px] hover:bg-[#e6f8e8]/60 hover:text-[#101f15]"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "material-symbols-outlined text-[19px]",
                            active ? "text-[#003622]" : "text-[#707972] group-hover:text-[#003622]"
                          )}
                        >
                          {cat.icon}
                        </span>
                        <span>{cat.label}</span>
                      </span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#506600]" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#003622] dark:text-[#bef264] text-[20px]">tune</span>
                  <h2 className="text-[16px] font-bold text-[#101f15] dark:text-white tracking-tight">Filter</h2>
                </div>
                <button type="button" onClick={resetFilters} className="text-[11px] font-bold text-[#506600] hover:underline">
                  Reset
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-[#404943] dark:text-[#99d3b2] mb-1.5">
                  Lokasi Kampus
                </label>
                <div className="relative">
                  <select
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    className="w-full appearance-none bg-[#e6f8e8] dark:bg-[#183022] py-2.5 pl-3.5 pr-8 rounded-xl text-[12px] text-[#101f15] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#003622] cursor-pointer"
                  >
                    {campusOptions.map((c) => (
                      <option key={c} value={c}>{c === "Semua" ? "Semua Kampus" : c}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#707972] text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-[11px] font-semibold text-[#404943] dark:text-[#99d3b2] mb-2">Kondisi</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={condNew}
                      onChange={(e) => setCondNew(e.target.checked)}
                      className="w-4 h-4 rounded text-[#003622] focus:ring-[#003622] accent-[#003622]"
                    />
                    <span className="text-[12px] text-[#101f15] dark:text-white">Baru</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={condUsed}
                      onChange={(e) => setCondUsed(e.target.checked)}
                      className="w-4 h-4 rounded text-[#003622] focus:ring-[#003622] accent-[#003622]"
                    />
                    <span className="text-[12px] text-[#101f15] dark:text-white">Bekas (Preloved)</span>
                  </label>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-[#404943] dark:text-[#99d3b2]">Rentang Harga</label>
                  <span className="text-[10px] text-[#003622] dark:text-[#bef264] font-bold">
                    Maks. {maxPrice >= 5000000 ? "5 Juta+" : rupiah(maxPrice)}
                  </span>
                </div>
                <div className="px-1 py-2">
                  <input
                    type="range"
                    min="0"
                    max="5000000"
                    step="50000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#003622] bg-[#dbeddd] h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1 bg-[#e6f8e8] dark:bg-[#183022] px-2.5 py-1.5 rounded-lg text-left">
                    <span className="text-[10px] text-[#707972] block">Min</span>
                    <span className="text-[11px] text-[#101f15] dark:text-white font-semibold">Rp0</span>
                  </div>
                  <span className="text-[#707972] text-xs">-</span>
                  <div className="flex-1 bg-[#e6f8e8] dark:bg-[#183022] px-2.5 py-1.5 rounded-lg text-right">
                    <span className="text-[10px] text-[#707972] block">Maks</span>
                    <span className="text-[11px] text-[#101f15] dark:text-white font-semibold">{rupiah(maxPrice)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="w-full py-2.5 bg-[#003622] hover:bg-[#134e35] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Filter Aktif
              </button>
            </div>
          </aside>

          {/* KONTEN TENGAH UTAMA Col 4-9 */}
          <section className="col-span-6 flex flex-col gap-5 min-w-0">
            {/* Greeting Card */}
            <div className="relative overflow-hidden bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-[0_4px_24px_-6px_rgba(19,78,53,0.08)] flex items-center justify-between">
              <div className="flex items-center gap-4 z-10">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[#134e35] text-[#ceeb7a] flex items-center justify-center text-xl font-extrabold shadow-sm">
                    {greetingName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#ceeb7a] rounded-full ring-2 ring-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-[20px] font-bold text-[#003622] dark:text-white leading-tight">
                      Halo, {greetingName}!
                    </h1>
                    <span className="text-xl">👋</span>
                  </div>
                  <p className="text-[12px] text-[#404943] dark:text-[#99d3b2]">
                    Selamat datang di Kampus Kita • Marketplace Mahasiswa
                  </p>
                </div>
              </div>

              <div className="hidden xl:flex items-center opacity-90 z-0">
                <svg className="w-36 h-20 text-[#dbeddd]" fill="none" viewBox="0 0 160 80">
                  <path d="M10 70C25 65 40 68 55 64C75 58 90 72 110 65C130 58 145 66 155 70V80H10V70Z" fill="currentColor" fillOpacity="0.4" />
                  <rect fill="currentColor" fillOpacity="0.7" height="38" rx="2" width="28" x="70" y="32" />
                  <polygon fill="currentColor" points="84,14 62,32 106,32" />
                  <circle cx="84" cy="24" fill="#d1ee7c" r="4" />
                  <rect fill="#ecfeee" height="10" rx="1" width="6" x="76" y="44" />
                  <rect fill="#ecfeee" height="10" rx="1" width="6" x="86" y="44" />
                  <rect fill="#ecfeee" height="12" width="10" x="79" y="58" />
                  <circle cx="40" cy="55" fill="#99d3b2" fillOpacity="0.5" r="14" />
                  <circle cx="126" cy="52" fill="#99d3b2" fillOpacity="0.5" r="16" />
                </svg>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#112218] p-2 rounded-2xl shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] flex items-center gap-2">
              <div className="flex items-center gap-2.5 flex-1 pl-3">
                <span className="material-symbols-outlined text-[#707972] text-[22px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Cari barang, misalnya "buku kalkulus", "tas kuliah", atau "laptop"...'
                  className="w-full bg-transparent text-[13px] text-[#101f15] dark:text-white placeholder:text-[#707972] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => router.push(`/jual-beli${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`)}
                className="px-5 py-2.5 bg-[#003622] hover:bg-[#134e35] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm"
              >
                Cari
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3.5">
              <Link
                href="/jual"
                className="group relative overflow-hidden bg-[#003622] text-white rounded-2xl p-4 flex items-center justify-between shadow-[0_8px_20px_-4px_rgba(0,54,34,0.3)] transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#ceeb7a] transition-transform group-hover:rotate-45">
                    <span className="material-symbols-outlined text-[24px]">add</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-white">Jual Barang</span>
                    <span className="text-[10px] font-semibold text-[#b4f0cd]">Pasang listing cepat</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#ceeb7a] text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>

              <Link
                href="/dicari"
                className="group bg-[#ceeb7a]/45 hover:bg-[#ceeb7a]/70 text-[#161f00] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#506600] shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">edit_note</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#101f15]">Buat WTB</span>
                    <span className="text-[10px] font-semibold text-[#506600]">Request barang dicari</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#506600] text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            {/* Banner Promosi Open PO */}
            <div className="relative overflow-hidden bg-[#134e35] rounded-3xl p-6 text-white shadow-lg flex items-center justify-between gap-6">
              <div className="flex flex-col gap-2 z-10 max-w-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold w-fit">
                  <span className="material-symbols-outlined text-[14px]">local_mall</span>
                  Open PO
                </div>
                <h2 className="text-[20px] font-extrabold text-white leading-tight">Ikuti Open PO Terbaru!</h2>
                <p className="text-[12px] text-[#99d3b2] leading-relaxed">
                  Pesan bareng teman sejurusan, lebih hemat ongkir, praktis, dan terpercaya.
                </p>
                <div className="pt-2">
                  <Link
                    href="/open-po"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ceeb7a] text-[#161f00] text-[12px] font-bold hover:bg-[#b5d263] transition-transform hover:scale-105 shadow-sm"
                  >
                    <span>Lihat Open PO</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-center z-10">
                <div className="w-24 h-24 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-[#ceeb7a]">
                  <span className="material-symbols-outlined text-[48px]">inventory_2</span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-[#ceeb7a]/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Section: Produk Terbaru */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[#101f15] dark:text-white tracking-tight">Produk Terbaru</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#dbeddd] text-[#003622] text-[10px] font-bold">
                    {filteredListings.length} Barang
                  </span>
                </div>
                <Link href="/jual-beli" className="text-[12px] font-bold text-[#506600] dark:text-[#bef264] hover:underline flex items-center gap-1">
                  <span>Lihat semua</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {displayedListings.length === 0 ? (
                <div className="bg-white dark:bg-[#112218] rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-sm font-bold text-[#101f15] dark:text-white">Tidak ada barang yang cocok dengan filter.</p>
                  <button type="button" onClick={resetFilters} className="mt-2 text-xs font-bold text-[#003622] underline">
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {displayedListings.map((item) => {
                    const img = getListingImage(item);
                    const cond = formatCondition(item.condition);
                    const href = `/produk/${buildSlug(item.title, item.id)}`;
                    const isFav = !!favorites[item.id];

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className="bg-white dark:bg-[#112218] rounded-2xl overflow-hidden flex flex-col justify-between shadow-[0_3px_16px_-3px_rgba(19,78,53,0.06)] hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="relative aspect-square w-full overflow-hidden bg-[#e6f8e8]">
                            {img ? (
                              <img
                                src={img}
                                alt={item.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#707972]">
                                <span className="material-symbols-outlined text-[40px]">image</span>
                              </div>
                            )}
                            <span
                              className={cn(
                                "absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold",
                                cond.isNew
                                  ? "bg-[#ceeb7a] text-[#161f00]"
                                  : "bg-white/90 backdrop-blur-sm text-[#101f15]"
                              )}
                            >
                              {cond.label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => toggleFav(e, item.id)}
                              aria-label="Favorit"
                              className={cn(
                                "absolute top-2 right-2 w-7 h-7 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center transition-colors",
                                isFav ? "text-[#ba1a1a]" : "text-[#707972] hover:text-[#ba1a1a]"
                              )}
                            >
                              <span className={cn("material-symbols-outlined text-[16px]", isFav && "material-symbols-fill")}>
                                favorite
                              </span>
                            </button>
                          </div>
                          <div className="p-3">
                            <h3 className="text-[14px] text-[#101f15] dark:text-white font-semibold line-clamp-1 group-hover:text-[#003622] transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-[17px] text-[#003622] dark:text-[#bef264] font-extrabold mt-0.5">
                              {rupiah(item.price)}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 pb-3 pt-1 flex items-center justify-between text-[#404943] dark:text-[#99d3b2] text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[14px] text-[#707972] flex-shrink-0">storefront</span>
                            <span className="truncate">{item.seller_name || "Mahasiswa"}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#707972] flex-shrink-0">
                            {item.area || item.campus || "Kampus"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {filteredListings.length > visibleCount && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 12)}
                    className="px-6 py-2.5 rounded-full bg-white border border-[#134e35]/15 text-xs font-bold text-[#003622] shadow-sm hover:bg-[#e6f8e8] transition-colors"
                  >
                    Muat Lebih Banyak Barang
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SIDEBAR KANAN (Widgets & LINUSKU) Col 10-12 */}
          <aside className="col-span-3 flex flex-col gap-5 sticky top-24">
            {/* Widget: Open PO Populer */}
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#003622] dark:text-[#bef264] text-[20px]">local_fire_department</span>
                  <h2 className="text-[16px] font-bold text-[#101f15] dark:text-white tracking-tight">Open PO Populer</h2>
                </div>
                <Link href="/open-po" className="text-[10px] font-bold text-[#506600] hover:underline flex items-center gap-0.5">
                  <span>Lihat semua</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {initialPoBatches.length > 0 ? (
                  initialPoBatches.slice(0, 2).map((po) => {
                    const quota = Number(po.quota || po.max_quota || 30);
                    const sold = Number(po.ordered_count || po.current_orders || 0);
                    const sisa = Math.max(0, quota - sold);
                    return (
                      <div key={po.id} className="p-3 rounded-xl bg-[#e6f8e8] dark:bg-[#183022] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center text-[#134e35]">
                            {po.image_url ? (
                              <img src={po.image_url} alt={po.title || po.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="text-[13px] font-semibold text-[#101f15] dark:text-white truncate">
                              {po.title || po.name}
                            </h4>
                            <span className="text-[10px] text-[#404943] dark:text-[#99d3b2]">
                              <strong className="text-[#506600] font-bold">Sisa {sisa} kuota</strong>
                            </span>
                          </div>
                        </div>
                        <Link
                          href="/open-po"
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#003622] hover:bg-[#134e35] text-white text-[10px] font-bold transition-all shadow-sm"
                        >
                          Ikuti PO
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#404943]">Belum ada batch PO aktif saat ini.</p>
                )}
              </div>
            </div>

            {/* Widget: WTB Terbaru */}
            <div className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#003622] dark:text-[#bef264] text-[20px]">manage_search</span>
                  <h2 className="text-[16px] font-bold text-[#101f15] dark:text-white tracking-tight">WTB Terbaru</h2>
                </div>
                <Link href="/dicari" className="text-[10px] font-bold text-[#506600] hover:underline flex items-center gap-0.5">
                  <span>Lihat semua</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {wantedLoading && (
                  <p role="status" className="text-xs text-[#707972]">Memuat permintaan terbaru…</p>
                )}
                {wantedError && (
                  <p role="alert" className="text-xs text-rose-700">{wantedError}</p>
                )}
                {!wantedLoading && !wantedError && wantedItems.length === 0 && (
                  <p className="text-xs text-[#707972]">Belum ada permintaan barang yang tersedia.</p>
                )}
                {!wantedError && wantedItems.map((wtb, idx) => (
                  <Link
                    key={wtb.id}
                    href="/dicari"
                    className={cn(
                      "flex items-start justify-between gap-2 hover:opacity-80 transition-opacity",
                      idx < wantedItems.length - 1 && "pb-2.5 border-b border-[#dbeddd]/60"
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#dbeddd] flex items-center justify-center text-[#003622] flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[16px]">{getWantedIcon(wtb.category)}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-[13px] font-semibold text-[#101f15] dark:text-white truncate">
                          {String(wtb.title || "Permintaan barang")}
                        </h4>
                        <span className="text-[10px] text-[#506600] font-semibold truncate">
                          {wtb.budget > 0 ? `Maks. ${rupiah(wtb.budget)}` : "Budget belum ditentukan"}
                          {wtb.category ? ` · ${wtb.category}` : ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#707972] flex-shrink-0">{formatWantedTime(wtb.created_at)}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Banner Promo LINUSKU */}
            <div className="bg-gradient-to-br from-white to-[#e6f8e8] dark:from-[#112218] dark:to-[#183022] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#506600] dark:text-[#bef264] text-[22px]">directions_bus</span>
                <span className="text-[16px] text-[#003622] dark:text-white font-bold">Naik Bus Kampus?</span>
              </div>
              <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] leading-snug">
                Cek rute dan posisi bus mahasiswa USU secara real-time di LINUSKU!
              </p>
              <div className="w-full h-20 rounded-xl bg-[#134e35]/10 flex items-center justify-center">
                <div className="bg-white/95 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#506600] animate-ping" />
                  <span className="text-[10px] text-[#003622] font-bold">Cek status armada di peta LINUSKU</span>
                </div>
              </div>
              <Link
                href="/linusku"
                className="w-full py-2.5 rounded-xl bg-[#ceeb7a] hover:bg-[#b5d263] text-[#161f00] text-[12px] font-bold text-center flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              >
                <span>Buka LINUSKU</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
