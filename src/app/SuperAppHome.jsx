"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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

  // Onboarding overlay
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarding_done")) {
      setShowOnboarding(true);
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
    let isMounted = true;
    async function fetchMore() {
      if (inView && hasMore && !isLoadingMore) {
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
          const data = await res.json();
          if (isMounted) {
            if (data.posts && data.posts.length > 0) {
              setPosts((prev) => [...prev, ...data.posts]);
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
          if (isMounted) { setHasMore(false); setFeedError(true); } // Cegah infinite loop
        } finally {
          if (isMounted) {
            setIsLoadingMore(false);
          }
        }
      }
    }
    fetchMore();
    return () => {
      isMounted = false;
    };
  }, [inView, hasMore, isLoadingMore, page, activeTab, selectedCampus, debouncedQuery]);

  const isFirstRender = useRef(true);

  // When filters or search query change, reset and fetch from server
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let isMounted = true;
    async function resetAndFetch() {
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
    if (!userWa) {
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
      const data = await res.json();
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
    } catch {
      toast.error("Gagal mengirim postingan.");
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

  return (
    <div className="min-h-screen bg-transparent pb-28 md:pb-8 font-sans selection:bg-primary/20 dark:bg-transparent">

      {/* ── ONBOARDING OVERLAY (first visit only) ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
      <div className="md:max-w-7xl md:mx-auto md:px-6 md:pt-6">
        <div className="md:flex md:gap-6 md:items-start">
          
          {/* ═══════════════════════════════════════
              KOLOM KIRI — Feed utama (Menfess + Info Kampus)
              Mobile: full width | Desktop: flex-1
          ═══════════════════════════════════════ */}
          <div className="md:flex-1 md:min-w-0 md:pr-2">
      


      {/* ── Marketplace carousel — hanya di mobile. Desktop ada di sidebar ── */}
      <section className="mt-2 mb-4 md:hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              <span className="inline-flex items-center gap-1.5"><Icon.ShoppingBag className="h-4 w-4" />Belanja di Marketplace</span>
            </h3>
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[9px] font-bold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
              Geser
            </span>
          </div>
          <Link href="/jual-beli" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 active:scale-[0.96] transition-transform">
            <span>Lihat Semua</span>
            <Icon.ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="relative">
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0 px-4 sm:px-6 snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {latestListings.slice(0, 20).map((ad, idx) => (
              <Link 
                key={ad.id} 
                href={`/produk/${buildSlug(ad.title, ad.id)}`}
                className="flex-none w-[110px] xs:w-[120px] sm:w-[130px] overflow-hidden apple-card snap-start hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-[0.97] group no-tap-highlight"
              >
                <div className="relative aspect-[4/3] w-full bg-black/[0.03] dark:bg-black/40 overflow-hidden">
                  {ad.image_url ? (
                    <Image 
                      src={ad.image_url} 
                      alt={ad.title} 
                      fill 
                      sizes="(max-width: 640px) 120px, 140px"
                      priority={idx < 3}
                      className="object-cover group-hover:scale-104 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Icon.Package className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1 bg-[#1d1d1f]/80 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                    {rupiah(ad.price || 0)}
                  </div>
                </div>
                <div className="p-2">
                  <h4 className="text-[11px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
                    {ad.title}
                  </h4>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    by {ad.seller_name || "Mahasiswa"}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-0.5">
                    <Icon.MapPin className="w-2 h-2 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{ad.campus === "Semua" ? "Medan" : ad.campus}</span>
                  </p>
                </div>
              </Link>
            ))}
            
            {/* LIHAT SEMUA CARD */}
            <Link 
              href="/jual-beli"
              className="flex-none w-[110px] xs:w-[120px] sm:w-[130px] rounded-[16px] border border-dashed border-black/10 bg-[#f5f5f7] flex flex-col items-center justify-center snap-start hover:bg-black/[0.04] active:scale-[0.96] transition-all group no-tap-highlight dark:border-white/10 dark:bg-[#1c1c1e] dark:hover:bg-white/[0.04]"
            >
              <div className="w-8 h-8 bg-white shadow-sm text-[#1d1d1f] rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform dark:bg-[#2c2c2e] dark:text-white">
                <Icon.ArrowRight className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-primary">Lihat Semua</span>
              <span className="text-[9px] text-primary/70">Jelajahi Pasar</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. FEED MADING & MENFESS ── */}
      <section
        className="w-full md:px-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh visual indicator on mobile */}
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
            className="w-full mb-2 flex items-center justify-center gap-2 bg-primary text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-md hover:brightness-105 transition-all animate-in slide-in-from-top-3 duration-300"
          >
            <Icon.ArrowUp className="w-3.5 h-3.5" />
            Ada {newPostCount} postingan baru — klik untuk muat
          </button>
        )}
        <div className="sticky top-[70px] md:top-6 z-30 apple-glass sm:rounded-2xl px-4 sm:px-4 pt-2.5 pb-2.5 mb-3 sm:mx-0 -mx-4 sm:border-t-0 border-t-0 shadow-sm transition-all">
          {/* TABS FILTER (Semua / Menfess / Info Kampus) */}
          <div className="flex items-center gap-2">
            <div className="flex justify-center flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="apple-segmented">
                {[
                  { id: "all", label: "Semua" },
                  { id: "menfess", label: "Menfess" },
                  { id: "info", label: "Info Kampus" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic("light");
                      setActiveTab(tab.id);
                      setSearchQuery("");
                      setShowSearch(false);
                    }}
                    className={`px-4 py-1.5 text-[12px] font-bold rounded-full transition-all ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Quick Refresh Button */}
            <button
              onClick={() => {
                triggerHaptic("light");
                loadNewPosts();
              }}
              className="shrink-0 p-1.5 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Segarkan feed"
              title="Segarkan feed"
            >
              <Icon.RefreshCcw className={`w-4 h-4 ${isLoadingMore ? "animate-spin text-primary" : ""}`} />
            </button>
            {/* Search toggle */}
            <button
              onClick={() => {
                triggerHaptic("light");
                setShowSearch(s => !s);
                if (showSearch) setSearchQuery("");
              }}
              className={`shrink-0 p-1.5 rounded-full transition-colors ${
                showSearch || searchQuery ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              aria-label="Cari postingan"
            >
              <Icon.Search className="w-4 h-4" />
            </button>
          </div>

          {/* Search input — slide in */}
          {showSearch && (
            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
              <div className="relative">
                <Icon.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari postingan, menfess, info..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <Icon.X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FEED POSTS LIST */}
        <div className="flex flex-col gap-4 mb-12">
          {/* Error state */}
          {feedError && posts.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                <Icon.X className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Gagal memuat postingan</p>
              <p className="text-xs text-gray-500 mt-1">Periksa koneksi internet kamu, lalu coba lagi.</p>
              <button
                onClick={loadNewPosts}
                className="mt-3.5 inline-flex items-center gap-1.5 bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-600"
              >
                <Icon.RefreshCcw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}
          {/* Skeleton loading saat filter reset */}
          {isLoadingMore && posts.length === 0 && !feedError && (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}
          {filteredPosts.length === 0 && !isLoadingMore && !feedError ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                {searchQuery ? <Icon.Search className="w-5 h-5" /> : <Icon.MessageCircle className="w-5 h-5" />}
              </div>
              <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "Belum ada postingan di filter ini"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? "Coba kata kunci lain atau hapus pencarian untuk menampilkan seluruh postingan." : "Jadilah yang pertama mengirim menfess atau info kampus!"}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    setSearchQuery("");
                    setShowSearch(false);
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Icon.X className="w-3.5 h-3.5" />
                  <span>Hapus Pencarian &amp; Tampilkan Semua</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3.5 inline-flex items-center gap-1.5 bg-[#0071e3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0077ed]"
                >
                  <Icon.PlusCircle className="w-3.5 h-3.5" />
                  <span>Kirim Menfess Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isInfo = post.type === "info";
              return (
                <div
                  key={post.id}
                  data-mading-post-id={post.id}
                  className="apple-glass-card p-4 sm:p-5 relative group"
                >
                  {/* Top Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${isInfo ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"}`}>
                    {isInfo ? <Icon.Megaphone className="h-3.5 w-3.5" /> : <Icon.User className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-[13px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {post.sender_name || "Anonim"}
                        </p>
                        <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
                          {post.faculty || "USU"}
                        </span>
                        <span className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${isInfo ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
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
                      className="opacity-30 hover:opacity-100 hover:text-rose-500 text-slate-400 p-1.5 rounded-lg transition-all"
                    >
                      <Icon.Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title (If Info) */}
                  {post.title && (
                    <h4 className="mt-1.5 mb-0.5 text-[14px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug">
                      {post.title}
                    </h4>
                  )}

                  {/* Content Body */}
                  <p className="text-[13px] leading-[1.5] text-[#1d1d1f] dark:text-gray-200 whitespace-pre-wrap mt-0.5">
                    {post.content}
                  </p>

                  {/* Attached Image */}
                  {post.image_url && (
                    <div 
                      onClick={() => setZoomImage(post.image_url)}
                      className="mt-3 rounded-[16px] overflow-hidden border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/30 cursor-zoom-in relative aspect-[16/9] w-full max-h-72"
                    >
                      <Image 
                        src={post.image_url} 
                        alt={post.title ? `Foto ${post.title}` : "Foto menfess"} 
                        fill
                        sizes="(max-width: 768px) 100vw, 720px"
                        className="object-cover hover:scale-[1.01] transition-transform duration-300" 
                        loading="lazy" 
                      />
                    </div>
                  )}

                  {/* Produk yang ditandai */}
                  {post.listings && (
                    <button
                      type="button"
                      onClick={() => setIntipProduk(post.listings)}
                      className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] p-2.5 text-left transition-all active:scale-[0.99] hover:bg-primary/[0.09]"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/[0.06] dark:bg-white/[0.08]">
                        {post.listings.image_url || post.listings.images?.[0] ? (
                          <img
                            src={post.listings.image_url || post.listings.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-500"><Icon.Box className="h-5 w-5" /></div>
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-[#1d1d1f] dark:text-white">
                          {post.listings.title}
                        </span>
                        <span className="block text-[11px] font-extrabold text-primary dark:text-violet-400">
                          {rupiah(post.listings.price)}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white">
                        Lihat
                      </span>
                    </button>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="mt-3.5 flex items-center gap-4 sm:gap-6 text-sm text-slate-600 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      aria-label={`Sukai postingan, ${post.likes_count || 0} suka`}
                      className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
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
                      className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                        activeCommentsPostId === post.id ? "text-primary bg-primary/10" : "hover:text-primary"
                      }`}
                    >
                      <Icon.MessageCircle className="h-3.5 w-3.5" />
                      <span className="font-bold text-xs">{post.comments_count || 0} Komentar</span>
                    </button>

                    {/* Unduh Menfess Story IG */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setUnduhPost(post);
                      }}
                      aria-label="Unduh gambar untuk Instagram Story atau Status WhatsApp"
                      title="Unduh gambar Story / Status"
                      className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-slate-500 hover:text-primary transition-colors ml-auto active:scale-95"
                    >
                      <Icon.Download className="h-3.5 w-3.5" />
                      <span className="font-bold text-xs hidden xs:inline">Story IG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(post)}
                      aria-label="Bagikan postingan ini ke WhatsApp"
                      className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-emerald-600 transition-colors"
                    >
                      <Icon.Share className="h-3.5 w-3.5" />
                      <span className="font-bold text-xs">Bagikan</span>
                    </button>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Icon.Eye className="h-3 w-3" />
                      <span>{post.views_count || 0}</span>
                    </span>
                  </div>

                  {/* Comments Accordion Section */}
                  {activeCommentsPostId === post.id && (
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-200">
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(commentsMap[post.id] || []).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">
                            Belum ada tanggapan. Jadilah yang pertama membalas!
                          </p>
                        ) : (
                          commentsMap[post.id].map((c) => (
                            <div key={c.id} className="bg-slate-50 dark:bg-white/[0.04] p-3 rounded-2xl text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{c.sender_name}</span>
                                <span className="text-[9px] text-slate-400">{waktuLalu(c.created_at)}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 leading-snug">{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendComment(post.id);
                          }}
                          placeholder="Tulis balasan anonim…"
                          className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-3.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button
                          onClick={() => handleSendComment(post.id)}
                          disabled={submittingComment || !newCommentText.trim()}
                          className="bg-primary disabled:opacity-50 text-white px-3.5 py-1.5 rounded-full text-xs font-bold hover:brightness-105 transition-all shrink-0"
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          
          {/* Intersection Observer target for Infinite Scroll */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 flex justify-center items-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="py-8 text-center text-xs font-medium text-slate-400">
              ✓ Anda sudah melihat semua postingan
            </div>
          )}
        </div>{/* end feed posts list */}
      </section>{/* end feed section */}

          </div>{/* end kolom kiri */}

          {/* ════════════════════════════════════════
              SIDEBAR KANAN — Marketplace Barang & Fitur (Sticky)
          ════════════════════════════════════════ */}
          <aside className="hidden md:block w-[360px] xl:w-[420px] shrink-0 sticky top-6 md:pl-1 md:pr-2 space-y-4 max-h-[calc(100vh-1.5rem)] overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            {/* Marketplace di Desktop */}
            <div className="apple-glass-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.07] bg-white/50 dark:bg-black/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Icon.ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[13px] text-[#1d1d1f] dark:text-white leading-tight">
                      Marketplace Kampus
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Barang bekas &amp; jasa mahasiswa</p>
                  </div>
                </div>
                <Link href="/jual-beli" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">
                  <span>Lihat Semua</span>
                  <Icon.ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Grid 2-kolom barang marketplace */}
              <div className="grid grid-cols-2 gap-2.5 p-3">
                {latestListings.slice(0, 10).map((ad) => (
                  <Link
                    key={ad.id}
                    href={`/produk/${buildSlug(ad.title, ad.id)}`}
                    className="group overflow-hidden rounded-xl border border-black/[0.05] dark:border-white/[0.08] bg-[#f8f9fa] dark:bg-black/40 hover:border-primary/30 hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/5 dark:bg-black/30">
                      {ad.image_url ? (
                        <Image
                          src={ad.image_url}
                          alt={ad.title}
                          fill
                          sizes="180px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon.Package className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 bg-[#1d1d1f]/80 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                        {rupiah(ad.price || 0)}
                      </div>
                    </div>
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-[#1d1d1f] dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {ad.title}
                        </p>
                        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          by {ad.seller_name || "Mahasiswa"}
                        </p>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                        <span className="truncate flex items-center gap-0.5">
                          <Icon.MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {ad.campus === "Semua" ? "Medan" : ad.campus}
                        </span>
                        <span className="font-semibold text-primary">COD</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="px-3 pb-3">
                <Link
                  href="/jual"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary text-white py-2 text-xs font-bold shadow-sm hover:brightness-105 transition-all"
                >
                  <Icon.Plus className="h-3.5 w-3.5" />
                  Pasang Iklan Barang / Jasa Gratis
                </Link>
              </div>
            </div>

            {/* Kirim Menfess CTA */}
            <div className="apple-glass-card border-none bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 text-white shadow-[0_8px_24px_-6px_rgba(124,58,237,0.4)] relative overflow-hidden transition-all hover:shadow-[0_12px_32px_-8px_rgba(124,58,237,0.6)]">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm mb-2">
                  <Icon.Heart className="h-3 w-3 text-rose-300 fill-current" />
                  Curhat &amp; Menfess
                </div>
                <h3 className="font-bold text-sm mb-1">Kirim Menfess Anonim 💌</h3>
                <p className="text-xs text-white/85 mb-3 leading-relaxed">Ceritakan sesuatu secara anonim ke seluruh komunitas mahasiswa USU &amp; POLMED</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-white text-violet-800 font-extrabold text-xs py-2.5 rounded-xl hover:bg-violet-50 transition-colors shadow-sm"
                >
                  + Tulis Menfess Sekarang
                </button>
              </div>
              <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-lg pointer-events-none" />
            </div>

            {/* Link Cepat */}
            <div className="apple-glass-card p-4">
              <h3 className="font-bold text-[12px] text-[#1d1d1f] dark:text-white mb-3 flex items-center gap-1.5">
                <Icon.Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Jelajahi Fitur Kampus
              </h3>
              <div className="space-y-1.5">
                {[
                  { href: "/dicari", icon: Icon.Search, label: "Barang Dicari", desc: "Posting barang yang kamu butuhkan" },
                  { href: "/teman", icon: Icon.Users, label: "Cari Teman", desc: "Swipe & temukan teman kampus" },
                  { href: "/organisasi", icon: Icon.BookOpen, label: "UKM & Organisasi", desc: "Info unit kegiatan mahasiswa" },
                  { href: "/oprec", icon: Icon.Briefcase, label: "Oprec Panitia", desc: "Lowongan organisasi kampus" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors group border border-transparent hover:border-black/[0.04] dark:hover:border-white/[0.06]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#1d1d1f] dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.desc}</p>
                    </div>
                    <Icon.ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-primary transition-colors ml-auto" />
                  </Link>
                ))}
              </div>
            </div>

          </aside>

        </div>{/* end md:flex */}
      </div>{/* end md:max-w-7xl */}

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

            {!userWa && (
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
                disabled={submitting || compressingImage}
                className="w-full bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] disabled:opacity-50 py-3 rounded-full text-[13px] font-bold hover:scale-[0.98] active:scale-95 transition-transform shadow-md"
              >
                {submitting ? "Mengirimkan…" : compressingImage ? "Menyiapkan foto…" : "Terbitkan Sekarang"}
              </button>
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

      {/* ── 10. MOBILE FLOATING ACTION BUTTON ── */}
      <button
        onClick={() => {
          triggerHaptic("medium");
          setShowModal(true);
        }}
        className="fixed z-30 bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] right-4 sm:hidden bg-[#0071e3] text-white p-3.5 rounded-full shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        aria-label="Buat Menfess Baru"
        title="Buat Menfess / Info Kampus"
      >
        <Icon.Edit className="w-5 h-5" />
      </button>
    </div>
  );
}
