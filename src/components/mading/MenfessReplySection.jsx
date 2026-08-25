"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

export default function MenfessReplySection({ postId, initialCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && !loaded) {
      loadReplies();
    }
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadReplies() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mading/${postId}/reply`);
      const data = await res.json();
      setReplies(data.replies || []);
      setCount(data.total || data.replies?.length || 0);
      setLoaded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    if (text.length < 2) return toast.error("Balasan terlalu pendek.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/mading/${postId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim balasan.");

      setReplies((prev) => [...prev, data.reply]);
      setCount((c) => c + 1);
      setReplyText("");
      toast.success("Balasan terkirim! 💬");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-emerald-400 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>
          {open ? "Tutup" : count > 0 ? `${count} Balasan` : "Balas"}
        </span>
        {!open && count > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/10 text-primary dark:text-emerald-400 text-[9px] font-black">
            {count}
          </span>
        )}
      </button>

      {/* Expanded Thread */}
      {open && (
        <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-100 dark:border-slate-700/60">
          {/* Existing Replies */}
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
              <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
              Memuat balasan...
            </div>
          ) : replies.length > 0 ? (
            <div className="space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="flex items-start gap-2 animate-in slide-in-from-left-2 duration-200">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-400/10 text-[10px] font-black text-primary dark:text-emerald-400">
                    {(r.sender_name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
                        {r.sender_name || "Anonim"}
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500">
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 dark:text-slate-300 leading-relaxed mt-0.5">
                      {r.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : loaded ? (
            <p className="text-[11px] text-gray-400 py-1">Belum ada balasan. Jadilah yang pertama! 👇</p>
          ) : null}

          {/* Reply Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
            <input
              ref={inputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Balas secara anonim..."
              maxLength={500}
              className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-[11px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={submitting || !replyText.trim()}
              className="flex items-center justify-center h-7 w-7 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-all shrink-0"
            >
              {submitting ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>

          {replyText.length > 400 && (
            <p className="text-[9px] text-gray-400 text-right">{replyText.length}/500</p>
          )}
        </div>
      )}
    </div>
  );
}
