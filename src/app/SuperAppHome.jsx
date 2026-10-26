"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import CreateSheet from "@/components/CreateSheet";
import OTPModal from "@/components/OTPModal";

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

const FALLBACK_PO_BATCHES = [
  {
    id: "po-risol-mayo",
    title: "Risol Mayo Spesial",
    name: "Risol Mayo Spesial",
    price: 12000,
    quota: 30,
    reserved: 17,
    pickup_point: "Kantin Gedung Bersama / Pintu 2",
    badge: "Batch Hari Ini",
    closing_time: "Tutup 21.00",
    photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoHfCf6ehNDwRVE_gipNCYRAPQxjQkgWQZEWN3RTW5ZvExDAPLofgUoGd6WWm8rxg5DZiOj4dGUbRmUNdKzImXKXSXtTKqFJFMoCz44GBl8LagKAJWRXyI4aUlDzJ81yTtC7h55mwIQ614tm7Rjn42S6AzoFiIw7nXJEu-XGBW-Rpm32LM35lbSP_blDb5KMXvuJ-V0if4t15WY6hskc21l3U_2c7PqVRJr52o-RhI",
    url: "https://open-po.vercel.app",
  },
  {
    id: "po-matcha-latte",
    title: "Cold Brew Matcha Latte",
    name: "Cold Brew Matcha Latte",
    price: 18000,
    quota: 20,
    reserved: 2,
    pickup_point: "Selasar FIB & Lab Industri",
    badge: "Siap Diantar",
    closing_time: "Tutup 17.00",
    photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8Z3GIfWHER6Bo9PWTe2cQwMix8Fh0eRTRm-0BdqlT6Teus3rGGm_0Yh_LO0jFfycmGPiVcDDTmq3FOigI4hHHaCI5PiPT_-xMD6Cysp88k6vDeyaG38VwrNOBsqV3uc9Sk0GSYTmhYDjFnV2QZMHZ1YLf54J6K3nF0QsXH2bVqDkfewaELaaMIdyXfy_nSjrv6datrxlkdW6u7Bv7czJaaFMlXv2JojrMOZpBQ0Y2",
    url: "https://open-po.vercel.app",
  },
  {
    id: "po-brownies",
    title: "Fudgy Brownies Sekat",
    name: "Fudgy Brownies Sekat",
    price: 18000,
    quota: 25,
    reserved: 19,
    pickup_point: "Perpustakaan Pusat USU & Gazebo",
    badge: "Sisa 4 Slot!",
    closing_time: "Tutup 20.00",
    photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFrff8GN-PoHF2O1JGwm3yz2izA753sB2Ojcylt30as8i8W213IPddQNPlmfgfiefeAmGj4Ut96STTtAAD-M84bxdE9gSaOkUZGi8wdy2ecBdQ-Cy4NttFlG1zC3mjygCTVeujiO0D8OewD5TfV2p7cLzre9Rq4nmi5upMY8nWtq3R6xL7kHqzaM6UY0lSXSPp_Zek7SrW4PnmCWp_6ZTlWs_eiuXq6M8WtR3k0toV",
    url: "https://open-po.vercel.app",
  },
  {
    id: "po-kopi-aren",
    title: "Kopi Susu Gula Aren",
    name: "Kopi Susu Gula Aren",
    price: 10000,
    quota: 40,
    reserved: 29,
    pickup_point: "Lobi Bersama Fak. Teknik",
    badge: "Batch Sore",
    closing_time: "Tutup 18.00",
    photo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsFVpViE_n7P_Mq8O3g84vV9Xb_HNGxhzzusJuyjEzEKUBWRewsNldysMWy74TOo--bSzqNMR7WaIgJgnCTposTvR3rBXX4gO5Qakhne-g7VZXQXpIhof-0VdYuOe4hVLAPdOGS5gjy7mTmpEldQRMc8oIprN0v9Tu6kTvBbgSnnpIz5X3oznGAU1T_DsO9EDiZzzVWhc86D6rriwW6j5suZLc_xZPb4umsHqfiwhi",
    url: "https://open-po.vercel.app",
  },
];

