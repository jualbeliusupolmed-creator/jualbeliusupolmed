"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import PullToRefresh from "@/components/PullToRefresh";
import UnduhMenfessModal from "@/components/mading/UnduhMenfessModal";
import MenfessReplySection from "@/components/mading/MenfessReplySection";

const CAMPUSES = ["USU", "POLMED", "Bebas"];
const FILTER_CAMPUSES = ["Semua", "USU", "POLMED", "Bebas"];

export default function MadingClient({ initialPosts = [] }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'menfess' | 'info' | 'organisasi' | 'blog'

  const [selectedFaculty, setSelectedFaculty] = useState("Semua");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'popular' | 'photo'
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [unduhPost, setUnduhPost] = useState(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      // Semua tab yang valid sekarang termasuk 'organisasi'
      if (["info", "menfess", "blog", "organisasi"].includes(tab)) setActiveTab(tab);
      if (params.get("buat") === "1") setShowModal(true);
    } catch {
      // Query parameters are a progressive enhancement only.
    }
  }, []);

  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "menfess",
    sender_name: "Anonim",
    faculty: "USU",
    title: "",
    content: "",
    is_anon: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [zoomImage, setZoomImage] = useState(null);

  // Get or create unique user ID for liking
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setZoomImage(null);
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const trackEngagement = useCallback(async (postId, action) => {
    if (!userId || !postId) return;
    try {
      const res = await fetch(`/api/mading/${postId}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId: userId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPosts((current) => current.map((post) => (
        post.id === postId
          ? { ...post, views_count: data.viewsCount, shares_count: data.sharesCount }
          : post
      )));
    } catch {
      // Statistik tidak boleh mengganggu pengalaman membaca feed.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const postId = entry.target.dataset.madingPostId;
        if (!entry.isIntersecting || !postId || viewedPostIds.current.has(postId)) return;
        viewedPostIds.current.add(postId);
        trackEngagement(postId, "view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document.querySelectorAll("[data-mading-post-id]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [posts, userId, trackEngagement]);

  const PAGE_LIMIT = 15;

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (activeTab !== "all" && activeTab !== "blog") params.set("type", activeTab);
      if (selectedFaculty !== "Semua") params.set("faculty", selectedFaculty);

      if (activeTab === "blog") {
        const res = await fetch(`/api/blog`);
        const data = await res.json();
        setPosts((data.blogs || []).map((b) => ({ ...b, _kind: "blog" })));
        setHasMore(false);
      } else if (activeTab === "all") {
        const [resMading, resBlog] = await Promise.all([
          fetch(`/api/mading?${params.toString()}`),
          page === 1 ? fetch(`/api/blog`) : Promise.resolve(null),
        ]);
        const dataMading = await resMading.json();
        const dataBlog = resBlog ? await resBlog.json() : { blogs: [] };

        const madingPosts = (dataMading.posts || []).map((p) => ({ ...p, _kind: "mading" }));
        const blogPosts = page === 1
          ? (dataBlog.blogs || []).map((b) => ({ ...b, _kind: "blog" }))
          : [];

        const combined = [...madingPosts, ...blogPosts]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (append) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            return [...prev, ...combined.filter((p) => !existingIds.has(p.id))];
          });
        } else {
          setPosts(combined);
        }
        setHasMore(dataMading.page < dataMading.totalPages);
      } else {
        const res = await fetch(`/api/mading?${params.toString()}`);
        const data = await res.json();
        const newPosts = (data.posts || []).map((p) => ({ ...p, _kind: "mading" }));
        if (append) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            return [...prev, ...newPosts.filter((p) => !existingIds.has(p.id))];
          });
        } else {
          setPosts(newPosts);
        }
        setHasMore(data.page < data.totalPages);
      }
    } catch {
      toast.error(activeTab === "blog" ? "Gagal memuat Blog." : "Gagal memuat feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, selectedFaculty]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchPosts(1, false);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchPosts(nextPage, true);
  }, [currentPage, fetchPosts]);

  // Handle Report
  const handleReport = async (postId) => {
    if (!userId) return;
    if (!confirm("Laporkan postingan ini sebagai tidak pantas?")) return;
    try {
      const res = await fetch(`/api/mading/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.pesan || "Laporan diterima.");
        if (data.disembunyikan) {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
      } else {
        toast.error(data.error || "Gagal mengirim laporan");
      }
    } catch {
      toast.error("Gagal mengirim laporan");
    }
  };

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
            likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/mading/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
      const data = await res.json();
      if (!data.success) {
        fetchPosts();
      }
    } catch {
      fetchPosts();
    }
  };

  // Handle Load Comments
  const toggleComments = async (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      setReplyingTo(null);
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

  // Handle Submit Comment
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
          parent_id: replyingTo?.postId === postId ? replyingTo.commentId : null,
        }),
      });
      const data = await res.json();

      if (data.success && data.comment) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setNewCommentText("");
        setReplyingTo(null);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
        );
        toast.success("Komentar terkirim!");
      } else {
        toast.error(data.error || "Gagal mengirim komentar.");
      }
    } catch {
      toast.error("Terjadi gangguan saat mengirim komentar.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Share to WhatsApp & Social Media
  const handleShare = async (post) => {
    trackEngagement(post.id, "share");
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/mading/${post.id}` : "";
    const cleanSnippet = (post.content || "").trim().slice(0, 120);
    const titleText = post.title ? `*${post.title}*\n` : "";
    const shareText = `🔥 *[Mading & Menfess Kampus]*\n${titleText}"${cleanSnippet}${post.content && post.content.length > 120 ? "..." : ""}"\n\n👀 Baca selengkapnya & beri tanggapan:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: post.title || "Mading & Menfess Kampus",
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

    // Fallback: Copy to clipboard & open WhatsApp
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Tautan & ringkasan disalin! Membuka WhatsApp…");
    } catch {}

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p))
    );
  };

  // Handle Submit New Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Isi postingan tidak boleh kosong!");
      return;
    }

    setSubmitting(true);
    setUploadStage(imageFile ? "uploading_photo" : "publishing");
    try {
      let imageUrl = null;
      if (imageFile) {
        setUploadStage("uploading_photo");
        const uploadForm = new FormData();
        uploadForm.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Gagal mengunggah foto.");
        }
        imageUrl = uploadData.url;
      }

      setUploadStage("publishing");
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
      if (res.status === 401) {
        toast.error("Masuk dulu ya untuk memposting ke Menfess & Info.");
        window.location.href = "/profil";
        return;
      }
      if (data.success) {
        toast.success("Postingan berhasil diterbitkan!");
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
        fetchPosts(1, false);
      } else {
        toast.error(data.error || "Gagal menerbitkan postingan.");
      }
    } catch {
      toast.error("Terjadi gangguan jaringan.");
    } finally {
      setSubmitting(false);
      setUploadStage("");
    }
  };

  // Relative Time Formatter
  const timeAgo = (dateStr) => {
    if (!dateStr) return "Baru saja";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  return (
    <PullToRefresh onRefresh={fetchPosts}>
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0b0b0f] pb-[calc(6.5rem+env(safe-area-inset-bottom))] font-sans selection:bg-primary/20">
        
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#121215]/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <span>Mading</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-emerald-400/15 dark:text-emerald-300">
                  Kampus
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-[#6e6e73] dark:text-slate-400 mt-0.5">
                Menfess, curhat, kabar, dan cerita mahasiswa
              </p>
            </div>

            {activeTab !== "blog" && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white px-3.5 py-2 rounded-2xl text-xs font-bold shadow-sm shadow-primary/25 active:scale-95 transition-all shrink-0"
              >
                <Icon.PlusCircle className="w-4 h-4" />
                <span>Tulis</span>
              </button>
            )}
          </div>

          {/* MAIN TABS */}
          <div className="max-w-2xl mx-auto px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 pt-0.5">
            {[
              { id: "all", label: "Semua", icon: "✨" },
              { id: "menfess", label: "Menfess", icon: "💌" },
              { id: "info", label: "Info Kampus", icon: "📢" },
              { id: "organisasi", label: "Organisasi", icon: "🏛️" },
              { id: "blog", label: "Blog", icon: "✍️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3.5">
          {/* CAMPUS & QUICK CATEGORY FILTER PILLS (Hide on Blog tab) */}
          {activeTab !== "blog" && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
              {/* Campus Selector */}
              <div className="flex items-center gap-1 shrink-0">
                {FILTER_CAMPUSES.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFaculty(f)}
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                      selectedFaculty === f
                        ? "bg-primary text-white shadow-xs"
                        : "bg-white dark:bg-[#1c1c1e] text-slate-600 dark:text-slate-400 border border-black/[0.06] dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Sub-Filters */}
              <div className="flex items-center gap-1 shrink-0">
                {[
                  { id: "all", label: "Semua" },
                  { id: "popular", label: "🔥 Populer" },
                  { id: "photo", label: "📷 Foto" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFilterType(st.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all active:scale-95 ${
                      filterType === st.id
                        ? "bg-primary/10 text-primary dark:bg-emerald-400/15 dark:text-emerald-300 border border-primary/20"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 bg-white/70 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.04]"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FEED LIST */}
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white dark:bg-[#151518] p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] animate-pulse space-y-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-[#151518] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                💌
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Belum Ada Menfess di Sini</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                Jadilah orang pertama yang mengirim menfess atau cerita kampus!
              </p>
              {activeTab !== "blog" && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-2xl text-xs font-bold hover:bg-primary/95 shadow-sm shadow-primary/20 active:scale-95 transition-all"
                >
                  <Icon.PlusCircle className="w-4 h-4" />
                  <span>Tulis Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className={activeTab === "blog" ? "grid gap-4 sm:grid-cols-2" : "space-y-3 sm:space-y-3.5"}>
              {posts
                .filter((item) => {
                  if (item._kind === "blog") return true;
                  if (filterType === "photo" && !item.image_url) return false;
                  return true;
                })
                .sort((a, b) => {
                  if (filterType === "popular") {
                    const scoreA = (a.views_count || 0) + (a.likes_count || 0) * 3 + (a.comments_count || 0) * 2;
                    const scoreB = (b.views_count || 0) + (b.likes_count || 0) * 3 + (b.comments_count || 0) * 2;
                    return scoreB - scoreA;
                  }
                  return 0;
                })
                .map((item) => {
                if (item._kind === "blog") {
                  const excerpt = item.excerpt || item.content_markdown?.replace(/[#*`]/g, "")?.slice(0, 100);
                  return (
                    <Link
                      key={`blog-${item.id}`}
                      href={`/blog/${item.slug}`}
                      className={`group flex overflow-hidden bg-white dark:bg-[#151518] border border-black/[0.06] dark:border-white/[0.08] shadow-xs rounded-3xl transition-all hover:border-black/[0.15] dark:hover:border-white/[0.18] ${activeTab === "blog" ? "flex-col" : "flex-col sm:flex-row"}`}
                    >
                      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 ${activeTab === "blog" ? "w-full h-40" : "w-full h-48 sm:w-48 sm:h-auto"}`}>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary/40 dark:text-slate-700"><Icon.MessageCircle className="h-8 w-8" /></div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <p className="text-[11px] font-bold text-primary dark:text-emerald-400">✍️ Artikel Blog</p>
                        <h2 className="mt-1 line-clamp-2 text-sm sm:text-base font-extrabold leading-snug transition-colors group-hover:text-primary dark:text-white">
                          {item.title}
                        </h2>
                        {excerpt && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{excerpt}</p>
                        )}
                        <div className="mt-auto pt-3 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                          <span>{item.author}</span>
                          <time dateTime={item.created_at}>
                            {timeAgo(item.created_at)}
                          </time>
                        </div>
                      </div>
                    </Link>
                  );
                }
                
                const post = item;
                const isLiked = post._isLiked;
                return (
                  <div
                    key={`post-${post.id}`}
                    data-mading-post-id={post.id}
                    className="group relative bg-white dark:bg-[#151518] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs transition-all hover:border-black/[0.12] dark:hover:border-white/[0.15]"
                  >
                    {/* Header: Sender & Badges */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-black shadow-inner ${
                          post.type === "info"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                            : post.faculty === "POLMED"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                        }`}
                      >
                        {post.type === "info" ? "📢" : post.is_anon ? "👤" : post.sender_name?.charAt(0) || "👤"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate text-sm font-black text-[#1d1d1f] dark:text-white">
                            {post.sender_name}
                          </span>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {post.faculty}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            post.type === "info"
                              ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}>
                            {post.type === "info" ? "📢 Info Kampus" : "💌 Menfess"}
                          </span>
                        </div>
                        <Link
                          href={`/mading/${post.id}`}
                          className="inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-primary transition-colors mt-0.5"
                        >
                          {timeAgo(post.created_at)} ↗
                        </Link>
                      </div>
                    </div>

                    {/* Title (If info) */}
                    {post.title && (
                      <Link href={`/mading/${post.id}`}>
                        <h3 className="mb-1.5 text-sm sm:text-base font-black leading-snug text-[#1d1d1f] dark:text-white hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                    )}

                    {/* Content */}
                    <p className="whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
                      {post.content}
                    </p>

                    {/* Image Attachment (if any) */}
                    {post.image_url && (
                      <button
                        type="button"
                        onClick={() => setZoomImage({ url: post.image_url, sender: post.sender_name, title: post.title || post.content })}
                        className="mt-3 relative block w-full rounded-2xl overflow-hidden cursor-zoom-in group border border-black/[0.06] dark:border-white/[0.08] bg-[#f5f5f7] dark:bg-slate-800/50 text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <img
                          src={post.image_url}
                          alt="Foto kiriman Menfess"
                          className="max-h-[380px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-end justify-end p-2.5 pointer-events-none">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            🔍 Perbesar foto
                          </span>
                        </div>
                      </button>
                    )}

                    {/* MINIMALIST ACTION TOOLBAR */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      {/* Left: Interactive buttons */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {/* Like */}
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                            isLiked
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Icon.Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-500 text-rose-500 scale-110" : ""} transition-transform`} />
                          <span>{post.likes_count || 0}</span>
                        </button>

                        {/* Komentar / Thread */}
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            activeCommentsPostId === post.id
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Icon.MessageCircle className="h-3.5 w-3.5" />
                          <span>{post.comments_count || 0}</span>
                        </button>

                        {/* Unduh Gambar Menfess */}
                        <button
                          onClick={() => setUnduhPost(post)}
                          title="Unduh gambar Instagram Menfess"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-emerald-400 transition-all active:scale-95"
                        >
                          <Icon.Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Unduh</span>
                        </button>

                        {/* Bagikan */}
                        <button
                          onClick={() => handleShare(post)}
                          title="Bagikan ke WhatsApp"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-95"
                        >
                          <Icon.Share className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Bagikan</span>
                        </button>
                      </div>

                      {/* Right: Info & Report */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReport(post.id)}
                          title="Laporkan postingan ini"
                          className="p-1 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          <Icon.Flag className="h-3.5 w-3.5" />
                        </button>

                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          <Icon.Eye className="h-3 w-3" />
                          <span>{post.views_count || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* COMMENTS THREAD ACCORDION */}
                    {activeCommentsPostId === post.id && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {(commentsMap[post.id] || []).length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-2">
                              Belum ada komentar. Jadilah yang pertama membalas! 💬
                            </p>
                          ) : (
                            commentsMap[post.id].filter((c) => !c.parent_id).map((c) => (
                              <div key={c.id} className="space-y-1.5">
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
                                  <div className="mb-1 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.sender_name}</span>
                                      {c.is_op && (
                                        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.2 text-[9px] font-black text-primary dark:bg-emerald-400/15 dark:text-emerald-300">
                                          OP
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                                  </div>
                                  <p className="leading-relaxed text-slate-700 dark:text-slate-300">{c.content}</p>
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo({ postId: post.id, commentId: c.id, sender: c.sender_name })}
                                    className="mt-1 text-[10px] font-bold text-primary dark:text-emerald-400 hover:underline"
                                  >
                                    Balas
                                  </button>
                                </div>
                                {commentsMap[post.id].filter((reply) => reply.parent_id === c.id).map((reply) => (
                                  <div key={reply.id} className="ml-4 border-l-2 border-primary/20 pl-2.5">
                                    <div className="rounded-2xl bg-primary/[0.04] dark:bg-primary/10 p-2.5 text-xs">
                                      <div className="mb-1 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">{reply.sender_name}</span>
                                          {reply.is_op && <span className="text-[9px] font-black text-primary dark:text-emerald-300">OP</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400">{timeAgo(reply.created_at)}</span>
                                      </div>
                                      <p className="leading-relaxed text-slate-700 dark:text-slate-300">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input Box */}
                        {replyingTo?.postId === post.id && (
                          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
                            <span>Membalas @{replyingTo.sender}</span>
                            <button type="button" onClick={() => setReplyingTo(null)} className="text-sm font-black px-1" aria-label="Batal membalas">✕</button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSendComment(post.id);
                            }}
                            placeholder={replyingTo?.postId === post.id ? `Balas @${replyingTo.sender}…` : "Tulis tanggapan / komentar anonim…"}
                            className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-primary/30 rounded-2xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all"
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            disabled={submittingComment || !newCommentText.trim()}
                            className="bg-primary disabled:opacity-50 text-white px-4 py-2 rounded-2xl text-xs font-bold hover:bg-primary/95 transition-opacity shrink-0 active:scale-95 shadow-xs shadow-primary/20"
                          >
                            Kirim
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* LOAD MORE */}
          {!loading && posts.length > 0 && activeTab !== "blog" && (
            <div className="flex justify-center pt-2 pb-4">
              {hasMore ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#151518] px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Memuat...
                    </>
                  ) : (
                    <>
                      <Icon.ChevronDown className="h-3.5 w-3.5" />
                      Muat lebih banyak
                    </>
                  )}
                </button>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium">
                  Semua postingan sudah ditampilkan ✓
                </p>
              )}
            </div>
          )}
        </div>

        {/* MODAL BUAT POST BARU */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-black/[0.06] dark:border-white/[0.08] relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                ✕
              </button>

              <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.03em] mb-4">
                Kirim Postingan Menfess &amp; Info
              </h2>

              <form onSubmit={handleCreatePost} className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "menfess" })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.type === "menfess"
                        ? "bg-white dark:bg-slate-700 text-amber-600 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    💌 Menfess (Curhat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "info" })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.type === "info"
                        ? "bg-white dark:bg-slate-700 text-fuchsia-600 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    📢 Info Kampus
                  </button>
                </div>

                {/* Title (Only for Info) */}
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
                      placeholder="Contoh: Oprec Panitia Seminar Nasional 2026"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                )}

                {/* Campus Picker */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kategori Kampus
                  </label>
                  <select
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    {CAMPUSES.map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {formData.type === "menfess" ? "Isi Curhatan / Pesan" : "Detail Informasi"}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formData.content.length}/1000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={1000}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={
                      formData.type === "menfess"
                        ? "Ketik pesanmu di sini... (Sensor kata kotor aktif otomatis)"
                        : "Jelaskan detail informasi kegiatan atau pengumuman kampus..."
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="mading-image" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Foto (opsional)
                    </label>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP, atau GIF · maks. 5 MB</span>
                  </div>
                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <img src={imagePreview} alt="Pratinjau foto Menfess" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(""); }}
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="mading-image" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-400">
                      <Icon.PlusCircle className="h-4 w-4" /> Tambahkan foto
                    </label>
                  )}
                  <input
                    id="mading-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Foto maksimal 5 MB.");
                        event.target.value = "";
                        return;
                      }
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                </div>

                {/* Anonimity Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kirim Sebagai Anonim (Rahasiakan Nama)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.is_anon}
                    onChange={(e) => setFormData({ ...formData, is_anon: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                </div>

                {!formData.is_anon && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nama / Alias Kamu
                    </label>
                    <input
                      type="text"
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                      placeholder="Nama lengkap / panggilan"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/30 hover:bg-primary/95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {uploadStage === "uploading_photo"
                          ? "Mengompresi & Mengunggah Foto..."
                          : "Menerbitkan Postingan..."}
                      </span>
                    </>
                  ) : (
                    <span>Terbitkan ke Menfess & Info 🚀</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* LIGHTBOX / FULL SCREEN PHOTO MODAL */}
        {zoomImage && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setZoomImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Action Bar */}
              <div className="w-full flex items-center justify-between text-white/90 mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm truncate max-w-[200px] xs:max-w-xs">
                    📷 Kiriman {zoomImage.sender || "Anonim"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={zoomImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition-all flex items-center gap-1"
                  >
                    Buka Ukuran Penuh ↗
                  </a>
                  <button
                    onClick={() => setZoomImage(null)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all text-xs w-8 h-8 flex items-center justify-center"
                    aria-label="Tutup Foto"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Photo View */}
              <div className="overflow-hidden rounded-2xl shadow-2xl border border-white/10 max-h-[80vh] flex items-center justify-center bg-black/40">
                <img
                  src={zoomImage.url}
                  alt="Foto kiriman diperbesar"
                  className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL UNDUH MENFESS */}
        {unduhPost && (
          <UnduhMenfessModal
            post={unduhPost}
            onClose={() => setUnduhPost(null)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
