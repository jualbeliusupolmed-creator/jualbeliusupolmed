"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { toast } from "sonner";
import TagProdukPicker from "@/components/TagProdukPicker";
import ProductPeekSheet from "@/components/ProductPeekSheet";
import { useSesi } from "@/components/SesiProvider";
import UnduhMenfessModal from "@/components/mading/UnduhMenfessModal";
import { compressImage } from "@/lib/image";
import ProductCard from "@/components/ProductCard";

// Haptic feedback for tactile feel on mobile devices
function triggerHaptic(type = "light") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "light") navigator.vibrate(8);
      else if (type === "medium") navigator.vibrate(20);
      else if (type === "success") navigator.vibrate([10, 30, 15]);
    } catch {}
  }
}

// Umur relatif singkat untuk kartu feed
function waktuLalu(dateStr) {
  if (!dateStr) return "baru saja";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

// Skeleton card for feed loading state
function PostSkeleton() {
  return (
    <div className="apple-glass-card p-4 sm:p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="flex gap-4">
        <div className="h-6 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800 ml-auto" />
      </div>
    </div>
  );
}

export default function SuperAppHome({
  latestListings = [],
  madingPosts: initialMadingPosts = [],
  heroTitle,
  heroSubtitle
}) {
  // Feed States
  const [posts, setPosts] = useState(initialMadingPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialMadingPosts.length === 15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'menfess' | 'info'
  const [selectedCampus, setSelectedCampus] = useState("Semua"); // 'Semua' | 'USU' | 'POLMED' | 'Bebas'
  const [filterType, setFilterType] = useState("all"); // 'all' | 'popular' | 'photo'
  const [searchQuery, setSearchQuery] = useState(""); // keyword search
  const [showSearch, setShowSearch] = useState(false); // toggle search bar
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const router = useRouter();

  // Marketplace states (Center Showcase)
  const [listingCampus, setListingCampus] = useState("Semua"); // 'Semua' | 'USU' | 'POLMED'
  const [listingCategory, setListingCategory] = useState("Semua");
  const [listingSearch, setListingSearch] = useState("");
  const [mobileTab, setMobileTab] = useState("marketplace"); // 'marketplace' | 'openpo' | 'menfess'
  const [visibleListingCount, setVisibleListingCount] = useState(12);

  // Realtime Open PO Batches from Open PO Supabase
  const [poBatches, setPoBatches] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadPo() {
      try {
        const res = await fetch("/api/open-po");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.batches && data.batches.length > 0) {
          setPoBatches(data.batches);
        }
      } catch {}
    }
    loadPo();
    const interval = setInterval(loadPo, 35000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Live dynamic ticker rotation between Menfess, Open PO, and Jual Beli
  const [tickerIndex, setTickerIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setTickerIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const PO_TICKER_ITEMS = [
    { title: "Risol Mayo Lumer Mba Siti", sub: "Rp 12.000 • Buka PO USU Pintu 2" },
    { title: "Matcha Latte Creamy USU FIB", sub: "18/25 cup terpesan • Siap Kirim" },
    { title: "Kopi Susu Aren Literan", sub: "Rp 45.000 / 1L • Kuota hampir penuh" },
    { title: "Fudgy Brownies Panggang Bites", sub: "Buka PO Batch 6 • Diskon Mhs" },
    { title: "Kaos Angkatan Oversize Katun 24s", sub: "Sisa 12 Slot • Eksklusif Kampus" },
    { title: "Jastip Oleh-oleh & Snack Medan", sub: "Siap titip & antar se-kampus" },
  ];

  const renderCampusLiveTicker = () => {
    // 0: Menfess, 1: Open PO, 2: Jual Beli
    const tickerType = tickerIndex % 3;

    if (tickerType === 0) {
      // ── KONTEN MENFESS ──
      const activePost = posts && posts.length > 0 ? posts[tickerIndex % posts.length] : null;
      const text = activePost?.content || "Halo, ada rekomendasi kos dekat pintu 2 USU yang bersih & under 1 jt?";

      return (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setMobileTab("menfess");
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 text-left transition-all active:scale-[0.99] group shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600" />
            </span>
            <span className="text-[10px] font-extrabold text-violet-700 dark:text-violet-300 shrink-0">Menfess:</span>
            <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate min-w-0 flex-1">
              &ldquo;{text}&rdquo;
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-violet-600 dark:text-violet-400 shrink-0 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Buka</span>
            <Icon.ArrowRight className="w-2.5 h-2.5" />
          </span>
        </button>
      );
    }

    if (tickerType === 1) {
      // ── KONTEN OPEN PO REALTIME ──
      const pool = poBatches.length > 0 ? poBatches : PO_TICKER_ITEMS;
      const po = pool[Math.floor(tickerIndex / 3) % pool.length];
      const title = po?.name || po?.title || "Open PO Kampus";
      const info = po?.price
        ? `${rupiah(po.price)} • ${po.reserved || 0}/${po.quota || 0} terpesan`
        : po?.sub || "Buka PO Kampus";
      const targetUrl = po?.url || "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed";

      return (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setMobileTab("openpo");
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              window.open(targetUrl, "_blank", "noopener,noreferrer");
            }
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition-all active:scale-[0.99] group shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0">Open PO 🍵:</span>
            <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate min-w-0 flex-1">
              &ldquo;{title} — {info}&rdquo;
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            <span>Pesan</span>
            <Icon.ArrowRight className="w-2.5 h-2.5" />
          </span>
        </button>
      );
    }

    // ── KONTEN JUAL BELI (JB) ──
    const activeListing = latestListings && latestListings.length > 0
      ? latestListings[Math.floor(tickerIndex / 3) % latestListings.length]
      : null;
    const title = activeListing?.title || "MacBook Air M1 2020 Muluss";
    const harga = activeListing?.price ? rupiah(activeListing.price) : "COD Kampus";

    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          setMobileTab("marketplace");
          if (activeListing?.id) {
            router.push(`/produk/${activeListing.id}`);
          }
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-left transition-all active:scale-[0.99] group shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
          </span>
          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 shrink-0">Jual Beli 🛍️:</span>
          <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate min-w-0 flex-1">
            &ldquo;{title} — {harga}&rdquo;
          </span>
        </div>
        <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          <span>Cek</span>
          <Icon.ArrowRight className="w-2.5 h-2.5" />
        </span>
      </button>
    );
  };

  // Mobile pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    if (typeof window !== "undefined" && window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && typeof window !== "undefined" && window.scrollY <= 0) {
      setPullDistance(Math.min(diff * 0.45, 75));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic("medium");
      try {
        await loadNewPosts();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  // Debounce search query 350ms for server-side search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Live relative timestamp ticker — updates every 60 seconds so "x menit lalu" stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        setTick((t) => t + 1);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // New post banner state
  const [newPostCount, setNewPostCount] = useState(0);
  const latestKnownId = useRef(initialMadingPosts[0]?.id ?? null);
  const fetchingMoreRef = useRef(false);

  // Onboarding overlay
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarding_done")) {
      if (!window.location.search.includes("preview=1")) {
        setShowOnboarding(true);
      }
    }
  }, []);
  function dismissOnboarding() {
    localStorage.setItem("onboarding_done", "1");
    setShowOnboarding(false);
  }

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "200px", // Fetch slightly before it enters screen
  });

  // Poll every 60s for new posts, pausing when tab is not visible to save data and battery
  useEffect(() => {
    const poll = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/mading?page=1&limit=1");
        if (!res.ok) return;
        const data = await res.json();
        const newestId = data.posts?.[0]?.id;
        if (newestId && latestKnownId.current && newestId !== latestKnownId.current) {
          // Count how many are newer
          const res2 = await fetch("/api/mading?page=1&limit=5");
          if (!res2.ok) return;
          const data2 = await res2.json();
          const knownIdx = data2.posts?.findIndex(p => p.id === latestKnownId.current);
          const count = knownIdx >= 0 ? knownIdx : data2.posts?.length ?? 1;
          if (count > 0) setNewPostCount(count);
        }
      } catch {}
    }, 60000);
    return () => clearInterval(poll);
  }, []);

  async function loadNewPosts() {
    setNewPostCount(0);
    setIsLoadingMore(true);
    try {
      const query = new URLSearchParams({
        page: "1",
        limit: "15",
        ...(activeTab !== "all" && { type: activeTab }),
        ...(selectedCampus !== "Semua" && { faculty: selectedCampus }),
        ...(debouncedQuery && { q: debouncedQuery }),
      });
      const res = await fetch(`/api/mading?${query.toString()}`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.posts) {
        setPosts(d.posts);
        setPage(1);
        setHasMore(d.posts.length === 15);
        latestKnownId.current = d.posts[0]?.id ?? latestKnownId.current;
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Fetch more posts when bottom observer is in view
  useEffect(() => {
    if (!inView || !hasMore || fetchingMoreRef.current) return;

    let isSubscribed = true;
    async function fetchMore() {
      fetchingMoreRef.current = true;
      setIsLoadingMore(true);
      try {
        const nextPage = page + 1;
        const query = new URLSearchParams({
          page: String(nextPage),
          limit: "15",
          ...(activeTab !== "all" && { type: activeTab }),
          ...(selectedCampus !== "Semua" && { faculty: selectedCampus }),
          ...(debouncedQuery && { q: debouncedQuery }),
        });
        const res = await fetch(`/api/mading?${query.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data mading");
        const data = await res.json();
        if (isSubscribed) {
          if (data.posts && data.posts.length > 0) {
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newUnique = data.posts.filter((p) => !existingIds.has(p.id));
              return [...prev, ...newUnique];
            });
            setPage(nextPage);
            if (data.posts.length < 15) {
              setHasMore(false);
            }
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error("Error fetching more mading:", error);
        if (isSubscribed) {
          setHasMore(false);
          setFeedError(true);
        }
      } finally {
        fetchingMoreRef.current = false;
        if (isSubscribed) {
          setIsLoadingMore(false);
        }
      }
    }
    fetchMore();
    return () => {
      isSubscribed = false;
    };
  }, [inView, hasMore, page, activeTab, selectedCampus, debouncedQuery]);

  const isFirstRender = useRef(true);

  // When filters or search query change, reset and fetch from server
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let isMounted = true;
    async function resetAndFetch() {
      fetchingMoreRef.current = true;
      setIsLoadingMore(true);
      setFeedError(false);
      try {
        const query = new URLSearchParams({
          page: "1",
          limit: "15",
          ...(activeTab !== "all" && { type: activeTab }),
          ...(selectedCampus !== "Semua" && { faculty: selectedCampus }),
          ...(debouncedQuery && { q: debouncedQuery }),
        });
        const res = await fetch(`/api/mading?${query.toString()}`);
        const data = await res.json();
        if (isMounted) {
          setPosts(data.posts || []);
          setPage(1);
          setHasMore((data.posts || []).length === 15);
        }
      } catch (error) {
        console.error("Gagal filter", error);
        if (isMounted) setFeedError(true);
      } finally {
        fetchingMoreRef.current = false;
        if (isMounted) setIsLoadingMore(false);
      }
    }

    resetAndFetch();

    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedCampus, debouncedQuery]);

  // Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Write Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: "menfess",
    sender_name: "Anonim",
    faculty: "USU",
    title: "",
    content: "",
    is_anon: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [tagProduk, setTagProduk] = useState(null);
  const [intipProduk, setIntipProduk] = useState(null);
  const [unduhPost, setUnduhPost] = useState(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const { wa: userWa } = useSesi();
  const [requireLoginMenfess, setRequireLoginMenfess] = useState(true);

  // Restore Menfess Draft on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDraft = localStorage.getItem("menfess_draft");
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.content || parsed.title)) {
            setFormData((prev) => ({
              ...prev,
              type: parsed.type || prev.type,
              faculty: parsed.faculty || prev.faculty,
              title: parsed.title || prev.title,
              content: parsed.content || prev.content,
            }));
          }
        }
      } catch {}
    }
  }, []);

  // Helper to update formData and sync to draft localStorage
  const updateFormData = (patch) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(
          "menfess_draft",
          JSON.stringify({
            type: next.type,
            faculty: next.faculty,
            title: next.title,
            content: next.content,
          })
        );
      } catch {}
      return next;
    });
  };

  // User ID identifier for engagement
  const [userId, setUserId] = useState("");
  const viewedPostIds = useRef(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("modal") === "menfess") {
        setShowModal(true);
      }
      
      const campus = params.get("c");
      if (campus && ["Semua", "USU", "POLMED", "Bebas"].includes(campus)) {
        setSelectedCampus(campus);
      }

      let uid = localStorage.getItem("mading_user_id");
      if (!uid) {
        uid = "usr_" + Math.random().toString(36).substring(2, 12);
        localStorage.setItem("mading_user_id", uid);
      }
      setUserId(uid);

      fetch("/api/config")
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg?.mading?.requireLogin != null) {
            setRequireLoginMenfess(!!cfg.mading.requireLogin);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Track Views / Shares
  const trackEngagement = useCallback(
    async (postId, action) => {
      if (!userId || !postId) return;
      try {
        const res = await fetch(`/api/mading/${postId}/engagement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, clientId: userId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? { ...post, views_count: data.viewsCount, shares_count: data.sharesCount }
              : post
          )
        );
      } catch {}
    },
    [userId]
  );

  // Intersection observer for views count
  useEffect(() => {
    if (!userId || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.dataset.madingPostId;
          if (!entry.isIntersecting || !postId || viewedPostIds.current.has(postId)) return;
          viewedPostIds.current.add(postId);
          trackEngagement(postId, "view");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-mading-post-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [posts, userId, trackEngagement]);

  // Handle Like
  const handleLike = async (postId) => {
    if (!userId) return;
    triggerHaptic("light");
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p._isLiked;
          return {
            ...p,
            _isLiked: !isLiked,
            likes_count: isLiked ? Math.max(0, p.likes_count - 1) : (p.likes_count || 0) + 1,
          };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/mading/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
    } catch {}
  };

  // Handle Report Post
  const handleReport = async (postId) => {
    if (!userId) return;
    if (!confirm("Laporkan postingan ini ke tim kampus sebagai spam atau konten tidak pantas?")) return;
    triggerHaptic("medium");
    try {
      const res = await fetch(`/api/mading/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.pesan || "Laporan diterima. Terima kasih atas kepedulianmu!");
        if (data.disembunyikan) {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
      } else {
        toast.error(data.error || "Gagal mengirim laporan.");
      }
    } catch {
      toast.error("Gagal mengirim laporan.");
    }
  };

  // Toggle Comment Accordion
  const toggleComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    if (!commentsMap[postId]) {
      try {
        const res = await fetch(`/api/mading/${postId}/comments`);
        const data = await res.json();
        setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
      } catch {
        toast.error("Gagal memuat komentar.");
      }
    }
  };

  // Send Comment
  const handleSendComment = async (postId) => {
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/mading/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: "Mahasiswa",
          faculty: "Bebas",
          content: newCommentText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setNewCommentText("");
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
        );
        triggerHaptic("success");
        toast.success("Komentar terkirim!");
      } else {
        toast.error(data.error || "Gagal mengirim komentar.");
      }
    } catch {
      toast.error("Gagal mengirim komentar.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Share WhatsApp
  const handleShare = async (post) => {
    trackEngagement(post.id, "share");
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/mading#post-${post.id}` : "";
    const cleanSnippet = (post.content || "").trim().slice(0, 120);
    const titleText = post.title ? `*${post.title}*\n` : "";
    const shareText = ` *[Menfess & Info Kampus USU / POLMED]*\n${titleText}"${cleanSnippet}${post.content && post.content.length > 120 ? "..." : ""}"\n\n Baca & beri tanggapan:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: post.title || "Menfess USU POLMED",
          text: shareText,
          url: shareUrl,
        });
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p))
        );
        toast.success("Berhasil dibagikan!");
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Tautan disalin! Membuka WhatsApp…");
    } catch {}

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  // Handle Image Select with automatic client-side compression
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Format file harus berupa gambar (JPG, PNG, WebP).");
      return;
    }

    try {
      setCompressingImage(true);
      const compressed = await compressImage(file, { maxSizePx: 1200, quality: 0.8 });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.warn("Kompresi gagal, mencoba file asli:", err);
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran gambar terlalu besar (maksimal 5 MB). Silakan pilih foto lain.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setCompressingImage(false);
    }
  };

  // Handle Create Post Submit
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (requireLoginMenfess && !userWa) {
      toast.error("Silakan masuk dengan nomor WhatsApp terlebih dahulu untuk menerbitkan postingan.");
      return;
    }
    const cleanContent = (formData.content || "").trim();
    if (!cleanContent || cleanContent.length < 5) {
      toast.error("Isi postingan minimal 5 karakter!");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          imageUrl = uploadData.url;
        } else {
          toast.error(uploadData.error || "Gagal mengunggah foto lampiran.");
        }
      }

      const res = await fetch("/api/mading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          sender_name: formData.is_anon ? "Anonim" : formData.sender_name || "Mahasiswa",
          faculty: formData.faculty,
          title: formData.type === "info" ? formData.title : null,
          content: cleanContent,
          image_url: imageUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast.error(data.error || "Silakan masuk dengan WhatsApp terlebih dahulu.");
        return;
      }
      if (data.success) {
        triggerHaptic("success");
        toast.success("Menfess berhasil dikirim!");
        try {
          localStorage.removeItem("menfess_draft");
        } catch {}
        setShowModal(false);
        setFormData({
          type: "menfess",
          sender_name: "Anonim",
          faculty: "USU",
          title: "",
          content: "",
          is_anon: true,
        });
        setImageFile(null);
        setImagePreview("");
        // Reload posts
        loadNewPosts();
      } else {
        toast.error(data.error || "Gagal mengirim menfess.");
      }
    } catch (err) {
      toast.error(err?.message && err.message !== "Failed to fetch" ? err.message : "Gagal mengirim postingan. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Sorted Feed
  const filteredPosts = posts
    .filter((post) => {
      if (activeTab !== "all" && post.type !== activeTab) return false;
      if (selectedCampus !== "Semua" && post.faculty !== selectedCampus) return false;
      if (filterType === "photo" && !post.image_url) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inContent = (post.content || "").toLowerCase().includes(q);
        const inTitle = (post.title || "").toLowerCase().includes(q);
        const inName = (post.sender_name || "").toLowerCase().includes(q);
        if (!inContent && !inTitle && !inName) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filterType === "popular") {
        const scoreA = (a.views_count || 0) + (a.likes_count || 0) * 3 + (a.comments_count || 0) * 2;
        const scoreB = (b.views_count || 0) + (b.likes_count || 0) * 3 + (b.comments_count || 0) * 2;
        return scoreB - scoreA;
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  // Filtered Marketplace Listings for Center Column
  const filteredListings = latestListings.filter((ad) => {
    if (listingCampus !== "Semua" && ad.campus !== listingCampus && ad.campus !== "Semua") {
      return false;
    }
    if (listingCategory !== "Semua") {
      const combined = `${ad.category || ""} ${ad.title || ""} ${ad.description || ""}`.toLowerCase();
      if (!combined.includes(listingCategory.toLowerCase())) return false;
    }
    if (listingSearch.trim()) {
      const q = listingSearch.toLowerCase();
      const inTitle = (ad.title || "").toLowerCase().includes(q);
      const inSeller = (ad.seller_name || "").toLowerCase().includes(q);
      const inCampus = (ad.campus || "").toLowerCase().includes(q);
      const inDesc = (ad.description || "").toLowerCase().includes(q);
      if (!inTitle && !inSeller && !inCampus && !inDesc) return false;
    }
    return true;
  });

  const renderPostCard = (post, isSidebar = false) => {
    const isInfo = post.type === "info";
    return (
      <div
        key={post.id}
        data-mading-post-id={post.id}
        className={`apple-glass-card ${isSidebar ? "p-3.5 sm:p-4 text-xs" : "p-4 sm:p-5"} relative group`}
      >
        {/* Top Header */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`flex ${isSidebar ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"} shrink-0 items-center justify-center rounded-full ${
              isInfo
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"
            }`}
          >
            {isInfo ? <Icon.Megaphone className="h-3.5 w-3.5" /> : <Icon.User className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`truncate ${isSidebar ? "text-[12px]" : "text-[13px]"} font-bold text-[#1d1d1f] dark:text-[#f5f5f7]`}>
                {post.sender_name || "Anonim"}
              </p>
              <span className="rounded-md bg-black/[0.04] px-1.5 py-0.2 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
                {post.faculty || "USU"}
              </span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                  isInfo
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                }`}
              >
                {isInfo ? "Info Kampus" : "Menfess"}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {waktuLalu(post.created_at)}
            </p>
          </div>
          {/* Report post button */}
          <button
            type="button"
            onClick={() => handleReport(post.id)}
            title="Laporkan postingan"
            aria-label="Laporkan postingan"
            className="opacity-30 hover:opacity-100 hover:text-rose-500 text-slate-400 p-1 rounded-lg transition-all"
          >
            <Icon.Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title (If Info) */}
        {post.title && (
          <h4 className={`mt-1.5 mb-0.5 ${isSidebar ? "text-[13px]" : "text-[14px]"} font-bold text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug`}>
            {post.title}
          </h4>
        )}

        {/* Content Body */}
        <p className={`${isSidebar ? "text-[12px] leading-[1.45]" : "text-[13px] leading-[1.5]"} text-[#1d1d1f] dark:text-gray-200 whitespace-pre-wrap mt-0.5`}>
          {post.content}
        </p>

        {/* Attached Image */}
        {post.image_url && (
          <div
            onClick={() => setZoomImage(post.image_url)}
            className="mt-2.5 rounded-[14px] sm:rounded-[16px] overflow-hidden border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/30 cursor-zoom-in relative aspect-[16/9] w-full max-h-64"
          >
            <Image
              src={post.image_url}
              alt={post.title ? `Foto ${post.title}` : "Foto menfess"}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}

        {/* Tagged product */}
        {post.listings && (
          <button
            type="button"
            onClick={() => setIntipProduk(post.listings)}
            className="mt-2.5 flex w-full items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.05] p-2 text-left transition-all active:scale-[0.99] hover:bg-primary/[0.09]"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/[0.06] dark:bg-white/[0.08]">
              {post.listings.image_url || post.listings.images?.[0] ? (
                <img
                  src={post.listings.image_url || post.listings.images[0]}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">
                  <Icon.Box className="h-4 w-4" />
                </div>
              )}
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold text-[#1d1d1f] dark:text-white">
                {post.listings.title}
              </span>
              <span className="block text-[10px] font-extrabold text-primary dark:text-violet-400">
                {rupiah(post.listings.price)}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white">
              Lihat
            </span>
          </button>
        )}

        {/* Bottom Action Bar */}
        <div className="mt-3 flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => handleLike(post.id)}
              aria-label={`Sukai postingan, ${post.likes_count || 0} suka`}
              className={`flex items-center gap-1 py-1 px-1.5 rounded-lg transition-colors ${
                post._isLiked ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30" : "hover:text-rose-500"
              }`}
            >
              <Icon.Heart className={`h-3.5 w-3.5 ${post._isLiked ? "fill-current text-rose-500" : ""}`} />
              <span className="font-bold text-xs">{post.likes_count || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleComments(post.id)}
              aria-label={`Buka komentar, ${post.comments_count || 0} komentar`}
              className={`flex items-center gap-1 py-1 px-1.5 rounded-lg transition-colors ${
                activeCommentsPostId === post.id ? "text-primary bg-primary/10" : "hover:text-primary"
              }`}
            >
              <Icon.MessageCircle className="h-3.5 w-3.5" />
              <span className="font-bold text-xs">{post.comments_count || 0}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setUnduhPost(post);
              }}
              aria-label="Unduh gambar untuk Instagram Story atau Status WhatsApp"
              title="Unduh gambar Story / Status"
              className="flex items-center gap-1 py-1 px-1.5 rounded-lg text-slate-500 hover:text-primary transition-colors active:scale-95"
            >
              <Icon.Download className="h-3.5 w-3.5" />
              <span className="font-bold text-[11px] hidden sm:inline">Story IG</span>
            </button>

            <button
              type="button"
              onClick={() => handleShare(post)}
              aria-label="Bagikan postingan ini ke WhatsApp"
              className="flex items-center gap-1 py-1 px-1.5 rounded-lg hover:text-emerald-600 transition-colors"
            >
              <Icon.Share className="h-3.5 w-3.5" />
            </button>

            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5 pl-1">
              <Icon.Eye className="h-3 w-3" />
              <span>{post.views_count || 0}</span>
            </span>
          </div>
        </div>

        {/* Comments Accordion */}
        {activeCommentsPostId === post.id && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {(commentsMap[post.id] || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-1.5">
                  Belum ada tanggapan. Balas pertama kali!
                </p>
              ) : (
                commentsMap[post.id].map((c) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-xl text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{c.sender_name}</span>
                      <span className="text-[9px] text-slate-400">{waktuLalu(c.created_at)}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-snug">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendComment(post.id);
                }}
                placeholder="Tulis balasan anonim…"
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                onClick={() => handleSendComment(post.id)}
                disabled={submittingComment || !newCommentText.trim()}
                className="bg-primary disabled:opacity-50 text-white px-3 py-1 rounded-full text-xs font-bold hover:brightness-105 transition-all shrink-0"
              >
                Kirim
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 sm:pb-16 md:pb-8 font-sans selection:bg-primary/20 dark:bg-transparent">

      {/* ── ONBOARDING OVERLAY (first visit only) ── */}
      {showOnboarding && (
        <div data-mobile-overlay="onboarding" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] w-full max-w-sm p-6 shadow-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Icon.Store className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-center text-[#1d1d1f] dark:text-white mb-1">Selamat Datang! 👋</h2>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-5">Platform kampus USU &amp; POLMED — semua dalam satu tempat</p>
            <div className="space-y-3 mb-5">
              {[
                { icon: Icon.ShoppingBag, label: "Marketplace", desc: "Jual &amp; beli barang bekas kampus" },
                { icon: Icon.Mail, label: "Menfess", desc: "Kirim pesan anonim ke seluruh kampus" },
                { icon: Icon.MessageCircle, label: "Chat Langsung", desc: "Ngobrol dengan penjual via chat" },
                { icon: Icon.Search, label: "Barang Dicari", desc: "Posting apa yang kamu butuhkan" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1d1d1f] dark:text-white">{f.label}</p>
                    <p className="text-[11px] text-slate-500" dangerouslySetInnerHTML={{ __html: f.desc }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={dismissOnboarding}
              className="w-full bg-[#0071e3] text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-[#0077ed] transition-colors shadow-md"
            >
              Mulai Jelajahi 🚀
            </button>
          </div>
        </div>
      )}
      
      {/* ── Layout Container Desktop: Scroll Natural ── */}
      <div className="w-full px-3 sm:px-4 md:px-4 md:pt-4">

        {/* ── SEGMENTED TAB SWITCHER: Marketplace vs Open PO vs Menfess (Mobile & Desktop) ── */}
        <div className="w-full max-w-xl mx-auto mb-3 sm:mb-4 space-y-2">
          <div className="apple-segmented w-full p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl flex gap-1 shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setMobileTab("marketplace");
              }}
              className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                mobileTab === "marketplace"
                  ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Icon.ShoppingBag className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">Marketplace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setMobileTab("openpo");
              }}
              className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                mobileTab === "openpo"
                  ? "bg-white dark:bg-[#2c2c2e] text-emerald-600 dark:text-emerald-400 shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <span className="text-xs sm:text-sm leading-none shrink-0">🍵</span>
              <span className="truncate">Open PO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setMobileTab("menfess");
              }}
              className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 ${
                mobileTab === "menfess"
                  ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-2xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Icon.Heart className="w-3.5 h-3.5 text-rose-500 fill-current shrink-0" />
              <span className="truncate min-[370px]:hidden">Menfess</span>
              <span className="hidden min-[370px]:inline truncate">Curhat &amp; Menfess</span>
              {newPostCount > 0 && (
                <span className="text-[9px] py-0.2 px-1 rounded-full bg-rose-500 text-white font-extrabold shrink-0">
                  {newPostCount}
                </span>
              )}
            </button>
          </div>

          {/* Live Campus Buzz Ticker (Berubah-ubah dinamis antara Menfess, Open PO, dan Jual Beli) */}
          {mobileTab === "marketplace" && renderCampusLiveTicker()}
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          
          {/* ═══════════════════════════════════════
              KOLOM TENGAH — Marketplace Utama (Jualan di Tengah)
              Visible when mobileTab === 'marketplace'
          ═══════════════════════════════════════ */}
          <div className={`flex-1 min-w-0 space-y-3 w-full ${mobileTab !== "marketplace" ? "hidden" : ""}`}>

            {/* ── 1. MARKETPLACE SEARCH BAR SEJAJAR KATEGORI & KAMPUS ── */}
            <section className="apple-glass-card p-2 sm:p-2.5">
              {/* SEARCH INPUT SEJAJAR DENGAN DROPDOWN KATEGORI & KAMPUS */}
              <div className="flex items-center gap-1 sm:gap-2 w-full">
                {/* Search Bar Input */}
                <div className="relative flex-1 min-w-0">
                  <Icon.Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    placeholder="Cari barang..."
                    className="w-full min-w-0 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] rounded-xl pl-6.5 pr-5 sm:pr-8 py-1.5 sm:py-2 text-[11px] sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                  {listingSearch && (
                    <button
                      type="button"
                      onClick={() => setListingSearch("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    >
                      <Icon.X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dropdown Kategori (Sejajar dengan Search) */}
                <div className="relative shrink-0 w-[68px] sm:w-[96px]">
                  <select
                    value={listingCategory}
                    onChange={(e) => {
                      triggerHaptic("light");
                      setListingCategory(e.target.value);
                    }}
                    className="w-full appearance-none bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 text-[10px] sm:text-xs font-bold rounded-xl pl-1.5 pr-3.5 py-1.5 sm:py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all truncate"
                  >
                    <option value="Semua">Kategori</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Buku">Buku</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Kos">Kos</option>
                    <option value="Jasa">Jasa</option>
                    <option value="Makanan">Makanan</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                    <Icon.ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                </div>

                {/* Dropdown Kampus (Sejajar dengan Search) */}
                <div className="relative shrink-0 w-[64px] sm:w-[90px]">
                  <select
                    value={listingCampus}
                    onChange={(e) => {
                      triggerHaptic("light");
                      setListingCampus(e.target.value);
                    }}
                    className="w-full appearance-none bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 text-[10px] sm:text-xs font-bold rounded-xl pl-1.5 pr-3.5 py-1.5 sm:py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all truncate"
                  >
                    <option value="Semua">Kampus</option>
                    <option value="USU">USU</option>
                    <option value="POLMED">POLMED</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                    <Icon.ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2. PRODUCT GRID (JUALAN DI TENGAH) ── */}
            <section>
              {filteredListings.length === 0 ? (
                <div className="apple-glass-card text-center py-12 px-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                    <Icon.Package className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">Belum ada barang di filter ini</p>
                  <p className="text-xs text-slate-500 mt-1">Coba ganti kategori, cari kata kunci lain, atau reset filter.</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setListingCategory("Semua");
                        setListingCampus("Semua");
                        setListingSearch("");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      Reset Filter
                    </button>
                    <Link
                      href="/jual"
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:brightness-105"
                    >
                      + Pasang Iklan Sekarang
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
                  {filteredListings.slice(0, visibleListingCount).map((ad) => (
                    <ProductCard key={ad.id} listing={ad} />
                  ))}
                </div>
              )}

              {filteredListings.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  {visibleListingCount < filteredListings.length && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setVisibleListingCount((prev) => prev + 12);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/15 dark:bg-violet-500/15 border border-primary/20 dark:border-violet-500/25 text-xs font-bold text-primary dark:text-violet-300 shadow-2xs transition-all active:scale-95"
                    >
                      <Icon.Plus className="w-3.5 h-3.5" />
                      <span>Muat 12 Barang Lainnya ({filteredListings.length - visibleListingCount} lagi)</span>
                    </button>
                  )}
                  <Link
                    href="/jual-beli"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all active:scale-95"
                  >
                    <span>Jelajahi Seluruh {filteredListings.length}+ Produk</span>
                    <Icon.ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </Link>
                </div>
              )}
            </section>

            {/* ── 3. QUICK FEATURES BAR (SWIPE & CHAT) ── */}
            <section className="grid grid-cols-2 gap-2.5">
              <Link
                href="/teman"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br from-orange-500/10 via-rose-500/10 to-purple-500/10 dark:from-orange-950/30 dark:via-rose-950/20 dark:to-purple-950/30 border border-orange-200/80 dark:border-orange-500/20 active:scale-[0.98] transition-all shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Icon.Flame className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-[#1d1d1f] dark:text-white truncate">Cari Teman</span>
                    <span className="text-[8.5px] font-black uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Swipe</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Kenalan sesama kampus</p>
                </div>
              </Link>

              <Link
                href="/chat?anon=1"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-indigo-500/10 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 border border-violet-200/80 dark:border-violet-500/20 active:scale-[0.98] transition-all shadow-2xs group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Icon.MessageCircle className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-[#1d1d1f] dark:text-white truncate">Chat Anonim</span>
                    <span className="text-[8.5px] font-black uppercase tracking-wider bg-violet-600 text-white px-1.5 py-0.5 rounded-full">Live</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Ngobrol 1-on-1 rahasia</p>
                </div>
              </Link>
            </section>

            {/* Mobile bottom card to jump to Menfess */}
            <div className="lg:hidden apple-glass-card p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-[#1d1d1f] dark:text-white">Curhat &amp; Menfess Kampus</p>
                <p className="text-[10.5px] text-slate-400">Suara anonim, cerita &amp; info mahasiswa</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setMobileTab("menfess");
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0 flex items-center gap-1"
              >
                <span>Buka Menfess</span>
                <Icon.ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>{/* end kolom tengah */}

          {/* ════════════════════════════════════════
          {/* ════════════════════════════════════════
              OPEN PO SECTION (MOBILE & DESKTOP when mobileTab === 'openpo')
              "konten open po real dan terintegrasi secara realtime dari Supabase Open PO"
          ════════════════════════════════════════ */}
          <div className={`w-full max-w-4xl mx-auto space-y-4 ${mobileTab !== "openpo" ? "hidden" : "block"}`}>
            {/* Open PO Banner */}
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10.5px] sm:text-xs font-extrabold tracking-wide uppercase">
                  <span>🍵</span>
                  <span>Eksklusif Mahasiswa USU &amp; POLMED</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                  Open PO Kampus — Pesan Langsung dari Mahasiswa
                </h2>
                <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
                  Pesan makanan favorit, minuman viral, kaos angkatan, &amp; merchandise langsung dari sesama mahasiswa. Tanpa biaya admin tersembunyi!
                </p>
                <div className="pt-1.5 flex flex-wrap items-center gap-2">
                  <a
                    href="https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-emerald-900 text-xs sm:text-sm font-black shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
                  >
                    <span>Buka Web Utama Open PO</span>
                    <Icon.ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                  </a>
                  <span className="text-[11px] text-emerald-100 font-medium">
                    ⚡ Data batch terintegrasi otomatis
                  </span>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-6 text-8xl sm:text-9xl opacity-20 pointer-events-none select-none">
                🍵
              </div>
            </div>

            {/* List Item PO Populer Realtime */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                    Batch PO Aktif Sekarang
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {poBatches.length > 0 ? `${poBatches.length} Batch` : "Live"}
                  </span>
                </div>
                <a
                  href="https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua di Open PO</span>
                  <Icon.ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Cards PO Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {(poBatches.length > 0 ? poBatches : [
                  {
                    id: "fallback-risol",
                    name: "Risol Mayo Lumer Mba Siti",
                    category: "Kuliner",
                    price: 12000,
                    quota: 30,
                    reserved: 24,
                    pickup_point: "USU Pintu 2",
                    seller_name: "Nadia Putri",
                    faculty: "Fakultas Pertanian",
                    photo: "/images/risol-mayo.jpg",
                    emoji: "🥟",
                    url: "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
                  },
                  {
                    id: "fallback-matcha",
                    name: "Cold Brew Matcha Latte Creamy",
                    category: "Minuman",
                    price: 18000,
                    quota: 25,
                    reserved: 18,
                    pickup_point: "Selasar FIB USU",
                    seller_name: "Ahmad Zaki",
                    faculty: "Fakultas Ilmu Budaya",
                    photo: "/images/matcha-latte.jpg",
                    emoji: "🍵",
                    url: "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
                  },
                ]).map((item, idx) => {
                  const quotaNum = Number(item.quota) || 0;
                  const resNum = Number(item.reserved) || 0;
                  const pct = quotaNum > 0 ? Math.min(100, Math.round((resNum / quotaNum) * 100)) : 0;
                  const isHampirPenuh = pct >= 80;

                  return (
                    <a
                      key={item.id || idx}
                      href={item.url || "https://open-po.vercel.app"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-glass-card p-3.5 sm:p-4 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-500/50 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                    >
                      {/* Top Header: Image + Details */}
                      <div className="flex items-start gap-3">
                        <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shrink-0 bg-emerald-500/10 border border-black/[0.04] dark:border-white/[0.06]">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name || item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              {item.emoji || "🍵"}
                            </div>
                          )}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                            {item.emoji || "🍵"}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {item.category || "Kampus"}
                            </span>
                            {isHampirPenuh && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                🔥 Sisa Sedikit
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {item.name || item.title}
                          </h4>

                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Oleh <span className="font-semibold text-slate-700 dark:text-slate-300">{item.seller_name || "Mahasiswa"}</span> • {item.faculty || "USU/POLMED"}
                          </p>

                          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {typeof item.price === "number" ? rupiah(item.price) : item.price}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Quota Progress Bar */}
                      <div className="space-y-1 pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Kuota: <strong className="text-slate-800 dark:text-white">{resNum}/{quotaNum}</strong>
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {pct}% Terpesan
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/[0.05] dark:bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Footer: Pickup & CTA */}
                      <div className="flex items-center justify-between text-[10.5px] pt-1">
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[55%] flex items-center gap-1">
                          <span>📍</span>
                          <span className="truncate">{item.pickup_point || "Kampus"}</span>
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Pesan di Open PO</span>
                          <Icon.ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Banner Buka PO Sendiri */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-dashed border-emerald-500/30 text-center space-y-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xl mx-auto">
                📦
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Mau Jual Makanan atau Merchandise dengan Sistem PO?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Buka pesanan tanpa modal nombok, kelola kuota, catatan pickup, dan rekap otomatis bersama komunitas mahasiswa.
              </p>
              <div className="pt-1">
                <a
                  href="https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <span>Buka PO Kamu Sekarang</span>
                  <Icon.ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              MENFESS FEED (MOBILE & DESKTOP when mobileTab === 'menfess')
          ════════════════════════════════════════ */}
          <div className={`w-full max-w-3xl mx-auto space-y-4 ${mobileTab !== "menfess" ? "hidden" : "block"}`}>
            <section
              className="w-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Pull to refresh visual indicator */}
              {(pullDistance > 0 || isRefreshing) && (
                <div
                  style={{ height: `${pullDistance}px` }}
                  className="overflow-hidden transition-[height] duration-150 flex items-center justify-center text-xs font-semibold text-primary mb-2"
                >
                  <div className="flex items-center gap-2 py-1 px-3.5 bg-primary/10 dark:bg-primary/20 rounded-full text-xs text-primary">
                    <Icon.RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing || pullDistance > 50 ? "animate-spin" : ""}`} />
                    <span>{isRefreshing ? "Menyegarkan feed..." : pullDistance > 50 ? "Lepaskan untuk segarkan" : "Tarik untuk segarkan"}</span>
                  </div>
                </div>
              )}

              {/* Banner: ada postingan baru */}
              {newPostCount > 0 && (
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    loadNewPosts();
                  }}
                  className="w-full mb-3 flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-md hover:brightness-105 transition-all animate-in slide-in-from-top-3 duration-300"
                >
                  <Icon.ArrowUp className="w-3.5 h-3.5" />
                  Ada {newPostCount} postingan baru — klik untuk muat
                </button>
              )}

              {/* Section Header Menfess Mobile */}
              <div className="apple-glass-card rounded-2xl px-3.5 py-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                      <Icon.Heart className="h-4 w-4 text-rose-500 fill-current" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-xs text-[#1d1d1f] dark:text-white">
                        Curhat &amp; Menfess
                      </h2>
                      <p className="text-[10px] text-slate-400">Postingan anonim mahasiswa</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="apple-segmented shrink-0">
                      {[
                        { id: "all", label: "Semua" },
                        { id: "menfess", label: "Menfess" },
                        { id: "info", label: "Info" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            triggerHaptic("light");
                            setActiveTab(tab.id);
                          }}
                          className={`px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full transition-all whitespace-nowrap ${
                            activeTab === tab.id
                              ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-2xs font-bold"
                              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic("medium");
                        updateFormData({ type: activeTab === "info" ? "info" : "menfess" });
                        setShowModal(true);
                      }}
                      className="h-[28px] flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-2.5 rounded-full text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                    >
                      <Icon.Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Tulis</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Posts list */}
              <div className="flex flex-col gap-3.5 mb-10">
                {filteredPosts.map((post) => renderPostCard(post, false))}
                {hasMore && !feedError && (
                  <div ref={loadMoreRef} className="py-6 flex flex-col justify-center items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <span className="text-[10px] text-slate-400">Memuat menfess lainnya...</span>
                  </div>
                )}
                {!hasMore && filteredPosts.length > 0 && (
                  <div className="py-6 text-center">
                    <p className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                      <span>✨</span>
                      <span>Semua menfess terbaru sudah ditampilkan — Kirim menfessmu sekarang!</span>
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ════════════════════════════════════════
              SIDEBAR KANAN — Menfess & Mading Kampus (DESKTOP)
          ════════════════════════════════════════ */}
          <aside className={`w-[320px] xl:w-[350px] shrink-0 sticky top-6 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mobileTab === "marketplace" ? "hidden lg:block" : "hidden"}`}>

            {/* Menfess Feed Widget di Kanan */}
            <div className="apple-glass-card p-4">
              {/* Header with Title and Tulis Button */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/[0.04] dark:border-white/[0.06] mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <Icon.Heart className="w-4 h-4 text-rose-500 fill-current" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-[#1d1d1f] dark:text-white leading-tight">
                      Curhat &amp; Menfess
                    </h2>
                    <p className="text-[10px] text-slate-400">Suara anonim USU &amp; POLMED</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic("medium");
                    setShowModal(true);
                  }}
                  className="h-[28px] px-3 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all shrink-0"
                >
                  <Icon.Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Tulis</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[10.5px] font-semibold text-slate-400">Filter feed:</span>
                <div className="apple-segmented shrink-0">
                  {[
                    { id: "all", label: "Semua" },
                    { id: "menfess", label: "Menfess" },
                    { id: "info", label: "Info" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        triggerHaptic("light");
                        setActiveTab(tab.id);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed Posts List */}
              <div className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-6 px-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum ada postingan</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-2 text-xs font-bold text-primary hover:underline"
                    >
                      + Kirim yang pertama
                    </button>
                  </div>
                ) : (
                  filteredPosts.slice(0, 7).map((post) => (
                    <div
                      key={post.id}
                      className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] hover:border-black/[0.08] dark:hover:border-white/[0.1] transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {post.type === "info" ? "📢" : "🤫"}
                          </div>
                          <span className="font-bold text-[11px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {post.sender_name || "Anonim"}
                          </span>
                          <span className="rounded bg-black/[0.04] dark:bg-white/[0.08] px-1 py-0.2 text-[9px] font-semibold text-gray-500">
                            {post.faculty || "USU"}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 shrink-0">
                          {waktuLalu(post.created_at)}
                        </span>
                      </div>

                      {post.title && (
                        <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white mb-0.5 line-clamp-1">
                          {post.title}
                        </h4>
                      )}

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 mb-2">
                        {post.content}
                      </p>

                      {/* Thumbnail image if exists */}
                      {post.image_url && (
                        <div
                          onClick={() => setZoomImage(post.image_url)}
                          className="mb-2 rounded-xl overflow-hidden aspect-[16/9] w-full max-h-36 relative cursor-zoom-in"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Post action bar */}
                      <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-black/[0.03] dark:border-white/[0.04] text-[10px]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 hover:text-rose-500 transition-colors ${
                              post._isLiked ? "text-rose-500 font-bold" : ""
                            }`}
                          >
                            <Icon.Heart className={`w-3.5 h-3.5 ${post._isLiked ? "fill-current text-rose-500" : ""}`} />
                            <span>{post.likes_count || 0}</span>
                          </button>

                          <Link
                            href={`/mading#post-${post.id}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Icon.MessageCircle className="w-3.5 h-3.5" />
                            <span>{post.comments_count || 0}</span>
                          </Link>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleShare(post)}
                          className="hover:text-emerald-600 transition-colors flex items-center gap-1"
                        >
                          <Icon.Share className="w-3 h-3" />
                          <span>Bagikan</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom link to /mading */}
              <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                <Link
                  href="/mading"
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs font-bold text-primary transition-colors active:scale-95"
                >
                  <span>Buka Seluruh Mading &amp; Menfess</span>
                  <Icon.ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </aside>

        </div>{/* end flex */}
      </div>{/* end container */}

      {/* ── 6. WRITE POST MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-t-[32px] sm:rounded-[24px] w-full max-w-md p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl border-t sm:border border-black/[0.06] dark:border-white/[0.08] relative max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 sm:hidden" />

            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full font-bold bg-slate-100 dark:bg-slate-800 sm:bg-transparent"
            >
              <Icon.X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight mb-4">
              Kirim Menfess &amp; Info Kampus
            </h2>

            {requireLoginMenfess && !userWa && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs mb-4">
                <div className="flex items-center gap-2">
                  <Icon.User className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    Masuk via WhatsApp untuk mengirim menfess. Draf ketikanmu tersimpan aman!
                  </span>
                </div>
                <Link
                  href="/login?kembali=/"
                  className="shrink-0 ml-2 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors"
                >
                  Masuk
                </Link>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Kunci form jika login diperlukan tapi user belum login */}
              {(() => {
                const formLocked = requireLoginMenfess && !userWa;
                return (
                  <>
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => updateFormData({ type: "menfess" })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    formData.type === "menfess"
                      ? "bg-white dark:bg-slate-700 text-amber-600 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
            <span className="inline-flex items-center gap-1.5"><Icon.Mail className="h-4 w-4" />Menfess</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData({ type: "info" })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    formData.type === "info"
                      ? "bg-white dark:bg-slate-700 text-fuchsia-600 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
            <span className="inline-flex items-center gap-1.5"><Icon.Megaphone className="h-4 w-4" />Info Kampus</span>
                </button>
              </div>

              {/* Title (Only for info) */}
              {formData.type === "info" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Judul Pengumuman / Event
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    placeholder="Contoh: Oprec Panitia BEM USU 2026"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}

              {/* Campus Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Kampus / Asal
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => updateFormData({ faculty: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="USU">USU (Universitas Sumatera Utara)</option>
                  <option value="POLMED">POLMED (Politeknik Negeri Medan)</option>
                  <option value="Bebas">Umum / Bebas</option>
                </select>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Isi Pesan
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => updateFormData({ content: e.target.value })}
                  placeholder={
                    formData.type === "menfess"
                      ? "Tuliskan curhatan, kekaguman, atau pesan anonim kamu…"
                      : "Tuliskan detail info, jadwal, atau pengumuman kampus…"
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Optional Photo Attachment */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                  <span>Foto Pendukung (Opsional)</span>
                  {compressingImage && (
                    <span className="text-[10px] text-primary animate-pulse font-medium">Mengompres foto…</span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={compressingImage}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {imagePreview && (
                  <div className="mt-2 relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 text-[10px] transition-colors"
                      title="Hapus foto"
                    >
                      <Icon.X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tag produk jualan */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Produk Jualan (Opsional)
                </label>
                <TagProdukPicker value={tagProduk} onChange={setTagProduk} />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || compressingImage || formLocked}
                className="w-full bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] disabled:opacity-50 py-3 rounded-full text-[13px] font-bold hover:scale-[0.98] active:scale-95 transition-transform shadow-md"
              >
                {submitting ? "Mengirimkan…" : compressingImage ? "Menyiapkan foto…" : formLocked ? "Login dulu untuk kirim" : "Terbitkan Sekarang"}
              </button>
            </>
            );
          })()}
            </form>
          </div>
        </div>
      )}

      {/* ── 7. LIGHTBOX ZOOM MODAL ── */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
        >
          <img src={zoomImage} alt="Zoom" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        </div>
      )}

      {/* ── 8. PRATINJAU PRODUK FEED ── */}
      <ProductPeekSheet
        listing={intipProduk}
        isOpen={!!intipProduk}
        onClose={() => setIntipProduk(null)}
      />

      {/* ── 9. MODAL UNDUH MENFESS (STORY IG / STATUS WA) ── */}
      {unduhPost && (
        <UnduhMenfessModal
          post={unduhPost}
          onClose={() => setUnduhPost(null)}
        />
      )}


    </div>
  );
}
