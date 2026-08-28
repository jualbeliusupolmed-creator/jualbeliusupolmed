"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { toast } from "sonner";

// Umur relatif singkat untuk kartu feed
function waktuLalu(dateStr) {
  if (!dateStr) return "baru saja";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function SuperAppHome({
  latestListings = [],
  madingPosts: initialMadingPosts = [],
}) {
  // Feed States
  const [posts, setPosts] = useState(initialMadingPosts);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'menfess' | 'info'
  const [selectedCampus, setSelectedCampus] = useState("Semua"); // 'Semua' | 'USU' | 'POLMED' | 'Bebas'
  const [filterType, setFilterType] = useState("all"); // 'all' | 'popular' | 'photo'

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

  // User ID identifier for engagement
  const [userId, setUserId] = useState("");
  const viewedPostIds = useRef(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
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
    const shareText = `🔥 *[Menfess & Info Kampus USU / POLMED]*\n${titleText}"${cleanSnippet}${post.content && post.content.length > 120 ? "..." : ""}"\n\n👀 Baca & beri tanggapan:\n${shareUrl}`;

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

  // Handle Create Post Submit
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Isi postingan tidak boleh kosong!");
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
          content: formData.content,
          image_url: imageUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Menfess berhasil dikirim!");
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
        fetch(`/api/mading`)
          .then((r) => r.json())
          .then((d) => {
            if (d.posts) setPosts(d.posts);
          });
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
    <div className="min-h-screen bg-[#f5f5f7] pb-28 font-sans selection:bg-primary/20 dark:bg-[#000000] overflow-x-hidden">
      
      {/* ── Marketplace carousel ── */}
      <section className="mt-2 mb-6">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              <span className="inline-flex items-center gap-2"><Icon.ShoppingBag className="h-5 w-5" />Belanja di Marketplace</span>
            </h3>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
              Geser
            </span>
          </div>
          <Link href="/jual-beli" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1 active:scale-[0.96] transition-transform">
            <span>Lihat Semua</span>
            <Icon.ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="relative">
          <div className="flex gap-3 xs:gap-3.5 overflow-x-auto pb-1.5 pt-0 px-4 sm:px-6 md:px-10 lg:px-16 snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {latestListings.slice(0, 20).map((ad) => (
              <Link 
                key={ad.id} 
                href={`/produk/${buildSlug(ad.title, ad.id)}`}
                className="flex-none w-[140px] xs:w-[155px] sm:w-[175px] overflow-hidden apple-card snap-start hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:scale-[0.97] group no-tap-highlight"
              >
                <div className="relative aspect-square w-full bg-black/[0.03] dark:bg-black/40 overflow-hidden">
                  {ad.image_url ? (
                    <Image 
                      src={ad.image_url} 
                      alt={ad.title} 
                      fill 
                      sizes="(max-width: 640px) 160px, 180px"
                      className="object-cover group-hover:scale-104 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Icon.Package className="w-10 h-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-[#1d1d1f]/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {rupiah(ad.price || 0)}
                  </div>
                </div>
                <div className="p-3 sm:p-3.5">
                  <h4 className="text-[13px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {ad.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    by {ad.seller_name || "Mahasiswa"}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    <Icon.MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">{ad.campus === "Semua" ? "Medan" : ad.campus}</span>
                  </p>
                </div>
              </Link>
            ))}
            
            {/* LIHAT SEMUA CARD */}
            <Link 
              href="/jual-beli"
              className="flex-none w-[125px] xs:w-[145px] sm:w-[170px] rounded-[22px] border border-dashed border-black/10 bg-[#f5f5f7] flex flex-col items-center justify-center snap-start hover:bg-black/[0.04] active:scale-[0.96] transition-all group no-tap-highlight dark:border-white/10 dark:bg-[#1c1c1e] dark:hover:bg-white/[0.04]"
            >
              <div className="w-11 h-11 bg-white shadow-sm text-[#1d1d1f] rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform dark:bg-[#2c2c2e] dark:text-white">
                <Icon.ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-primary">Lihat Semua</span>
              <span className="text-[10px] text-primary/70">Jelajahi Pasar</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. FEED MADING & MENFESS (myfess-like continuous feed) ── */}
      <section className="max-w-3xl mx-auto w-full md:px-6">
        <div className="sticky top-[70px] z-30 bg-[#f5f5f7]/90 dark:bg-[#000000]/90 backdrop-blur-xl px-4 sm:px-0 pt-2 pb-2 mb-2">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Menfess &amp; Info Kampus
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cerita, curhat, dan kabar terbaru</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#0071e3] text-white px-3.5 py-1.5 rounded-full text-[13px] font-bold hover:bg-[#0077ed] active:scale-[0.96] transition-all shadow-sm"
            >
              <Icon.PlusCircle className="w-4 h-4" />
              <span>Tulis</span>
            </button>
          </div>

        {/* TABS FILTER (Semua / Menfess / Info Kampus) */}
        <div className="flex gap-4 border-b border-black/[0.06] dark:border-white/[0.08] mt-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: "all", label: "Semua" },
            { id: "menfess", label: "Menfess" },
            { id: "info", label: "Info Kampus" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap px-1 ${
                activeTab === tab.id
                  ? "border-[#1d1d1f] text-[#1d1d1f] dark:border-white dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* COMBINED FILTERS (Campus & Sort) */}
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1.5 shrink-0 border-r border-black/10 dark:border-white/10 pr-2">
            {["Semua", "USU", "POLMED", "Bebas"].map((campus) => (
              <button
                key={campus}
                onClick={() => setSelectedCampus(campus)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                  selectedCampus === campus
                    ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-slate-900"
                    : "bg-black/[0.04] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                }`}
              >
                {campus}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 shrink-0">
            {[
              { id: "all", label: "Terbaru" },
              { id: "popular", label: "Terpopuler" },
              { id: "photo", label: "Ada Foto" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterType(st.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  filterType === st.id
                    ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-slate-900"
                    : "bg-black/[0.04] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* FEED POSTS LIST */}
        <div className="bg-white dark:bg-[#0A0A0A] sm:rounded-[24px] sm:border border-black/[0.06] dark:border-white/[0.08] overflow-hidden mb-12 shadow-sm">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                <Icon.MessageCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Belum ada postingan di filter ini</p>
              <p className="text-xs text-gray-500 mt-1">Jadilah yang pertama mengirim menfess atau info kampus!</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 bg-[#0071e3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0077ed]"
              >
                <Icon.PlusCircle className="w-3.5 h-3.5" />
                <span>Kirim Menfess Sekarang</span>
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isInfo = post.type === "info";
              return (
                <div
                  key={post.id}
                  data-mading-post-id={post.id}
                  className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors relative group"
                >
                  {/* Top Header */}
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${isInfo ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"}`}>
                    {isInfo ? <Icon.Megaphone className="h-4 w-4" /> : <Icon.User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate text-[15px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {post.sender_name || "Anonim"}
                        </p>
                        <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
                          {post.faculty || "USU"}
                        </span>
                        <span className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${isInfo ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                          {isInfo ? "Info Kampus" : "Menfess"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {waktuLalu(post.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Title (If Info) */}
                  {post.title && (
                    <h4 className="mt-2 mb-1 text-[15px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug">
                      {post.title}
                    </h4>
                  )}

                  {/* Content Body */}
                  <p className="text-[15px] sm:text-base leading-[1.6] text-[#1d1d1f] dark:text-gray-200 whitespace-pre-wrap mt-1">
                    {post.content}
                  </p>

                  {/* Attached Image */}
                  {post.image_url && (
                    <div 
                      onClick={() => setZoomImage(post.image_url)}
                      className="mt-3 rounded-[16px] overflow-hidden border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/30 cursor-zoom-in"
                    >
                      <img 
                        src={post.image_url} 
                        alt="Foto menfess" 
                        className="w-full max-h-72 object-cover hover:scale-[1.01] transition-transform duration-300" 
                        loading="lazy" 
                      />
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="mt-3.5 flex items-center gap-4 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
                        post._isLiked ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30" : "hover:text-rose-500"
                      }`}
                    >
                      <Icon.Heart className={`h-3.5 w-3.5 ${post._isLiked ? "fill-current text-rose-500" : ""}`} />
                      <span className="font-bold">{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
                        activeCommentsPostId === post.id ? "text-primary bg-primary/10" : "hover:text-primary"
                      }`}
                    >
                      <Icon.MessageCircle className="h-3.5 w-3.5" />
                      <span className="font-bold">{post.comments_count || 0} Komentar</span>
                    </button>

                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1 py-1 px-2 rounded-lg hover:text-emerald-600 transition-colors ml-auto"
                    >
                      <Icon.Share className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline font-bold">Bagikan</span>
                    </button>

                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
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
        </div>
      </section>

      {/* ── 6. WRITE POST MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] w-full max-w-md p-5 sm:p-6 shadow-2xl border border-black/[0.06] dark:border-white/[0.08] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full font-bold"
            >
            <Icon.X className="h-4 w-4" />
            </button>

            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight mb-4">
              Kirim Menfess &amp; Info Kampus
            </h2>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "menfess" })}
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
                  onClick={() => setFormData({ ...formData, type: "info" })}
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
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Foto Pendukung (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {imagePreview && (
                  <div className="mt-2 relative h-28 w-full rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] disabled:opacity-50 py-3 rounded-full text-[13px] font-bold hover:scale-[0.98] transition-transform shadow-md"
              >
                {submitting ? "Mengirimkan…" : "Terbitkan Sekarang"}
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
    </div>
  );
}
