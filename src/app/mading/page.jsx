"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { FACULTIES } from "@/lib/profanity";
import { toast } from "sonner";

export default function MadingPage() {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'menfess' | 'info'

  // Hormati ?tab= dari tautan luar (kartu "Info Kampus" di beranda mengirim
  // /mading?tab=info) — tanpa ini query-nya diabaikan diam-diam dan pengunjung
  // selalu mendarat di tab default. Dibaca dari location, bukan useSearchParams,
  // supaya tidak butuh pagar <Suspense> untuk satu nilai sekali-baca.
  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "info" || tab === "menfess") setActiveTab(tab);
    } catch {}
  }, []);
  const [selectedFaculty, setSelectedFaculty] = useState("Semua");
  const [posts, setPosts] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "menfess",
    sender_name: "Anonim",
    faculty: "Umum",
    title: "",
    content: "",
    is_anon: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Get or create unique user ID for liking
  const [userId, setUserId] = useState("");
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

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "blog") {
        const res = await fetch(`/api/blog`);
        const data = await res.json();
        setBlogs(data.blogs || []);
      } else {
        const params = new URLSearchParams();
        if (activeTab !== "all") params.set("type", activeTab);
        if (selectedFaculty !== "Semua") params.set("faculty", selectedFaculty);
  
        const res = await fetch(`/api/mading?${params.toString()}`);
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      toast.error(activeTab === "blog" ? "Gagal memuat Blog." : "Gagal memuat postingan Menfess & Info.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedFaculty]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle Report — 5 pelapor berbeda menyembunyikan postingan otomatis
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
    // Optimistic UI
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
        fetchPosts(); // Rollback if error
      }
    } catch {
      fetchPosts();
    }
  };

  // Handle Load Comments
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
          faculty: "Umum",
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

  // Handle Submit New Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast.error("Isi postingan tidak boleh kosong!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/mading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          sender_name: formData.is_anon ? "Anonim" : formData.sender_name || "Mahasiswa",
          faculty: formData.faculty,
          title: formData.type === "info" ? formData.title : null,
          content: formData.content,
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
          faculty: "Umum",
          title: "",
          content: "",
          is_anon: true,
        });
        fetchPosts();
      } else {
        toast.error(data.error || "Gagal menerbitkan postingan.");
      }
    } catch {
      toast.error("Terjadi gangguan jaringan.");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans selection:bg-primary/20">
      
      {/* STICKY HEADER */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div>
            <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
              KAMPUS FEED
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Mading & Blog
            </h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all"
          >
            <Icon.PlusCircle className="w-4 h-4" />
            <span>Kirim Post</span>
          </button>
        </div>

        {/* 4 TABS */}
        <div className="flex px-4 max-w-2xl mx-auto border-t border-slate-50 dark:border-slate-800/60">
          {[
            { id: "all", label: "🌟 Semua" },
            { id: "menfess", label: "💌 Menfess" },
            { id: "info", label: "📢 Info" },
            { id: "blog", label: "📝 Blog" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-center py-2.5 text-xs font-bold transition-all relative ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* FACULTY FILTER PILLS (Hide on Blog tab) */}
        {activeTab !== "blog" && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["Semua", "FASILKOM-TI", "FT", "FEB", "FIB", "FK", "FH", "POLMED"].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFaculty(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-all ${
                selectedFaculty === f
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
          </div>
        )}

        {/* FEED LIST */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
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
        ) : activeTab === "blog" ? (
          blogs.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                📝
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Belum Ada Artikel</h3>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {blogs.map((blog) => {
                const excerpt = blog.excerpt || blog.content_markdown?.replace(/[#*`]/g, "")?.slice(0, 100);
                return (
                  <Link
                    key={blog.id}
                    href={`/blog/${blog.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      {blog.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300 dark:text-slate-700">📝</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Artikel</p>
                      <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary dark:text-white">
                        {blog.title}
                      </h2>
                      {excerpt && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{excerpt}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-slate-400">
                        <span>{blog.author}</span>
                        <time dateTime={blog.created_at}>
                          {new Date(blog.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </time>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              📝
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Belum Ada Postingan</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Jadilah orang pertama yang mengirim Menfess atau Info kampus hari ini!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-primary/20"
            >
              <Icon.PlusCircle className="w-4 h-4" />
              Tulis Sekarang
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all hover:border-slate-200 dark:hover:border-slate-700"
            >
              {/* Type Indicator Line */}
              <div
                className={`absolute top-0 right-0 w-1.5 h-full ${
                  post.type === "info" ? "bg-fuchsia-500" : "bg-amber-400"
                }`}
              />

              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    post.type === "info"
                      ? "bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-600"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-600"
                  }`}
                >
                  {post.type === "info" ? "📢" : "👤"}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {post.sender_name}
                    </p>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-semibold">
                      {post.faculty}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {post.type === "info" ? "Info Kampus" : "Menfess"} • {timeAgo(post.created_at)}
                  </p>
                </div>
              </div>

              {/* Title (If info) */}
              {post.title && (
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                  {post.title}
                </h3>
              )}

              {/* Content */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/80 text-slate-500 text-xs font-semibold">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                    post._isLiked
                      ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30"
                      : "hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon.Heart className={`w-4 h-4 ${post._isLiked ? "fill-current text-rose-500" : ""}`} />
                  <span>{post.likes_count || 0}</span>
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                    activeCommentsPostId === post.id
                      ? "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon.MessageCircle className="w-4 h-4" />
                  <span>{post.comments_count || 0} Komentar</span>
                </button>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: "Menfess & Info — USU & POLMED",
                        text: post.content,
                        url: window.location.href,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(post.content);
                      toast.success("Teks disalin ke papan klip!");
                    }
                  }}
                  className="flex items-center gap-1 py-1 px-2 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 ml-auto transition-colors"
                >
                  <Icon.ExternalLink className="w-3.5 h-3.5" />
                  <span>Bagi</span>
                </button>

                <button
                  onClick={() => handleReport(post.id)}
                  title="Laporkan postingan ini"
                  className="flex items-center gap-1 py-1 px-2 rounded-lg hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Icon.Flag className="w-3.5 h-3.5" />
                  <span className="sr-only sm:not-sr-only">Lapor</span>
                </button>
              </div>

              {/* COMMENTS ACCORDION SECTION */}
              {activeCommentsPostId === post.id && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-300">
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(commentsMap[post.id] || []).length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">
                        Belum ada komentar. Jadilah yang pertama berkomentar!
                      </p>
                    ) : (
                      commentsMap[post.id].map((c) => (
                        <div key={c.id} className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{c.sender_name}</span>
                            <span className="text-[9px] text-slate-400">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-snug">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
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
                      className="bg-primary disabled:opacity-50 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-primary/90 transition-opacity shrink-0"
                    >
                      Kirim
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL BUAT POST BARU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
            >
              ✕
            </button>

            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Kirim Postingan Menfess & Info
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

              {/* Faculty Picker */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fakultas / Kampus
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  {FACULTIES.map((fac) => (
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
                className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/30 hover:bg-primary/95 transition-all disabled:opacity-50"
              >
                {submitting ? "Menerbitkan..." : "Terbitkan ke Menfess & Info 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
