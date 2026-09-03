"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import UnduhMenfessModal from "@/components/mading/UnduhMenfessModal";

export default function MadingDetailClient({ post: initialPost }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialPost?.initialComments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [unduhPost, setUnduhPost] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
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

  // Handle Like
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

  // Handle Report
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

  // Handle Send Comment
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

  // Handle Share
  const handleShare = async () => {
    trackEngagement("share");
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const cleanSnippet = (post.content || "").trim().slice(0, 120);
    const titleText = post.title ? `*${post.title}*\n` : "";
    const shareText = ` *[Mading & Menfess Kampus]*\n${titleText}"${cleanSnippet}${post.content && post.content.length > 120 ? "..." : ""}"\n\n Baca & tanggapi:\n${shareUrl}`;

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
      toast.success("Tautan postingan berhasil disalin ke papan klip!");
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

  const isLiked = post._isLiked;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0b0b0f] pb-[calc(6.5rem+env(safe-area-inset-bottom))] font-sans selection:bg-primary/20">
      {/* TOP NAVBAR */}
      <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#121215]/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/mading"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1d1d1f] dark:text-white hover:text-primary transition-colors py-1 px-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>←</span>
            <span>Semua Mading</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnduhPost(post)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary py-1.5 px-3 rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <Icon.Download className="h-3.5 w-3.5" />
              <span>Unduh</span>
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1 text-xs font-bold text-white py-1.5 px-3 rounded-full bg-primary hover:bg-primary/90 shadow-xs shadow-primary/20"
            >
              <Icon.Share className="h-3.5 w-3.5" />
              <span>Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">
        {/* POST CARD */}
        <article className="bg-white dark:bg-[#151518] rounded-[24px] border border-slate-100 dark:border-white/[0.05] p-6 shadow-sm transition-all">
          {/* Header: Sender & Badges */}
          <div className="flex items-start gap-3.5 mb-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${
                post.type === "info"
                  ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                  : post.faculty === "POLMED"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              }`}
            >
              {post.type === "info" ? <Icon.Megaphone className="h-6 w-6" /> : post.is_anon ? <Icon.User className="h-6 w-6" /> : post.sender_name?.charAt(0) || "A"}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[17px] font-bold text-slate-900 dark:text-white">
                  {post.sender_name}
                </span>
                <span className="rounded-full bg-slate-100/80 dark:bg-slate-800 px-3 py-0.5 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  {post.faculty}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-[12px] font-medium flex items-center gap-1.5 ${
                    post.type === "info"
                      ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                  }`}
                >
                  {post.type === "info" ? <Icon.Megaphone className="h-3.5 w-3.5" /> : <Icon.Mail className="h-3.5 w-3.5" />}
                  {post.type === "info" ? "Info Kampus" : "Menfess"}
                </span>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500" suppressHydrationWarning>
                {timeAgo(post.created_at)}
              </p>
            </div>
          </div>

          {/* Title if info */}
          {post.title && (
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">
              {post.title}
            </h1>
          )}

          {/* Post Content */}
          <div className="text-[16px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words py-1">
            {post.content}
          </div>

          {/* Attached Photo */}
          {post.image_url && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setZoomImage(post.image_url)}
                className="group relative block w-full aspect-video overflow-hidden cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt={post.title || "Foto Menfess"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-5 sm:gap-6">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors active:scale-95 ${
                  isLiked
                    ? "text-rose-500"
                    : "hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon.Heart className={`h-5 w-5 ${isLiked ? "fill-current scale-110" : ""} transition-transform`} />
                <span className="text-[14px] sm:text-[15px]">{post.likes_count || 0}</span>
              </button>

              <button
                onClick={() => setUnduhPost(post)}
                className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors active:scale-95"
              >
                <Icon.Download className="h-5 w-5" />
                <span className="text-[14px] sm:text-[15px] hidden sm:inline">Unduh Gambar</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors active:scale-95"
              >
                <Icon.Share className="h-5 w-5" />
                <span className="text-[14px] sm:text-[15px] hidden sm:inline">Bagikan</span>
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              <button
                onClick={handleReport}
                title="Laporkan"
                className="hover:text-amber-500 transition-colors"
              >
                <Icon.Flag className="h-5 w-5" />
              </button>
              <span className="flex items-center gap-1.5">
                <Icon.Eye className="h-5 w-5" />
                <span className="text-[14px] sm:text-[15px]">{post.views_count || 0}</span>
              </span>
            </div>
          </div>
        </article>

        {/* COMMENTS SECTION */}
        <section className="bg-white dark:bg-[#151518] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <span>Tanggapan & Diskusi</span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-primary">
                {comments.length}
              </span>
            </h2>
            <span className="text-[11px] text-slate-400">Anonim & Terbuka</span>
          </div>

          {/* Comment Input */}
          <div className="space-y-2">
            {replyingTo && (
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <span>Membalas @{replyingTo.sender}</span>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-sm font-black px-1"></button>
              </div>
            )}
            <div className="flex gap-2">
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
                placeholder={replyingTo ? `Balas @${replyingTo.sender}...` : "Tulis tanggapan atau saran kamu..."}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSendComment}
                disabled={submittingComment || !newCommentText.trim()}
                className="btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 disabled:opacity-50"
              >
                {submittingComment ? "..." : "Kirim"}
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p className="text-2xl mb-1"><svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg></p>
                <p>Belum ada tanggapan. Jadilah yang pertama berkomentar!</p>
              </div>
            ) : (
              comments.filter((c) => !c.parent_id).map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80 p-3.5 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">{c.sender_name}</span>
                        {c.is_op && <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-black text-primary">OP</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-300 font-medium">{c.content}</p>
                    <button
                      type="button"
                      onClick={() => setReplyingTo({ commentId: c.id, sender: c.sender_name })}
                      className="mt-2 text-[10px] font-bold text-primary hover:underline"
                    >
                      Balas
                    </button>
                  </div>

                  {/* Replies */}
                  {comments.filter((reply) => reply.parent_id === c.id).map((reply) => (
                    <div key={reply.id} className="ml-5 border-l-2 border-primary/20 pl-3">
                      <div className="rounded-2xl bg-primary/[0.04] dark:bg-primary/10 p-3 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{reply.sender_name}</span>
                            {reply.is_op && <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-black text-primary">OP</span>}
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
        </section>
      </div>

      {/* MODAL UNDUH */}
      {unduhPost && (
        <UnduhMenfessModal post={unduhPost} onClose={() => setUnduhPost(null)} />
      )}

      {/* ZOOM IMAGE MODAL */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
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
