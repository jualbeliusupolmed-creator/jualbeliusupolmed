"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { rupiah } from "@/lib/fees";
import ProductCard from "@/components/ProductCard";
import { cn } from "@/lib/utils";
import { fetchCampusesCached } from "@/lib/cachedKampus";

const QUICK_CATEGORIES = [
  { id: "all", label: "Semua", filterVal: "all" },
  { id: "elektronik", label: "Elektronik & Laptop", filterVal: "elektronik" },
  { id: "buku", label: "Buku & Modul", filterVal: "buku" },
  { id: "lab", label: "Alat Lab & Praktikum", filterVal: "lab" },
  { id: "fashion", label: "Fashion Preloved", filterVal: "fashion" },
  { id: "transportasi", label: "Transportasi", filterVal: "transportasi" },
  { id: "kos", label: "Kos & Furniture", filterVal: "kos" },
];

export default function MarketplaceBrowser({
  initialListings = [],
  initialTotal = 0,
  initialLoadError = false,
  categories = [],
  stats = { wanted: 0, sold: 0, sellers: 0 },
  wantedItems = [],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCampus, setSelectedCampus] = useState(
    searchParams.get("campus") || "all"
  );
  const [campuses, setCampuses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("cat") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");

  useEffect(() => {
    let active = true;
    let allCampuses = [];

    const filterByProv = (rawCampuses, targetProv) => {
      const prefProv = targetProv || (typeof window !== "undefined" ? localStorage.getItem("preferred_province") : null);
      const prefCamp = typeof window !== "undefined" ? localStorage.getItem("preferred_campus") : null;
      const matchedProv = prefProv || (prefCamp && rawCampuses.find((c) => c.shortName?.toLowerCase() === prefCamp.toLowerCase())?.provinceId) || "sumatera-utara";
      const filtered = rawCampuses.filter((c) => (c.provinceId || "sumatera-utara") === matchedProv);
      return filtered.length > 0 ? filtered : rawCampuses;
    };

    fetchCampusesCached()
      .then((data) => {
        if (active && Array.isArray(data?.campuses)) {
          allCampuses = data.campuses;
          setCampuses(filterByProv(allCampuses));
        }
      })
      .catch((error) => console.error("[Marketplace] Gagal memuat daftar kampus:", error));

    const handleCampusChange = (event) => {
      const campus = event.detail?.campus;
      const prov = event.detail?.province;
      setSelectedCampus(!campus || campus === "Semua" ? "all" : String(campus).toLowerCase());
      if (allCampuses.length > 0) {
        setCampuses(filterByProv(allCampuses, prov));
      }
    };
    window.addEventListener("campus:change", handleCampusChange);

    return () => {
      active = false;
      window.removeEventListener("campus:change", handleCampusChange);
    };
  }, []);

  // Pagination state
  const [listings, setListings] = useState(initialListings);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [hasMore, setHasMore] = useState(initialListings.length < initialTotal);

  // Sync state if initialListings updates
  useEffect(() => {
    setListings(initialListings);
    setTotalCount(initialTotal);
    setHasMore(initialListings.length < initialTotal);
  }, [initialListings, initialTotal]);

  // Client-side quick filter & sort over current listings
  const filteredListings = useMemo(() => {
    // Deduplikasi: satu penjual tidak boleh mengiklankan barang yang sama
    // (normalized title) berulang — database masih berisi duplikat lama.
    const seenById = new Set();
    const seenBySellerTitle = new Set();
    let result = [...listings].filter((item) => {
      const id = String(item.id);
      if (seenById.has(id)) return false;
      seenById.add(id);
      const seller = String(item.seller_wa || item.seller_name || "").toLowerCase();
      const title = String(item.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seller && title) {
        const key = `${seller}:${title}`;
        if (seenBySellerTitle.has(key)) return false;
        seenBySellerTitle.add(key);
      }
      return true;
    });

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
      const selectedCampusInfo = campuses.find(
        (campus) =>
          campus.shortName?.toLowerCase() === selectedCampus ||
          campus.id?.toLowerCase() === selectedCampus
      );
      const campusValues = [
        selectedCampus,
        selectedCampusInfo?.shortName,
        selectedCampusInfo?.name,
        selectedCampusInfo?.id,
      ].filter(Boolean).map((value) => value.toLowerCase());
      result = result.filter((item) => {
        const profile = item.seller_profiles;
        const verified = profile?.affiliation_status === "verified_student" || profile?.student_verified;
        const sellerUniversity = verified && profile?.verified_university_id
          ? profile.verified_university_id
          : profile?.home_university_id;
        const sellerOrigin = [sellerUniversity, profile?.campus, profile?.student_campus]
          .filter(Boolean).map((value) => String(value).toLowerCase());
        return sellerOrigin.some((value) => campusValues.includes(value));
      });
    }

    const selectedDynamicCategory = categories.find(
      (category) => `category:${category.slug}` === selectedCategory
    );

    if (selectedDynamicCategory) {
      result = result.filter((item) => item.category === selectedDynamicCategory.name);
    } else if (selectedCategory !== "all") {
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
  }, [campuses, categories, listings, searchQuery, selectedCampus, selectedCategory, sortBy]);

  // Load more pagination function
  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", "12");
      const selectedDynamicCategory = categories.find(
        (category) => `category:${category.slug}` === selectedCategory
      );
      if (selectedDynamicCategory) {
        params.set("cat", selectedDynamicCategory.name);
      } else if (selectedCategory !== "all") {
        params.set("cat", selectedCategory);
      }
      if (selectedCampus !== "all") params.set("campus", selectedCampus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (sortBy !== "newest") params.set("sort", sortBy);

      const res = await fetch(`/api/listings/browse?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
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
    } catch {
      console.error("[Marketplace] Gagal memuat halaman berikutnya");
      setLoadMoreError("Barang berikutnya gagal dimuat. Periksa koneksi, lalu coba lagi.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Quick category select handler
  function handleQuickCategory(catVal) {
    setSelectedCategory(catVal);
  }

  function renderFilterFields(idPrefix) {
    return (
      <>
        <div className="relative min-w-0">
          <label htmlFor={`${idPrefix}-campus`} className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Kampus
          </label>
          <select
            id={`${idPrefix}-campus`}
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Semua Kampus</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.shortName?.toLowerCase() || campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2 top-[2.1rem] -translate-y-1/2 text-[18px] text-slate-500" aria-hidden="true">
            expand_more
          </span>
        </div>

        <div className="relative min-w-0">
          <label htmlFor={`${idPrefix}-category`} className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Kategori
          </label>
          <select
            id={`${idPrefix}-category`}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Semua Kategori</option>
            {QUICK_CATEGORIES.filter((category) => category.id !== "all").map((category) => (
              <option key={category.id} value={category.filterVal}>{category.label}</option>
            ))}
            {categories.length > 0 && (
              <optgroup label="Kategori spesifik">
                {categories.map((category) => (
                  <option key={category.id || category.slug} value={`category:${category.slug}`}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2 top-[2.1rem] -translate-y-1/2 text-[18px] text-slate-500" aria-hidden="true">
            expand_more
          </span>
        </div>

        <div className="relative min-w-0">
          <label htmlFor={`${idPrefix}-sort`} className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Urutkan
          </label>
          <select
            id={`${idPrefix}-sort`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="newest">Urut: Terbaru</option>
            <option value="price_asc">Harga: Terendah</option>
            <option value="price_desc">Harga: Tertinggi</option>
            <option value="verified">Prioritas Verifikasi</option>
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2 top-[2.1rem] -translate-y-1/2 text-[18px] text-slate-500" aria-hidden="true">
            expand_more
          </span>
        </div>
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 bg-[#f4faf5] px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 sm:px-6 sm:py-8 xl:pb-8 dark:bg-slate-950">
      <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="hidden space-y-4 xl:col-start-1 xl:row-start-1 xl:block xl:sticky xl:top-24 xl:self-start" aria-label="Filter marketplace">
          <section className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <h2 className="mb-4 text-base font-extrabold text-slate-950 dark:text-white">Filter barang</h2>
            <div className="grid gap-3">
              {renderFilterFields("desktop-marketplace")}
            </div>
          </section>
          <section className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <h2 className="mb-3 text-base font-extrabold text-slate-950 dark:text-white">Kategori cepat</h2>
            <div role="group" aria-label="Kategori cepat" className="grid gap-1">
              {QUICK_CATEGORIES.map((chip) => {
                const active = selectedCategory === chip.filterVal;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleQuickCategory(chip.filterVal)}
                    aria-pressed={active}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-lg px-3 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
                      active
                        ? "bg-emerald-900 text-white"
                        : "text-slate-700 hover:bg-emerald-50 active:bg-emerald-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <div className="mb-5 flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Jual Beli Kampus
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Temukan barang dan kebutuhan mahasiswa, lalu sepakati transaksi secara langsung.
              </p>
            </header>

            <div className="rounded-2xl border border-emerald-950/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-4">
              <label htmlFor="marketplace-search" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                Cari barang
              </label>
              <div className="relative flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:border-emerald-800 focus-within:ring-2 focus-within:ring-emerald-800/20 dark:border-slate-600 dark:bg-slate-800">
                <span className="material-symbols-outlined text-[20px] text-slate-500" aria-hidden="true">
                  search
                </span>
                <input
                  id="marketplace-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-slate-100"
                  placeholder="Contoh: buku kalkulus atau laptop"
                  type="search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Hapus pencarian"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    title="Hapus pencarian"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                  </button>
                )}
              </div>
            </div>

            <details className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm xl:hidden dark:border-white/10 dark:bg-slate-900">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:text-white">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-emerald-900 dark:text-emerald-300" aria-hidden="true">tune</span>
                  Filter kampus, kategori, dan urutan
                </span>
                <span className="material-symbols-outlined text-slate-500" aria-hidden="true">expand_more</span>
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {renderFilterFields("mobile-marketplace")}
              </div>
            </details>
          </div>

      <section className="mb-6 grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="Aksi marketplace">
        <Link
          href="/jual"
          className="flex min-h-24 items-center gap-2.5 rounded-2xl bg-[#134e35] px-3 py-3 text-white transition-colors hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] sm:gap-3 sm:px-4"
        >
          <span className="material-symbols-outlined text-2xl text-[#bef264]" aria-hidden="true">add_circle</span>
          <span>
            <strong className="block text-base">Jual barang</strong>
            <span className="block text-sm text-emerald-100">Pasang listing di marketplace</span>
          </span>
        </Link>
        <Link
          href="/dicari"
          className="flex min-h-24 items-center gap-2.5 rounded-2xl border border-emerald-900/20 bg-white px-3 py-3 text-slate-900 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 sm:gap-3 sm:px-4"
        >
          <span className="material-symbols-outlined text-2xl text-[#134e35] dark:text-[#bef264]" aria-hidden="true">search</span>
          <span>
            <strong className="block text-base">Buat permintaan</strong>
            <span className="block text-sm text-slate-600 dark:text-slate-300">Cari barang yang kamu butuhkan</span>
          </span>
        </Link>
      </section>

      <section className="mb-7 flex flex-col justify-between gap-4 rounded-2xl bg-[#0a2e1f] p-5 text-white sm:flex-row sm:items-center sm:p-6">
        <div className="max-w-xl">
          <p className="mb-1 text-sm font-bold text-[#bef264]">Open PO</p>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Pesan produk bersama mahasiswa</h2>
          <p className="mt-1 text-sm leading-6 text-emerald-100">
            Periksa harga, kuota, dan tenggat pesanan pada halaman Open PO.
          </p>
        </div>
        <Link
          href="/open-po"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#bef264] px-5 text-sm font-bold text-[#0a2e1f] transition-colors hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Lihat Open PO
        </Link>
      </section>

      <section aria-labelledby="marketplace-listings-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="marketplace-listings-title" className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-xl">
              Produk terbaru
            </h2>
            <p role="status" aria-live="polite" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {filteredListings.length} barang ditampilkan untuk pilihan saat ini.
            </p>
          </div>
        </div>
        <div role="group" aria-label="Kategori cepat" className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
          {QUICK_CATEGORIES.map((chip) => {
            const active = selectedCategory === chip.filterVal;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleQuickCategory(chip.filterVal)}
                aria-pressed={active}
                className={cn(
                  "min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
                  active
                    ? "border-emerald-900 bg-emerald-900 text-white active:bg-emerald-950"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-emerald-50 active:bg-emerald-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

      {initialLoadError ? (
        <div role="alert" className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          <h3 className="text-base font-bold">Daftar barang belum dapat dimuat</h3>
          <p className="mt-1 text-sm leading-6">Periksa koneksi, lalu coba muat ulang daftar marketplace.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-red-800 px-4 text-sm font-bold transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 dark:border-red-300 dark:hover:bg-red-900/40"
          >
            Coba lagi
          </button>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5 text-slate-400">
            <span className="material-symbols-outlined text-[28px]">inventory_2</span>
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Tidak ada barang yang cocok
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
            Coba ubah kata kunci pencarian atau pilihan filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedCampus("all");
              setSortBy("newest");
            }}
            className="min-h-11 cursor-pointer rounded-lg bg-emerald-900 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-950 active:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Reset Semua Filter
          </button>

          {searchQuery && searchQuery.trim().length >= 2 && (
            <div className="mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 max-w-md mx-auto text-left shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Nyalakan Alarm Pantau untuk &ldquo;{searchQuery.trim()}&rdquo;?
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5 mb-2.5 leading-relaxed">
                    Begitu ada mahasiswa yang pasang iklan barang ini, bot WhatsApp KampusKita langsung kirim pesan ke HP kamu!
                  </p>
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_MARKETPLACE_WA || "62895429126232"}?text=${encodeURIComponent(`PANTAU ${searchQuery.trim()}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    <span>Pasang Alarm WhatsApp</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredListings.map((item) => (
            <ProductCard key={item.id} listing={item} />
          ))}
        </div>
      )}
      {loadMoreError && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          <p>{loadMoreError}</p>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="min-h-11 cursor-pointer rounded-lg border border-red-800 px-4 font-bold text-red-900 transition-colors hover:bg-red-100 active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-300 dark:text-red-100 dark:hover:bg-red-900/40 dark:active:bg-red-900/60"
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs mb-8">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>
            Menampilkan <strong>{filteredListings.length}</strong> barang pada halaman ini
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-bold text-emerald-900 transition-colors hover:bg-slate-200 active:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-200 dark:hover:bg-slate-700 dark:active:bg-slate-600"
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[16px]",
                  isLoadingMore && "motion-safe:animate-spin"
                )}
              >
                sync
              </span>
              <span aria-live="polite">
                {isLoadingMore
                  ? "Memuat barang..."
                  : "Muat lebih banyak barang"}
              </span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-1" aria-live="polite">
            <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white text-xs flex items-center justify-center font-bold">
              {page}
            </span>
          </div>
        </div>
      </div>
      </section>
        </div>

        <aside className="space-y-4 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-24 xl:self-start" aria-label="Informasi kampus">
          <section className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900" aria-labelledby="wanted-list-title">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="wanted-list-title" className="text-base font-extrabold text-slate-950 dark:text-white">Sedang dicari</h2>
              <Link href="/dicari" className="min-h-11 inline-flex items-center text-sm font-bold text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:text-emerald-200">
                Semua
              </Link>
            </div>
            {wantedItems.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {wantedItems.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/dicari?id=${encodeURIComponent(item.id)}`}
                      className="block min-h-16 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    >
                      <span className="block line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                        {Number(item.budget) > 0 ? `Maks. ${rupiah(item.budget)}` : "Anggaran belum ditentukan"}
                        {item.campus || item.area ? ` · ${[item.campus, item.area].filter(Boolean).join(", ")}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <p>Belum ada permintaan barang aktif.</p>
                <Link href="/dicari" className="mt-2 inline-flex min-h-11 items-center font-bold text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 dark:text-emerald-200">
                  Buat permintaan
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-950/10 bg-emerald-50 p-4 dark:border-white/10 dark:bg-slate-900" aria-labelledby="linusku-link-title">
            <h2 id="linusku-link-title" className="text-base font-extrabold text-slate-950 dark:text-white">Naik bus kampus?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              Buka LINUSKU untuk melihat rute dan informasi layanan bus.
            </p>
            <Link
              href="/linusku"
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#134e35] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35]"
            >
              Buka LINUSKU
            </Link>
          </section>
        </aside>
      </div>

    </main>
  );
}
