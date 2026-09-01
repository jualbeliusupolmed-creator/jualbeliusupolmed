"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import CategoryFilter from "@/components/CategoryFilter";
import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import HeroLanding from "@/components/HeroLanding";
import { buildSlug } from "@/lib/slug";
import {
  buildSpecFilterToken,
  getListingSpecFilters,
  parseSpecFilterToken,
} from "@/lib/listingSpecs";
import BottomSheet from "@/components/BottomSheet";
import ProductGridSkeleton from "@/components/ProductSkeleton";

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
  const [conditionFilter, setConditionFilter] = useState(() => searchParams.get("condition") || "all");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") || "default");
  const [selectedSpecFilters, setSelectedSpecFilters] = useState(() =>
    searchParams.getAll("spec").map(parseSpecFilterToken).filter(Boolean)
  );

  // Category subscribe state
  const [showCatSubModal, setShowCatSubModal] = useState(false);
  const [catSubForm, setCatSubForm] = useState({ name: "", wa: "" });
  const [catSubBusy, setCatSubBusy] = useState(false);

  // Pagination state
  const [listings, setListings] = useState(initialListings || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);

  // Wanted listings for homepage teaser
  const [wantedTeaser, setWantedTeaser] = useState([]);

  // Recently viewed (localStorage)
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // PWA Install prompt state
  const [pwaReady, setPwaReady] = useState(false);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sudah ada prompt yang disimpan di InstallPrompt.jsx (mungkin sudah fired sebelumnya)
    if (window.pwaDeferredPrompt) setPwaReady(true);

    const onPrompt = (e) => {
      e.preventDefault();
      window.pwaDeferredPrompt = e;
      setPwaReady(true);
    };
    
    const onInstalled = () => {
      setPwaReady(false);
      
      // 1. Send event to Google Analytics
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "pwa_install", {
          event_category: "PWA",
          event_label: "Install App",
        });
      }

      // 2. Send event to Supabase Backend
      fetch("/api/analytics/pwa-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAgent: navigator.userAgent }),
      }).catch(console.error);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      if (raw) setRecentlyViewed(JSON.parse(raw));
    } catch {}
  }, []);

  // Fetch wanted teaser on mount
  useEffect(() => {
    fetch("/api/wanted?limit=4")
      .then((r) => r.json())
      .then((d) => setWantedTeaser(d.listings?.slice(0, 4) || []))
      .catch(() => {});
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

  const catName = useCallback(
    (slug) => CATEGORIES.find((c) => c.slug === slug)?.name || null,
    [CATEGORIES]
  );
  const availableSpecFilters = useMemo(
    () => (cat === "all" ? [] : getListingSpecFilters(catName(cat))),
    [cat, catName]
  );

  // Sync filter state to URL for shareable links
  const syncToUrl = useCallback((overrides = {}) => {
    const params = new URLSearchParams();
    const state = {
      cat,
      q,
      sort,
      minPrice,
      maxPrice,
      campusFilter,
      negoFilter,
      conditionFilter,
      typeFilter,
      selectedSpecFilters,
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
    if (state.conditionFilter && state.conditionFilter !== "all") params.set("condition", state.conditionFilter);
    if (state.typeFilter && state.typeFilter !== "default") params.set("type", state.typeFilter);
    for (const spec of state.selectedSpecFilters || []) {
      const token = buildSpecFilterToken(spec.key, spec.value);
      if (token) params.append("spec", token);
    }
    const str = params.toString();
    router.replace(`${pathname}${str ? `?${str}` : ""}`, { scroll: false });
  }, [campusFilter, cat, catName, conditionFilter, maxPrice, minPrice, negoFilter, pathname, q, router, selectedSpecFilters, sort, typeFilter]);

  // Terapkan filter dari URL (?q= dari search navbar / SearchAction Google,
  // ?cat= dari breadcrumb halaman produk) — juga saat URL berubah tanpa remount.
  useEffect(() => {
    const urlQ = searchParams.get("q");
    const urlCat = searchParams.get("cat");
    const urlSpecs = searchParams.getAll("spec").map(parseSpecFilterToken).filter(Boolean);
    const catSlug = urlCat
      ? CATEGORIES.find((c) => c.name === urlCat || c.slug === urlCat)?.slug || null
      : null;
    if (urlQ === null && !catSlug && urlSpecs.length === 0) return;
    if (urlQ !== null) setQ(urlQ);
    if (catSlug) setCat(catSlug);
    setSelectedSpecFilters(urlSpecs);
    applyFilters({
      ...(urlQ !== null ? { newQ: urlQ } : {}),
      ...(catSlug ? { newCat: catSlug } : {}),
      newSpecs: urlSpecs,
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
      newNego = negoFilter,
      newCondition = conditionFilter,
      newType = typeFilter,
      newSpecs = selectedSpecFilters,
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
        if (newCondition && newCondition !== "all") params.set("condition", newCondition);
        if (newType && newType !== "default") params.set("type", newType);
        for (const spec of newSpecs || []) {
          const token = buildSpecFilterToken(spec.key, spec.value);
          if (token) params.append("spec", token);
        }

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
    [cat, q, sort, minPrice, maxPrice, campusFilter, negoFilter, conditionFilter, typeFilter, selectedSpecFilters, catName]
  );

  function handleCampus(newCampus) {
    setCampusFilter(newCampus);
    applyFilters({ newCampus });
    syncToUrl({ campusFilter: newCampus });
  }

  // Debounce search
  const handleSearch = useCallback((val) => {
    setQ(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      applyFilters({ newQ: val });
      syncToUrl({ q: val });
    }, 400);
  }, [applyFilters, syncToUrl]);

  function handleCat(newCat) {
    setCat(newCat);
    setSelectedSpecFilters([]);
    applyFilters({ newCat, newSpecs: [] });
    syncToUrl({ cat: newCat, selectedSpecFilters: [] });
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
      if (conditionFilter && conditionFilter !== "all") params.set("condition", conditionFilter);
      if (typeFilter && typeFilter !== "default") params.set("type", typeFilter);
      for (const spec of selectedSpecFilters) {
        const token = buildSpecFilterToken(spec.key, spec.value);
        if (token) params.append("spec", token);
      }

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
    cat !== "all" || q || sort !== "bumped" || minPrice || maxPrice || campusFilter !== "Semua" || negoFilter || conditionFilter !== "all" || typeFilter !== "default" || selectedSpecFilters.length > 0;

  function toggleSpecFilter(filter) {
    const exists = selectedSpecFilters.some(
      (item) => item.key === filter.key && item.value === filter.label
    );
    const next = exists
      ? selectedSpecFilters.filter(
          (item) => !(item.key === filter.key && item.value === filter.label)
        )
      : [...selectedSpecFilters, { key: filter.key, value: filter.label }];
    setSelectedSpecFilters(next);
    applyFilters({ newSpecs: next });
    syncToUrl({ selectedSpecFilters: next });
  }

  const order = layoutOrder && layoutOrder.length > 0 ? layoutOrder : ["hero", "featured", "recently_viewed", "wanted", "main"];

  const renderSection = (key) => {
    switch (key) {
      case "hero":
        return (
          <HeroLanding
            key="hero"
            q={q}
            onSearch={handleSearch}
            stats={stats}
            total={total}
            judul={heroTitle}
            subjudul={heroSubtitle}
            pwaSiap={pwaReady}
            onPasangPwa={handlePwaInstall}
          />
        );

      case "featured":
        if (!featured?.length) return null;
        return (
          <section key="featured" className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-[#6e6e73] dark:text-slate-400 uppercase tracking-tight">Unggulan</h2>
              <span className="text-[11px] font-semibold text-[#86868b] dark:text-slate-500">Dipromosikan</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden no-tap-highlight">
              {featured.map((f) => (
                <Link
                  key={f.id}
                  href={`/produk/${buildSlug(f.title, f.id)}`}
                  className="flex w-56 shrink-0 items-center gap-3 rounded-[20px] border border-black/[0.05] bg-white p-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 dark:border-white/[0.08] dark:bg-[#1c1c1e] active:scale-[0.98]"
                >
                  <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px] bg-black/[0.03] dark:bg-black/40">
                    {f.image_url && (
                      <Image src={f.image_url} alt={f.title} width={52} height={52} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#1d1d1f] dark:text-slate-200">{f.title}</p>
                    <p className="mt-0.5 text-[15px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">{rupiah(f.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "recently_viewed":
        if (!recentlyViewed.length) return null;
        return (
          <section key="recently_viewed" className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-[#6e6e73] dark:text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
                <Icon.Eye className="h-4 w-4" />
                Baru Dilihat
              </h2>
              <button
                onClick={() => {
                  try { localStorage.removeItem("recently_viewed"); } catch {}
                  setRecentlyViewed([]);
                }}
                className="text-[12px] font-medium text-[#0071e3] hover:underline dark:text-[#2997ff]"
              >
                Hapus
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden no-tap-highlight">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  href={`/produk/${item.slug}`}
                  className="flex w-[140px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-black/[0.05] bg-white transition hover:shadow-md hover:-translate-y-0.5 dark:border-white/[0.08] dark:bg-[#1c1c1e] active:scale-[0.98]"
                >
                  <div className="aspect-square bg-black/[0.03] dark:bg-black/40 overflow-hidden">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.title} width={144} height={144} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-gray-300 dark:text-slate-700">
                        <Icon.Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[13px] font-semibold text-[#1d1d1f] dark:text-slate-200">{item.title}</p>
                    <p className="mt-1 text-[14px] tracking-tight font-bold text-[#1d1d1f] dark:text-white">{rupiah(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "wanted":
        if (!wantedTeaser.length) return null;
        return (
          <section key="wanted" className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Ada yang Butuh Ini
              </h2>
              <Link href="/dicari" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Lihat semua →
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {wantedTeaser.map((w) => (
                <Link
                  key={w.id}
                  href="/dicari"
                  className="flex w-44 shrink-0 flex-col justify-between gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:hover:border-emerald-800/50"
                >
                  <div>
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 truncate max-w-full">
                      {w.category}
                    </span>
                    <p className="mt-1.5 text-xs font-bold text-gray-800 dark:text-white line-clamp-2 leading-snug">{w.title}</p>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {w.budget > 0 ? rupiah(w.budget) : "Budget nego"}
                  </p>
                </Link>
              ))}
              {/* CTA card */}
              <Link
                href="/dicari"
                className="flex w-36 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-emerald-200 bg-transparent p-3 text-center transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:hover:bg-emerald-900/10"
              >
                <Icon.Search className="h-5 w-5" />
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">Lihat semua yang dicari</span>
              </Link>
            </div>
          </section>
        );

      case "main":
        return (
          <div key="main" id="daftar-barang" className="scroll-mt-20">
            <div className="relative mb-5">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b] dark:text-slate-400"
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
                type="text"
                placeholder="Cari barang, jasa, kos..."
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-full border border-black/[0.05] bg-black/[0.03] py-3.5 pl-11 pr-12 text-[15px] focus:border-black/[0.1] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.02] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus:border-white/[0.15] dark:focus:bg-[#1c1c1e] transition-all"
              />
              {q && (
                <button
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    applyFilters({ newQ: "" });
                    syncToUrl({ q: "" });
                  }}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/[0.08] text-white hover:bg-black/[0.12] dark:bg-white/[0.12] dark:hover:bg-white/[0.2] transition-colors"
                  aria-label="Bersihkan pencarian"
                >
                  <Icon.X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter chips — single horizontal scroll with momentum and touch feedback */}
            <div className="mt-2.5 flex gap-1.5 xs:gap-2 overflow-x-auto pb-1 touch-pan-x no-tap-highlight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value)}
                aria-label="Urutkan"
                className="shrink-0 cursor-pointer appearance-none rounded-full border border-gray-200 bg-white px-3.5 py-1.5 min-h-[34px] text-xs font-semibold text-gray-700 outline-none transition active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Price */}
              <button
                type="button"
                onClick={() => setShowPriceFilter((v) => !v)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 min-h-[34px] text-xs font-semibold transition-all active:scale-95 ${showPriceFilter || minPrice || maxPrice
                    ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
              >
                Harga{minPrice || maxPrice ? <Icon.Check className="h-3.5 w-3.5" /> : null}
              </button>

              {/* Campus */}
              {["Semua", "USU", "POLMED"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCampus(c)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 min-h-[34px] text-xs font-semibold transition-all active:scale-95 ${campusFilter === c
                      ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
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
                  applyFilters({ newNego: next });
                  syncToUrl({ negoFilter: next });
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 min-h-[34px] text-xs font-semibold transition-all active:scale-95 ${negoFilter
                    ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
              >
                Nego{negoFilter ? <Icon.Check className="h-3.5 w-3.5" /> : null}
              </button>

              {/* Kondisi */}
              {["all", "new", "used"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setConditionFilter(c);
                    applyFilters({ newCondition: c });
                    syncToUrl({ conditionFilter: c });
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 min-h-[34px] text-xs font-semibold transition-all active:scale-95 ${conditionFilter === c
                    ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  {c === "all" ? "Semua Kondisi" : c === "new" ? <><Icon.Sparkles className="h-3.5 w-3.5" /> Baru</> : "Bekas"}
                </button>
              ))}

              {/* Tipe Sewa */}
              <button
                type="button"
                onClick={() => {
                  const next = typeFilter === "sewa" ? "default" : "sewa";
                  setTypeFilter(next);
                  applyFilters({ newType: next });
                  syncToUrl({ typeFilter: next });
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 min-h-[34px] text-xs font-semibold transition-all active:scale-95 ${typeFilter === "sewa"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-800 dark:text-slate-300"
                }`}
                >
                  <Icon.Key className="h-3.5 w-3.5" /> Sewa{typeFilter === "sewa" ? <Icon.Check className="h-3.5 w-3.5" /> : null}
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
                    setConditionFilter("all");
                    setTypeFilter("default");
                    setShowPriceFilter(false);
                    applyFilters({ newCat: "all", newQ: "", newSort: "bumped", newMin: "", newMax: "", newCampus: "Semua", newNego: false, newCondition: "all", newType: "default" });
                    syncToUrl({ cat: "all", q: "", sort: "bumped", minPrice: "", maxPrice: "", campusFilter: "Semua", negoFilter: false });
                  }}
                  className="shrink-0 px-3 py-1.5 min-h-[34px] text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 transition-transform"
                >
                  × Reset
                </button>
              )}
            </div>

            {/* Mobile Bottom Sheet Price Filter */}
            <BottomSheet
              isOpen={showPriceFilter}
              onClose={() => setShowPriceFilter(false)}
              title="Filter Rentang Harga"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Min (Rp)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3.5 py-2.5 text-base md:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Max (Rp)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Tanpa batas"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-3.5 py-2.5 text-base md:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      handlePriceApply();
                      setShowPriceFilter(false);
                    }}
                    className="flex-1 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md active:scale-95 transition-all"
                  >
                    Terapkan Filter
                  </button>
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={() => {
                        handlePriceClear();
                        setShowPriceFilter(false);
                      }}
                      className="px-5 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </BottomSheet>

            {/* Categories */}
            <div className="mt-3">
              <CategoryFilter active={cat} onChange={handleCat} categories={CATEGORIES} />
            </div>

            {cat !== "all" && availableSpecFilters.length > 0 && (
              <div className="mt-3 rounded-[28px] border border-black/[0.06] bg-white/80 p-3.5 backdrop-blur dark:border-white/[0.08] dark:bg-[#1c1c1e]/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#86868b] dark:text-slate-500">
                      Filter Spesifikasi
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-white">
                      Cari {catName(cat)} dengan atribut yang lebih spesifik
                    </p>
                  </div>
                  {selectedSpecFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecFilters([]);
                        applyFilters({ newSpecs: [] });
                        syncToUrl({ selectedSpecFilters: [] });
                      }}
                      className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/20"
                    >
                      Reset chip
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableSpecFilters.map((filter) => {
                    const active = selectedSpecFilters.some(
                      (item) => item.key === filter.key && item.value === filter.label
                    );
                    return (
                      <button
                        key={`${filter.key}:${filter.label}`}
                        type="button"
                        onClick={() => toggleSpecFilter(filter)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "border border-black/[0.08] bg-black/[0.02] text-[#3a3a3c] hover:border-black/[0.16] dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-slate-300"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                {selectedSpecFilters.length > 0 && (
                  <p className="mt-3 text-xs text-[#6e6e73] dark:text-slate-400">
                    Menyaring {selectedSpecFilters.length} atribut sekaligus. Semua chip harus cocok.
                  </p>
                )}
              </div>
            )}

            {/* Category subscribe button — tampil saat kategori tertentu dipilih */}
            {cat !== "all" && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatSubModal(true)}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <Icon.Bell className="h-4 w-4" /> Notif saya kalau ada iklan baru di <strong>{catName(cat)}</strong>
                </button>
              </div>
            )}

            {/* Modal subscribe kategori */}
            {showCatSubModal && (
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setShowCatSubModal(false)}
              >
                <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                    <p className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white"><Icon.Bell className="h-4 w-4" /> Notifikasi Kategori</p>
                    <button onClick={() => setShowCatSubModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><Icon.X className="h-5 w-5" /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Dapatkan notifikasi WA otomatis setiap ada iklan baru di kategori <strong className="text-gray-700 dark:text-slate-200">{catName(cat)}</strong>
                    </p>
                    <div>
                      <label className="label text-xs">Namamu</label>
                      <input
                        type="text"
                        value={catSubForm.name}
                        onChange={(e) => setCatSubForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nama panggilan kamu"
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        value={catSubForm.wa}
                        onChange={(e) => setCatSubForm((f) => ({ ...f, wa: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className="input text-sm"
                      />
                    </div>
                    <button
                      disabled={catSubBusy || !catSubForm.wa}
                      onClick={async () => {
                        if (!catSubForm.wa) return;
                        setCatSubBusy(true);
                        try {
                          const { toast: t } = await import("sonner");
                          const res = await fetch("/api/subscriptions/category", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              buyer_wa: catSubForm.wa,
                              buyer_name: catSubForm.name || null,
                              category: catName(cat),
                              campus: campusFilter,
                            }),
                          });
                          if (!res.ok) throw new Error((await res.json()).error);
                          t.success("Berhasil! Kamu akan dapat notif WA kalau ada iklan baru.");
                          setShowCatSubModal(false);
                          setCatSubForm({ name: "", wa: "" });
                        } catch (err) {
                          const { toast: t } = await import("sonner");
                          t.error(err.message);
                        } finally {
                          setCatSubBusy(false);
                        }
                      }}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      {catSubBusy ? "Menyimpan…" : <><Icon.Bell className="h-4 w-4" /> Aktifkan Notifikasi</>}
                    </button>
                    <p className="text-[10px] text-center text-gray-400">Untuk berhenti langganan, hubungi admin WA.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Count */}
            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              {searching ? "Mencari…" : `${total} iklan`}
            </p>

            {/* Grid */}
            {searching ? (
              <div className="mt-3">
                <ProductGridSkeleton count={8} />
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
                  Belum ada yang jual di kategori ini — kamu duluan yuk!
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
                        + Jual Barang Sekarang
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
    <main className="mx-auto w-full max-w-6xl px-4 pt-3 pb-6 overflow-hidden">
      {order.map(renderSection)}
    </main>
  );
}