const WTB_ITEMS = [
  { title: "Papan LED Laprak Arsi", price: "< 150 Rb", faculty: "Arsitektur USU", href: "/dicari" },
  { title: "Buku Kalkulus Purcell Jilid 1 & 2", price: "50-80 Rb", faculty: "Fasilkom / Teknik", href: "/dicari" },
  { title: "Kosan Pintu 2 under 800rb", price: "< 800 Rb/bln", faculty: "Padang Bulan", href: "/dicari" },
  { title: "Kalkulator Saintifik Casio fx-991EX", price: "< 200 Rb", faculty: "POLMED / Teknik", href: "/dicari" },
  { title: "Jas Lab MIPA Ukuran L", price: "35 Rb", faculty: "FMIPA USU", href: "/dicari" },
];

export default function SuperAppHome({
  latestListings = [],
  madingPosts: initialMadingPosts = [],
  initialPoBatches = [],
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const router = useRouter();
  const { wa: userWa } = useSesi();

  // Marketplace states
  const [listingCampus, setListingCampus] = useState("Semua"); // 'Semua' | 'USU' | 'POLMED'
  const [listingCategory, setListingCategory] = useState("Semua");
  const [listingSearch, setListingSearch] = useState("");
  const [listingSort, setListingSort] = useState("terbaru"); // 'terbaru' | 'termurah'
  const [visibleListingCount, setVisibleListingCount] = useState(12);

  // UI Modals & Dropdowns
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [wtbIndex, setWtbIndex] = useState(0);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setWtbIndex((prev) => (prev + 1) % 5);
    }, 3200);

    const onCampus = (e) => {
      if (e.detail?.campus) {
        setSelectedCampus(e.detail.campus);
        setListingCampus(e.detail.campus);
      }
    };
    window.addEventListener("campus:change", onCampus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("campus:change", onCampus);
    };
  }, []);

  // Realtime Open PO Batches
  const [poBatches, setPoBatches] = useState(initialPoBatches);
  const activeBatches = poBatches && poBatches.length > 0 ? poBatches : FALLBACK_PO_BATCHES;

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
  const [requireLoginMenfess, setRequireLoginMenfess] = useState(true);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem("onboarding_seen")) {
        setShowOnboarding(true);
      }
    } catch {}
  }, []);
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("onboarding_seen", "1");
    } catch {}
  };

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

  // User identifier for analytics
  const [userId, setUserId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
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

  // Filter & Fetch posts
  const fetchingMoreRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    async function resetAndFetch() {
      setIsLoadingMore(true);
      setFeedError(false);
      fetchingMoreRef.current = true;
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

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const query = new URLSearchParams({
        page: String(nextPage),
        limit: "15",
        ...(activeTab !== "all" && { type: activeTab }),
        ...(selectedCampus !== "Semua" && { faculty: selectedCampus }),
      });
      const res = await fetch(`/api/mading?${query.toString()}`);
      const data = await res.json();
      const newItems = data.posts || [];
      setPosts((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(newItems.length === 15);
    } catch {
      toast.error("Gagal memuat postingan berikutnya.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Like interaction
  const handleLike = async (postId) => {
    triggerHaptic("light");
    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? { ...p, likes_count: (p.likes_count || 0) + 1, user_has_liked: true }
          : p
      )
    );
    try {
      await fetch(`/api/mading/${postId}/like`, { method: "POST" });
    } catch {}
  };

  // Comments
  const openComments = async (postId) => {
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
      } catch {}
    }
  };

  const handleSendComment = async (postId) => {
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/mading/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: newCommentText.trim(),
          sender_name: "Anonim",
        }),
      });
      if (res.ok) {
        const newC = await res.json();
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newC.comment],
        }));
        setNewCommentText("");
        setPosts((current) =>
          current.map((p) =>
            p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
          )
        );
        toast.success("Komentar terkirim!");
      }
    } catch {
      toast.error("Gagal mengirim komentar.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Image Selection for new post
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingImage(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setCompressingImage(false);
    }
  };

  // Submit Menfess
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append("type", formData.type);
      formPayload.append("faculty", formData.faculty);
      formPayload.append("sender_name", formData.is_anon ? "Anonim" : (formData.sender_name || "Anonim"));
      formPayload.append("content", formData.content.trim());
      if (formData.title) formPayload.append("title", formData.title.trim());
      if (imageFile) formPayload.append("image", imageFile);
      if (tagProduk?.id) formPayload.append("listing_id", tagProduk.id);

      const res = await fetch("/api/mading", {
        method: "POST",
        body: formPayload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan postingan");

      toast.success("Postingan berhasil diterbitkan!");
      setPosts((prev) => [data.post, ...prev]);
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
      setTagProduk(null);
      try {
        localStorage.removeItem("menfess_draft");
      } catch {}
    } catch (err) {
      toast.error(err.message || "Gagal mengirim postingan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async (postId) => {
    const url = `${window.location.origin}/mading#post-${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Menfess Kampus Kita", url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Tautan menfess disalin ke clipboard!");
    }
  };

  // Filtered & Sorted Feed
  const filteredPosts = posts.filter((post) => {
    if (activeTab !== "all" && post.type !== activeTab) return false;
    if (selectedCampus !== "Semua" && post.faculty !== selectedCampus) return false;
    return true;
  });

  // Filtered Marketplace Listings for Center Column
  const filteredListings = latestListings
    .filter((ad) => {
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
    })
    .sort((a, b) => {
      if (listingSort === "termurah") {
        const pA = typeof a.price === "number" ? a.price : parseFloat(String(a.price).replace(/[^0-9]/g, "")) || 0;
        const pB = typeof b.price === "number" ? b.price : parseFloat(String(b.price).replace(/[^0-9]/g, "")) || 0;
        return pA - pB;
      }
      return new Date(b.created_at || b.bumped_at || 0) - new Date(a.created_at || a.bumped_at || 0);
    });

  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-20 md:pb-8">
      {/* ── ONBOARDING OVERLAY ── */}
      {showOnboarding && (
        <div data-mobile-overlay="onboarding" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[28px] w-full max-w-sm p-6 shadow-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Icon.Store className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-center text-slate-900 dark:text-white mb-1">Selamat Datang! 👋</h2>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-5">Platform kampus USU &amp; POLMED — semua dalam satu tempat</p>
            <div className="space-y-3 mb-5">
              {[
                { icon: Icon.ShoppingBag, label: "Marketplace", desc: "Jual &amp; beli barang bekas kampus" },
                { icon: Icon.Coffee, label: "Open PO", desc: "Pre-order makanan, minuman &amp; merchandise" },
                { icon: Icon.Heart, label: "Menfess", desc: "Suara anonim &amp; curhat mahasiswa" },
                { icon: Icon.Search, label: "Barang Dicari (WTB)", desc: "Papan kebutuhan mahasiswa" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{f.label}</p>
                    <p className="text-[11px] text-slate-500" dangerouslySetInnerHTML={{ __html: f.desc }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={dismissOnboarding}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm py-3.5 rounded-2xl transition-colors shadow-md"
            >
              Mulai Jelajahi 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 flex-1 w-full">
        {/* Violet / Emerald Notification Bar & Quick Ticker */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-50/90 via-white to-slate-50 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900/80 text-slate-800 dark:text-slate-200 rounded-2xl text-xs flex items-center justify-between gap-2 border border-emerald-100 dark:border-emerald-950/40 shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="font-bold text-emerald-900 dark:text-emerald-300 shrink-0 text-xs tracking-tight">Menfess Terkini:</span>
              <span className="truncate text-slate-600 dark:text-slate-300 min-w-0 font-normal">
                {posts && posts.length > 0 ? `“${posts[0].content}”` : "“Halo, mohon bantuannya banget. Ada ga kos sekitar usu yg ready di Januari 2027 under 1 jt?...”"}
              </span>
            </div>
            <a
              href="#menfess-section"
              onClick={(e) => { e.preventDefault(); document.getElementById('menfess-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 font-bold hover:underline shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 rounded-full border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs cursor-pointer"
            >
              <span>Buka</span>
              <span>→</span>
            </a>
          </div>
        </div>

        {/* SearchBar + Quick Chips */}
        <div className="mb-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full shadow-xs rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-white/10 transition-all focus-within:ring-2 focus-within:ring-emerald-600/30">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon.Search className="w-4 h-4" />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Cari diktat, kos, risol mayo, PO..."
                className="w-full h-11 pl-10 pr-10 bg-transparent text-slate-900 dark:text-white text-[13px] placeholder:text-slate-400 rounded-2xl focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                aria-label="Filter Kategori"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <Icon.Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs"
                >
                  <span>{listingCategory === "Semua" ? "Kategori" : listingCategory}</span>
                  <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-50">
                    {["Semua", "Elektronik", "Buku", "Fashion", "Kos", "Jasa", "Makanan"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setListingCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-xs text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                      >
                        <span>{cat}</span>
                        {listingCategory === cat && <span className="text-emerald-700">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = selectedCampus === "USU" ? "POLMED" : selectedCampus === "POLMED" ? "Semua" : "USU";
                  setSelectedCampus(next);
                  setListingCampus(next);
                }}
                className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-xs whitespace-nowrap"
              >
                <span>Kampus: {selectedCampus === "Semua" ? "Semua" : selectedCampus}</span>
                <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs [scrollbar-width:none] -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => { setListingCategory("Semua"); setListingSearch(""); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold shrink-0 shadow-xs flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Semua" && !listingSearch
                  ? "bg-emerald-800 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
              }`}
            >
              <Icon.Grid className="w-3.5 h-3.5" />
              Semua
            </button>
            <button
              type="button"
              onClick={() => { setListingCategory("Buku"); setListingSearch(""); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] shrink-0 border flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Buku"
                  ? "bg-emerald-800 text-white border-emerald-800 font-semibold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-medium"
              }`}
            >
              <Icon.BookOpen className="w-3.5 h-3.5" />
              Buku &amp; Diktat
            </button>
            <button
              type="button"
              onClick={() => { setListingCategory("Makanan"); setListingSearch(""); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] shrink-0 border flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Makanan"
                  ? "bg-emerald-800 text-white border-emerald-800 font-semibold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-medium"
              }`}
            >
              <Icon.Coffee className="w-3.5 h-3.5" />
              Kuliner PO
            </button>
            <button
              type="button"
              onClick={() => { setListingCategory("Kos"); setListingSearch("kos"); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] shrink-0 border flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Kos"
                  ? "bg-emerald-800 text-white border-emerald-800 font-semibold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-medium"
              }`}
            >
              <Icon.Home className="w-3.5 h-3.5" />
              Kos Mahasiswa
            </button>
            <button
              type="button"
              onClick={() => { setListingCategory("Elektronik"); setListingSearch(""); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] shrink-0 border flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Elektronik"
                  ? "bg-emerald-800 text-white border-emerald-800 font-semibold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-medium"
              }`}
            >
              <Icon.Laptop className="w-3.5 h-3.5" />
              Elektronik
            </button>
            <button
              type="button"
              onClick={() => { setListingCategory("Fashion"); setListingSearch(""); }}
              className={`px-3.5 py-1.5 rounded-full text-[12px] shrink-0 border flex items-center gap-1.5 transition active:scale-95 ${
                listingCategory === "Fashion"
                  ? "bg-emerald-800 text-white border-emerald-800 font-semibold"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 font-medium"
              }`}
            >
              <Icon.Shirt className="w-3.5 h-3.5" />
              Fashion Preloved
            </button>
          </div>
        </div>

        {/* WTB LIVE TICKER (BARANG DICARI MAHASISWA) */}
        <div className="mb-5 flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] uppercase tracking-wider shrink-0 font-extrabold flex items-center gap-1">
              <Icon.Megaphone className="w-3 h-3" />
              WTB
            </span>
            <div className="overflow-hidden relative h-5 flex-1 min-w-0">
              <div
                className="flex flex-col transition-transform duration-500 ease-out"
                style={{ transform: `translateY(-${wtbIndex * 20}px)` }}
              >
                {WTB_ITEMS.map((w, idx) => (
                  <span key={idx} className="h-5 flex items-center text-[12px] text-slate-800 dark:text-slate-200 truncate font-medium">
                    {w.item} ({w.campus}) — Budget: {w.budget}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateSheet(true)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] text-emerald-800 dark:text-emerald-300 font-bold shrink-0 flex items-center gap-0.5 shadow-xs border border-amber-200/80 dark:border-amber-900/40 transition-all active:scale-95"
          >
            <Icon.Plus className="w-3.5 h-3.5" />
            Pasang
          </button>
        </div>

        {/* Reorganized 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT MAIN COLUMN: Open PO Swipeable + WTB + Marketplace (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* 1. Open PO Section */}
            <section id="po-section" className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Pre-Order <span className="font-serif italic font-normal text-emerald-700 dark:text-emerald-400">Kampus Sedang Buka</span>
                  </h2>
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                    {activeBatches.length} Batch Aktif
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                    <Icon.ArrowRight className="w-3 h-3 text-slate-400" />
                    Geser untuk melihat
                  </span>
                  <a
                    href="https://open-po.vercel.app?ref=jualbeliusupolmed"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 flex items-center gap-1 ml-2 transition-colors"
                  >
                    Lihat Semua →
                  </a>
                </div>
              </div>

              {/* Swipeable Carousel */}
              <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth custom-scrollbar [scrollbar-width:thin]">
                {activeBatches.map((item, idx) => {
                  const quotaNum = Number(item.quota) || 20;
                  const resNum = Number(item.reserved) || 0;
                  const pct = Math.min(100, Math.round((resNum / quotaNum) * 100));
                  const sisa = Math.max(0, quotaNum - resNum);

                  return (
                    <div
                      key={item.id || idx}
                      className="w-60 shrink-0 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900 flex flex-col group"
                    >
                      <div className="relative h-36 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {item.photo ? (
                          <img
                            alt={item.name || item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            src={item.photo}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Icon.Coffee className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 bg-emerald-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                          {item.badge || "Batch Aktif"}
                        </span>
                        <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-full">
                          {item.closing_time || "Tutup Segera"}
                        </span>
                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-medium px-2 py-0.5 rounded-lg truncate">
                          {item.pickup_point || "Kantin / Selasar Kampus"}
                        </div>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.name || item.title}
                          </h3>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-emerald-400 mt-0.5">
                            {typeof item.price === "number" ? rupiah(item.price) : item.price}
                          </p>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                            <span>Sisa {sisa} Slot</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                          <a
                            href={item.url || `https://open-po.vercel.app/po/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block mt-3 py-1.5 text-center bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold rounded-xl transition shadow-xs"
                          >
                            Pesan Slot
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Papan Strategis: Barang Dicari Mahasiswa (WTB - Want To Buy) with Smooth Horizontal Marquee Animation */}
            <section id="wtb-section" className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 rounded-2xl px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0 z-10 bg-white dark:bg-slate-800 sm:pr-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white leading-none">WTB Mahasiswa</h2>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800 hidden sm:inline-block">
                    Dicari Segera
                  </span>
                </div>
              </div>

              {/* Auto-scrolling Marquee Track (Seamless Loop & Pause on Hover) */}
              <div className="wtb-marquee-container flex-1 overflow-hidden relative min-w-0">
                <div className="wtb-marquee-track flex items-center gap-2.5 py-0.5">
                  {[...WTB_ITEMS, ...WTB_ITEMS].map((wtb, idx) => (
                    <Link
                      key={idx}
                      href={wtb.href || "/dicari"}
                      className="shrink-0 flex items-center gap-2 bg-slate-50/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-emerald-300 transition cursor-pointer shadow-xs"
                    >
                      <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-xs shrink-0">
                        {wtb.price}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {wtb.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {wtb.faculty}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ml-0.5 shrink-0 whitespace-nowrap">
                        Tawarkan →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/dicari?tulis=1"
                className="shrink-0 text-[11px] font-semibold text-white bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-full transition flex items-center gap-1 shadow-xs z-10 sm:ml-2"
              >
                <span>+ Pasang WTB</span>
              </Link>
            </section>

            {/* 3. Marketplace Grid (Diletakkan di bawah PO & WTB) */}
            <section id="marketplace-section" className="space-y-3.5">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">
                      Marketplace Preloved
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      COD langsung di area kampus bebas ongkir
                    </p>
                  </div>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <Icon.CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Aman COD
                  </span>
                </div>

                {/* Campus Segment Filter */}
                <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                  {["Semua", "USU", "POLMED"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setListingCampus(c); setSelectedCampus(c); }}
                      className={`flex-1 py-1 rounded-lg text-[12px] font-bold transition ${
                        listingCampus === c
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 font-medium"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 text-center space-y-2">
                  <Icon.Package className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Belum ada barang di filter ini</p>
                  <p className="text-xs text-slate-500">Coba ganti kategori, cari kata kunci lain, atau reset filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setListingCategory("Semua");
                      setListingCampus("Semua");
                      setListingSearch("");
                    }}
                    className="mt-2 px-4 py-1.5 rounded-full bg-emerald-800 text-white text-xs font-bold"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredListings.slice(0, visibleListingCount).map((ad) => (
                    <ProductCard key={ad.id} listing={ad} />
                  ))}
                </div>
              )}

              {filteredListings.length > visibleListingCount && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleListingCount((prev) => prev + 12)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-[12px] font-semibold flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-white/10 shadow-xs transition active:scale-[0.99]"
                  >
                    <Icon.RefreshCcw className="w-3.5 h-3.5" />
                    Muat Lebih Banyak Barang
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COMPANION COLUMN: Curhat & Menfess Feed (Sejajar ke atas langsung) (4 cols) */}
          <aside id="menfess-section" className="lg:col-span-4 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800 shadow-xs">
                  <svg className="w-4 h-4 fill-emerald-600" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                    Menfess <span className="font-serif italic font-normal text-emerald-700 dark:text-emerald-400">Kampus Kita</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">Suara anonim USU &amp; POLMED</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateFormData({ type: activeTab === "info" ? "info" : "menfess" });
                  setShowModal(true);
                }}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition flex items-center gap-1.5 shadow-xs"
              >
                <Icon.Plus className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" />
                <span>Tulis</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs py-2.5 border-b border-slate-100 dark:border-white/10 text-slate-500">
              <span className="text-[11px] font-medium text-slate-400">Filter feed:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-full text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-0.5 rounded-full transition ${activeTab === "all" ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-white font-bold shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("menfess")}
                  className={`px-2.5 py-0.5 rounded-full transition ${activeTab === "menfess" ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-white font-bold shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
                >
                  Menfess
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("info")}
                  className={`px-2.5 py-0.5 rounded-full transition ${activeTab === "info" ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-white font-bold shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"}`}
                >
                  Info
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/10 text-xs mt-1">
              {filteredPosts.slice(0, 10).map((post) => (
                <article key={post.id} className="py-3.5">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs text-[10px] font-bold">
                        {(post.sender_name || "A").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">
                        {post.sender_name || "Anonim"}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {post.faculty || "USU"}
                      </span>
                    </div>
                    <time className="text-[10px] text-slate-400">{waktuLalu(post.created_at)}</time>
                  </div>

                  {post.title && (
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                      {post.title}
                    </h4>
                  )}

                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div
                      onClick={() => setZoomImage(post.image_url)}
                      className="mt-2 rounded-xl overflow-hidden cursor-zoom-in max-h-48 border border-slate-200 dark:border-white/10"
                    >
                      <img src={post.image_url} alt="Foto" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-1 hover:text-rose-500 cursor-pointer transition active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 fill-rose-500" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span>{post.likes_count || 0}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openComments(post.id)}
                        className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
                      >
                        <Icon.MessageCircle className="w-3.5 h-3.5" />
                        <span>{post.comments_count || 0}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-[10px] transition"
                    >
                      <Icon.Share className="w-3.5 h-3.5" />
                      <span>Bagikan</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="pt-3.5 text-center">
              <button
                type="button"
                onClick={loadMorePosts}
                disabled={isLoadingMore}
                className="w-full py-2 bg-slate-50 dark:bg-slate-700/60 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-300 font-semibold rounded-2xl text-xs transition border border-slate-200/80 dark:border-white/10 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Icon.RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memuat obrolan...</span>
                  </>
                ) : (
                  <span>Muat obrolan lainnya...</span>
                )}
              </button>
            </div>
          </aside>
        </div>

        {/* SAFETY & ETHICS BANNER (TRANSAKSI AMAN MAHASISWA) */}
        <section className="mt-6 pt-1">
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon.Shield className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-[13px] text-emerald-950 dark:text-emerald-200 leading-tight font-extrabold">
                Transaksi Aman Mahasiswa
              </h4>
              <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed font-normal">
                Selalu utamakan COD di titik temu resmi kampus (Pendopo, Pintu 1-4 Dr. Mansyur, Gedung Z POLMED) untuk kenyamanan dan keamanan bersama.
              </p>
            </div>
          </div>
        </section>
      </main>

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
                <button
                  type="button"
                  onClick={() => setShowOtpModal(true)}
                  className="shrink-0 ml-2 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors"
                >
                  Masuk
                </button>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
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
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
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
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    {/* Optional Photo Attachment */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                        <span>Foto Pendukung (Opsional)</span>
                        {compressingImage && (
                          <span className="text-[10px] text-emerald-600 animate-pulse font-medium">Mengompres foto…</span>
                        )}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        disabled={compressingImage}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
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
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white disabled:opacity-50 py-3 rounded-full text-[13px] font-bold transition-all shadow-md active:scale-98"
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

      {/* ── 10. MODAL BUAT IKLAN / KONTEN ── */}
      <CreateSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
      />

      {/* ── 11. MODAL LOGIN OTP ── */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
      />
    </div>
  );
}
