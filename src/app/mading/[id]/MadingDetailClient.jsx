"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import UnduhMenfessModal from "@/components/mading/UnduhMenfessModal";

const POPULAR_NEWS = [
  {
    rank: 1,
    title: "Panduan Rute & Jadwal Terbaru Shuttle Listrik LINUSKU Kampus USU",
    views: "3,8 rb dibaca",
    tag: "Transportasi",
    href: "/linusku",
  },
  {
    rank: 2,
    title: "Mahasiswa Fasilkom-TI USU Sabet Medali Emas di Ajang Hackathon Nasional",
    views: "2,9 rb dibaca",
    tag: "Prestasi",
    href: "/mading",
  },
  {
    rank: 3,
    title: "Jadwal Pengajuan Keringanan UKT Semester Genap 2024/2025 Resmi Dibuka",
    views: "2,1 rb dibaca",
    tag: "Akademik",
    href: "/mading",
  },
];

const UPCOMING_AGENDA = [
  { day: "24", month: "JAN", title: "Expo UKM & Organisasi Mahasiswa USU", loc: "Pendopo Pancasila USU" },
  { day: "27", month: "JAN", title: "Kuliah Perdana Bersama Tokoh Inspiratif", loc: "Auditorium Utama USU" },
];

export default function MadingDetailClient({ post: initialPost }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialPost?.initialComments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [unduhPost, setUnduhPost] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [userId, setUserId] = useState("");
  const [fontScale, setFontScale] = useState(1);
  const [bookmarked, setBookmarked] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let uid = localStorage.getItem("mading_user_id");
      if (!uid) {
        uid = "usr_" + Math.random().toString(36).substring(2, 12);
        localStorage.setItem("mading_user_id", uid);
      }
      setUserId(uid);
      try {
        const saved = JSON.parse(localStorage.getItem("mading_bookmarks") || "[]");
        if (post?.id && saved.includes(post.id)) setBookmarked(true);
      } catch {
        // ignore
      }
    }
  }, [post?.id]);

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const saved = JSON.parse(localStorage.getItem("mading_bookmarks") || "[]");
      const updated = next
        ? Array.from(new Set([...saved, post.id]))
        : saved.filter((id) => id !== post.id);
      localStorage.setItem("mading_bookmarks", JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.success(next ? "Artikel disimpan ke bookmark" : "Bookmark dihapus");
  };

  const trackEngagement = useCallback(async (action) => {
    if (!userId || !post?.id) return;
    try {
      const res = await fetch(`/api/mading/${post.id}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) => ({
          ...prev,
          views_count: data.viewsCount,
          shares_count: data.sharesCount,
        }));
      }
    } catch {
      // ignore
    }
  }, [userId, post?.id]);

  useEffect(() => {
    if (userId) {
      trackEngagement("view");
    }
  }, [userId, trackEngagement]);

  const handleLike = async () => {
    if (!userId) return;
    const isLiked = post._isLiked;
    setPost((prev) => ({
      ...prev,
      _isLiked: !isLiked,
      likes_count: isLiked ? Math.max(0, prev.likes_count - 1) : prev.likes_count + 1,
    }));

    try {
      const res = await fetch(`/api/mading/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Gagal menyukai postingan.");
      }
    } catch {
      toast.error("Gangguan jaringan.");
    }
  };

  const handleReport = async () => {
    if (!userId) return;
    if (!confirm("Laporkan postingan ini sebagai tidak pantas?")) return;
    try {
      const res = await fetch(`/api/mading/${post.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_identifier: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.pesan || "Laporan diterima.");
      } else {
        toast.error(data.error || "Gagal mengirim laporan");
      }
    } catch {
      toast.error("Gagal mengirim laporan");
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/mading/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: "Mahasiswa",
          faculty: "Bebas",
          content: newCommentText.trim(),
          parent_id: replyingTo?.commentId || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewCommentText("");
        setReplyingTo(null);
        setPost((prev) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
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

  const handleShare = async () => {
    trackEngagement("share");
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const cleanSnippet = (post.content || "").trim().slice(0, 120);
    const titleText = post.title ? `*${post.title}*\n` : "";
    const shareText = `*[Berita & Mading Kampus Kita]*\n${titleText}"${cleanSnippet}${post.content && post.content.length > 120 ? "..." : ""}"\n\nBaca & tanggapi:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: post.title || `Menfess dari ${post.sender_name}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Berhasil dibagikan!");
        return;
      } catch {
        // user cancel
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Tautan artikel berhasil disalin!");
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "Baru saja";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  const formattedDate = post?.created_at
    ? new Date(post.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Hari ini";

  const isLiked = post._isLiked;
  const categoryLabel = post.type === "info" ? "Info Kampus" : "Menfess";
  const displayTitle =
    post.title ||
    (post.type === "info" ? "Informasi Kampus Terkini" : `Menfess dari ${post.sender_name || "Mahasiswa"}`);
  const leadSnippet = (post.content || "").split("\n")[0]?.slice(0, 140);
  const topComments = comments.filter((c) => !c.parent_id);

  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16 font-sans text-[#101f15] dark:text-[#ecfeee]">
      {/* ================= MOBILE VIEW ================= */}
      <div className="lg:hidden bg-white dark:bg-[#0f1e15] min-h-screen">
        {/* Sticky App Top Bar */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0f1e15]/95 backdrop-blur-md border-b border-[#e2f0e6] dark:border-white/10">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Link
                href="/mading"
                aria-label="Kembali"
                className="p-1.5 -ml-1.5 rounded-full text-[#101f15] dark:text-white hover:bg-[#e6f8e8] dark:hover:bg-white/10 transition"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </Link>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-fill text-[#134e35] dark:text-[#bef264] text-[20px]">newspaper</span>
                <span className="font-extrabold text-[17px] tracking-tight text-[#134e35] dark:text-white">
                  Kampus Kita
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#404943] dark:text-slate-300">
              <button
                type="button"
                onClick={toggleBookmark}
                aria-label="Simpan Artikel"
                className={`p-2 rounded-full transition ${
                  bookmarked ? "text-[#134e35] dark:text-[#bef264] bg-[#e6f8e8] dark:bg-white/10" : "hover:bg-[#f4faf5] dark:hover:bg-white/10"
                }`}
              >
                <span className={bookmarked ? "material-symbols-fill text-[20px]" : "material-symbols-outlined text-[20px]"}>
                  bookmark
                </span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Bagikan Berita"
                className="p-2 rounded-full hover:bg-[#f4faf5] dark:hover:bg-white/10 transition"
              >
                <span className="material-symbols-outlined text-[20px]">share</span>
              </button>
              <button
                type="button"
                onClick={() => setUnduhPost(post)}
                aria-label="Unduh Kartu"
                className="p-2 rounded-full hover:bg-[#f4faf5] dark:hover:bg-white/10 transition"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Article Body */}
        <main className="px-4 pt-4 pb-8 space-y-5">
          {/* Category + Faculty Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] text-xs font-bold">
              {categoryLabel}
            </span>
            {post.faculty && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f4faf5] dark:bg-white/5 text-[#404943] dark:text-slate-300 text-xs font-semibold">
                {post.faculty}
              </span>
            )}
          </div>

          {/* Title & Lead */}
          <div>
            <h1 className="text-[22px] font-extrabold text-[#101f15] dark:text-white leading-snug tracking-tight">
              {displayTitle}
            </h1>
            {post.title && leadSnippet && (
              <p className="mt-2 text-sm text-[#404943] dark:text-slate-400 leading-relaxed">
                {leadSnippet}{post.content?.length > 140 ? "..." : ""}
              </p>
            )}
          </div>

          {/* Author Info */}
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-[#134e35] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              {(post.sender_name || "KK").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#101f15] dark:text-white truncate">
                  {post.sender_name || "Tim Redaksi Kampus Kita"}
                </span>
                <span className="material-symbols-fill text-[#134e35] dark:text-[#bef264] text-[15px]">verified</span>
              </div>
              <p className="text-xs text-[#707972] dark:text-slate-400 flex items-center gap-1.5" suppressHydrationWarning>
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                  {post.views_count || 0} dibaca
                </span>
              </p>
            </div>
          </div>

          {/* Hero Image */}
          {post.image_url && (
            <div className="rounded-2xl overflow-hidden border border-[#e2f0e6] dark:border-white/10 bg-[#f4faf5] dark:bg-white/5">
              <button
                type="button"
                onClick={() => setZoomImage(post.image_url)}
                className="block w-full cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt={displayTitle}
                  className="w-full max-h-[320px] object-cover"
                />
              </button>
              <p className="px-3 py-2 text-[11px] text-[#707972] dark:text-slate-400 italic border-t border-[#e2f0e6]/70 dark:border-white/5">
                Dokumentasi {categoryLabel} • {post.sender_name || "Kampus Kita"}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="text-[15px] leading-[1.75] text-[#1f2f24] dark:text-slate-200 whitespace-pre-wrap break-words">
            {post.content}
          </div>

          {/* Reaction Bar */}
          <div className="pt-3 border-t border-[#e2f0e6] dark:border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition active:scale-95 ${
                  isLiked
                    ? "bg-[#ceeb7a] text-[#003622]"
                    : "bg-[#e6f8e8] dark:bg-white/10 text-[#134e35] dark:text-white"
                }`}
              >
                <span className={isLiked ? "material-symbols-fill text-[16px] text-rose-600" : "material-symbols-outlined text-[16px]"}>
                  favorite
                </span>
                <span>{post.likes_count || 0} Suka</span>
              </button>

              <a
                href="#komentar-mobile"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f4faf5] dark:bg-white/5 text-[#404943] dark:text-slate-300 text-xs font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                <span>{comments.length}</span>
              </a>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-[#404943] dark:text-slate-300 hover:bg-[#f4faf5] dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Bagi</span>
              </button>
              <button
                type="button"
                onClick={handleReport}
                title="Laporkan"
                className="p-2 rounded-full text-[#707972] hover:text-amber-600"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </button>
            </div>
          </div>

          {/* Mobile Comments */}
          <section id="komentar-mobile" className="pt-4 border-t border-[#e2f0e6] dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#101f15] dark:text-white">
                Komentar Mahasiswa ({comments.length})
              </h2>
              <span className="text-xs font-bold text-[#134e35] dark:text-[#bef264]">Terbuka</span>
            </div>

            {replyingTo && (
              <div className="flex items-center justify-between rounded-xl bg-[#e6f8e8] dark:bg-[#134e35]/30 px-3 py-2 text-xs font-bold text-[#134e35] dark:text-[#bef264]">
                <span>Membalas @{replyingTo.sender}</span>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-xs underline">
                  Batal
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] flex items-center justify-center text-[11px] font-extrabold shrink-0">
                US
              </div>
              <div className="flex-1 flex items-center gap-2 bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 rounded-full px-3.5 py-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder={replyingTo ? `Balas @${replyingTo.sender}...` : "Tulis tanggapan atau komentar..."}
                  className="flex-1 bg-transparent text-xs text-[#101f15] dark:text-white placeholder:text-[#707972] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  disabled={submittingComment || !newCommentText.trim()}
                  className="text-[#134e35] dark:text-[#bef264] font-extrabold text-xs disabled:opacity-40"
                >
                  {submittingComment ? "..." : <span className="material-symbols-fill text-[18px]">send</span>}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {topComments.length === 0 ? (
                <p className="text-center py-6 text-xs text-[#707972] dark:text-slate-400">
                  Belum ada tanggapan. Jadilah yang pertama berkomentar!
                </p>
              ) : (
                topComments.map((c) => (
                  <div key={c.id} className="space-y-2">
                    <div className="rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#101f15] dark:text-white">{c.sender_name}</span>
                          {c.is_op && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#003622] text-[9px] font-extrabold">
                              OP
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#707972]">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#404943] dark:text-slate-300">{c.content}</p>
                      <button
                        type="button"
                        onClick={() => setReplyingTo({ commentId: c.id, sender: c.sender_name })}
                        className="mt-1.5 text-[11px] font-bold text-[#134e35] dark:text-[#bef264]"
                      >
                        Balas
                      </button>
                    </div>

                    {comments.filter((r) => r.parent_id === c.id).map((reply) => (
                      <div key={reply.id} className="ml-4 pl-3 border-l-2 border-[#ceeb7a]">
                        <div className="rounded-2xl bg-[#e6f8e8]/60 dark:bg-[#134e35]/20 p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#101f15] dark:text-white">{reply.sender_name}</span>
                            <span className="text-[10px] text-[#707972]">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-[#404943] dark:text-slate-300">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Berita Terkait */}
          <section className="pt-4 border-t border-[#e2f0e6] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#101f15] dark:text-white">Berita Terkait</h3>
              <Link href="/mading" className="text-xs font-bold text-[#134e35] dark:text-[#bef264]">
                Semua
              </Link>
            </div>
            <div className="space-y-2.5">
              {POPULAR_NEWS.map((item) => (
                <Link
                  key={item.rank}
                  href={item.href}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-white/5 hover:bg-[#f4faf5] transition"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="inline-block text-[10px] font-bold text-[#134e35] dark:text-[#bef264] bg-[#e6f8e8] dark:bg-[#134e35]/40 px-2 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                    <h4 className="text-xs font-bold text-[#101f15] dark:text-white line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-[#707972] block">{item.views}</span>
                  </div>
                  <span className="material-symbols-outlined text-[#707972] text-[18px] shrink-0">chevron_right</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* ================= DESKTOP VIEW ================= */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb + Back */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#404943] dark:text-slate-400">
            <Link href="/" className="hover:text-[#003622] dark:hover:text-white flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">home</span>
              Beranda
            </Link>
            <span>/</span>
            <Link href="/mading" className="hover:text-[#003622] dark:hover:text-white">
              Berita
            </Link>
            <span>/</span>
            <span className="text-[#134e35] dark:text-[#bef264] font-bold">{categoryLabel}</span>
            <span>/</span>
            <span className="truncate max-w-xs text-[#101f15] dark:text-white">{displayTitle}</span>
          </nav>

          <Link
            href="/mading"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-white/10 hover:bg-[#e6f8e8] text-[#003622] dark:text-white text-xs font-bold shadow-sm transition"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Kembali ke Berita
          </Link>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] text-xs font-bold">
              {categoryLabel}
            </span>
            {post.faculty && (
              <span className="px-3 py-1 rounded-full bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 text-xs font-semibold">
                {post.faculty}
              </span>
            )}
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-[#003622] dark:text-white tracking-tight leading-tight max-w-4xl mb-4">
            {displayTitle}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-[#e2f0e6] dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#134e35] text-white flex items-center justify-center font-extrabold text-sm">
                {(post.sender_name || "KK").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#101f15] dark:text-white">
                    {post.sender_name || "Tim Redaksi Kampus Kita"}
                  </span>
                  <span className="material-symbols-fill text-[#134e35] dark:text-[#bef264] text-[16px]">verified</span>
                </div>
                <p className="text-xs text-[#404943] dark:text-slate-400" suppressHydrationWarning>
                  {formattedDate} • {post.views_count || 0} dibaca • {comments.length} komentar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white dark:bg-white/10 rounded-full p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setFontScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#404943] dark:text-slate-300 hover:bg-[#e6f8e8] dark:hover:bg-white/10"
                  title="Perkecil Ukuran Teks"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontScale((s) => Math.min(1.3, Number((s + 0.1).toFixed(2))))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#404943] dark:text-slate-300 hover:bg-[#e6f8e8] dark:hover:bg-white/10"
                  title="Perbesar Ukuran Teks"
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                onClick={toggleBookmark}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shadow-sm transition ${
                  bookmarked
                    ? "bg-[#ceeb7a] text-[#003622]"
                    : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-200 hover:bg-[#e6f8e8]"
                }`}
              >
                <span className={bookmarked ? "material-symbols-fill text-[16px]" : "material-symbols-outlined text-[16px]"}>
                  bookmark
                </span>
                Simpan
              </button>

              <button
                type="button"
                onClick={() => setUnduhPost(post)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-white/10 text-[#404943] dark:text-slate-200 hover:bg-[#e6f8e8] text-xs font-bold shadow-sm transition"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Unduh
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-bold shadow-sm transition"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                Bagikan
              </button>
            </div>
          </div>
        </div>

        {/* 12-Col Grid */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Main 8 Cols */}
          <div className="col-span-8 space-y-8">
            <article className="bg-white dark:bg-[#112218] rounded-3xl p-8 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-6">
              {post.image_url && (
                <figure className="rounded-2xl overflow-hidden border border-[#e2f0e6] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setZoomImage(post.image_url)}
                    className="block w-full cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={displayTitle}
                      className="w-full max-h-[460px] object-cover"
                    />
                  </button>
                  <figcaption className="px-4 py-2.5 text-xs text-[#707972] dark:text-slate-400 italic bg-[#f4faf5] dark:bg-white/5 flex justify-between">
                    <span>Dokumentasi {categoryLabel}</span>
                    <span>Oleh: {post.sender_name || "Kampus Kita"}</span>
                  </figcaption>
                </figure>
              )}

              <div
                style={{ fontSize: `${16 * fontScale}px` }}
                className="leading-[1.85] text-[#1f2f24] dark:text-slate-200 whitespace-pre-wrap break-words"
              >
                {post.content}
              </div>

              {/* Tags */}
              <div className="pt-4 border-t border-[#e2f0e6] dark:border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#404943] dark:text-slate-400 mr-1">Topik:</span>
                {["#KampusKita", "#USU", "#Polmed", `#${categoryLabel.replace(/\s+/g, "")}`].map((tag) => (
                  <Link
                    key={tag}
                    href="/mading"
                    className="px-3 py-1 rounded-full bg-[#e6f8e8] dark:bg-white/10 hover:bg-[#134e35] hover:text-white text-[#134e35] dark:text-[#bef264] text-xs font-bold transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* Reaction Bar */}
              <div className="pt-4 border-t border-[#e2f0e6] dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLike}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${
                      isLiked
                        ? "bg-[#ceeb7a] text-[#003622]"
                        : "bg-[#f4faf5] dark:bg-white/10 hover:bg-[#ceeb7a] text-[#003622] dark:text-white"
                    }`}
                  >
                    <span className={isLiked ? "material-symbols-fill text-[18px] text-rose-600" : "material-symbols-outlined text-[18px]"}>
                      favorite
                    </span>
                    <span>{post.likes_count || 0} Suka</span>
                  </button>
                  <a
                    href="#komentar-desktop"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f4faf5] dark:bg-white/10 text-[#101f15] dark:text-white text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                    <span>{comments.length} Komentar</span>
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e6f8e8] dark:bg-white/10 hover:bg-[#134e35] hover:text-white text-[#134e35] dark:text-white text-xs font-bold transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    Bagikan
                  </button>
                  <button
                    type="button"
                    onClick={handleReport}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-[#707972] hover:text-amber-600"
                  >
                    <span className="material-symbols-outlined text-[16px]">flag</span>
                    Laporkan
                  </button>
                </div>
              </div>
            </article>

            {/* Desktop Comments */}
            <section
              id="komentar-desktop"
              className="bg-white dark:bg-[#112218] rounded-3xl p-8 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">
                  Komentar Mahasiswa ({comments.length})
                </h2>
                <span className="text-xs font-semibold text-[#707972]">Anonim & Terbuka</span>
              </div>

              {replyingTo && (
                <div className="flex items-center justify-between rounded-xl bg-[#e6f8e8] dark:bg-[#134e35]/30 px-4 py-2 text-xs font-bold text-[#134e35] dark:text-[#bef264]">
                  <span>Membalas @{replyingTo.sender}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="underline">
                    Batal
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={replyingTo ? `Balas @${replyingTo.sender}...` : "Tulis tanggapan atau komentar Anda terkait berita ini..."}
                  className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 p-4 text-sm text-[#101f15] dark:text-white placeholder:text-[#707972] focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#707972]">Gunakan etika bahasa yang santun khas sivitas akademika.</span>
                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={submittingComment || !newCommentText.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    {submittingComment ? "Mengirim..." : "Kirim Komentar"}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {topComments.length === 0 ? (
                  <p className="text-center py-8 text-sm text-[#707972]">
                    Belum ada tanggapan. Jadilah yang pertama berkomentar!
                  </p>
                ) : (
                  topComments.map((c) => (
                    <div key={c.id} className="space-y-2">
                      <div className="rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-4 border border-[#e2f0e6] dark:border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#101f15] dark:text-white">{c.sender_name}</span>
                            {c.is_op && (
                              <span className="px-2 py-0.5 rounded-full bg-[#ceeb7a] text-[#003622] text-[10px] font-extrabold">
                                OP
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#707972]">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-[#404943] dark:text-slate-300 leading-relaxed">{c.content}</p>
                        <button
                          type="button"
                          onClick={() => setReplyingTo({ commentId: c.id, sender: c.sender_name })}
                          className="mt-2 text-xs font-bold text-[#134e35] dark:text-[#bef264] hover:underline"
                        >
                          Balas
                        </button>
                      </div>

                      {comments.filter((r) => r.parent_id === c.id).map((reply) => (
                        <div key={reply.id} className="ml-6 pl-4 border-l-2 border-[#ceeb7a]">
                          <div className="rounded-2xl bg-[#e6f8e8]/60 dark:bg-[#134e35]/20 p-3.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-[#101f15] dark:text-white">{reply.sender_name}</span>
                              <span className="text-[11px] text-[#707972]">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-xs text-[#404943] dark:text-slate-300">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar 4 Cols */}
          <aside className="col-span-4 space-y-6 sticky top-24">
            {/* Penulis Card */}
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#003622] text-white flex items-center justify-center font-extrabold text-base">
                  {(post.sender_name || "KK").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#003622] dark:text-white">
                    {post.sender_name || "Tim Redaksi Kampus Kita"}
                  </h3>
                  <p className="text-xs text-[#707972] dark:text-slate-400">Kanal Resmi Kampus USU & Polmed</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#404943] dark:text-slate-300">
                Menyajikan informasi kampus independen, akurat, dan inspiratif seputar dinamika akademik, prestasi mahasiswa, dan kehidupan kampus.
              </p>
              <Link
                href="/mading"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#e6f8e8] dark:bg-white/10 hover:bg-[#ceeb7a] text-[#003622] dark:text-white text-xs font-bold transition"
              >
                <span className="material-symbols-outlined text-[16px]">newspaper</span>
                Lihat Semua Berita
              </Link>
            </div>

            {/* Berita Populer */}
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#003622] dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#134e35] dark:text-[#bef264]">trending_up</span>
                  Berita Populer
                </h3>
                <span className="text-[11px] font-bold text-[#707972]">Pekan Ini</span>
              </div>
              <div className="space-y-3">
                {POPULAR_NEWS.map((item) => (
                  <Link key={item.rank} href={item.href} className="flex items-start gap-3 group">
                    <span className="text-lg font-extrabold text-[#134e35]/40 dark:text-[#bef264]/40 group-hover:text-[#003622] w-5 shrink-0">
                      {item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#101f15] dark:text-white group-hover:text-[#134e35] dark:group-hover:text-[#bef264] line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <span className="text-[11px] text-[#707972]">{item.views} • {item.tag}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Agenda Terkait */}
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#003622] dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#134e35] dark:text-[#bef264]">calendar_month</span>
                  Agenda Terkait
                </h3>
                <Link href="/jelajahi/agenda" className="text-xs font-bold text-[#134e35] dark:text-[#bef264]">
                  Semua
                </Link>
              </div>
              <div className="space-y-3">
                {UPCOMING_AGENDA.map((ag) => (
                  <Link
                    key={ag.title}
                    href="/jelajahi/agenda"
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#f4faf5] dark:bg-white/5 hover:bg-[#e6f8e8] transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#0a1710] flex flex-col items-center justify-center shrink-0 shadow-xs">
                      <span className="text-[9px] font-extrabold text-[#134e35] dark:text-[#bef264]">{ag.month}</span>
                      <span className="text-sm font-extrabold text-[#003622] dark:text-white leading-none">{ag.day}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#101f15] dark:text-white truncate">{ag.title}</p>
                      <p className="text-[11px] text-[#707972] truncate">{ag.loc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Warta Kampus Mingguan */}
            <div className="bg-[#e6f8e8] dark:bg-[#134e35]/30 rounded-3xl p-6 space-y-3 border border-[#ceeb7a]/60 dark:border-white/10">
              <span className="material-symbols-outlined text-[24px] text-[#003622] dark:text-[#bef264]">mail</span>
              <h3 className="font-extrabold text-sm text-[#003622] dark:text-white">Warta Kampus Mingguan</h3>
              <p className="text-xs text-[#404943] dark:text-slate-300 leading-relaxed">
                Dapatkan rangkuman informasi akademik, beasiswa terverifikasi, dan agenda penting kampus setiap Senin.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  toast.success("Terdaftar untuk Warta Kampus Mingguan!");
                  setNewsletterEmail("");
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Surel mahasiswa (@usu.ac.id)"
                  className="flex-1 min-w-0 rounded-full bg-white dark:bg-[#0a1710] px-3.5 py-2 text-xs text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                />
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-[#003622] text-white flex items-center justify-center shrink-0 hover:bg-[#134e35]"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL UNDUH */}
      {unduhPost && (
        <UnduhMenfessModal post={unduhPost} onClose={() => setUnduhPost(null)} />
      )}

      {/* ZOOM IMAGE MODAL */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setZoomImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImage}
            alt="Perbesar Foto"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
