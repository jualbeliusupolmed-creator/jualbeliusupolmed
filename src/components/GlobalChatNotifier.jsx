"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { playChatSound, playSentSound } from "@/lib/sound";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { Icon } from "@/components/Icons";
import { useSesi } from "@/components/SesiProvider";

function QuickReplyToast({ senderName, messageText, roomId, toastId, router }) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  async function handleSendReply(e) {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || sending || sentSuccess) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/room/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengirim balasan");
      }

      playSentSound();
      hapticLight();
      setSentSuccess(true);
      setReplyText("");

      setTimeout(() => {
        toast.dismiss(toastId);
      }, 1500);
    } catch (err) {
      toast.error(err.message || "Gagal mengirim pesan");
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 animate-in fade-in slide-in-from-top-3 duration-200 font-sans">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            💬
          </div>
          <div className="min-w-0">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                router.push(`/chat?room=${roomId}`);
              }}
              className="text-xs font-black text-slate-900 dark:text-white hover:text-primary dark:hover:text-emerald-400 truncate text-left block"
              title="Buka obrolan penuh"
            >
              {senderName} <span className="text-[10px] text-slate-400 font-normal">↗</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => toast.dismiss(toastId)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
          title="Tutup"
        >
          <Icon.X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MESSAGE PREVIEW */}
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl mb-2.5 border border-slate-100 dark:border-slate-800">
        "{messageText}"
      </p>

      {/* INLINE REPLY FORM */}
      {sentSuccess ? (
        <div className="flex items-center justify-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 animate-in fade-in">
          <span>✓</span>
          <span>Balasan terkirim!</span>
        </div>
      ) : (
        <form onSubmit={handleSendReply} className="flex items-center gap-1.5">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Balas ke ${senderName}...`}
            disabled={sending}
            autoFocus
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary/95 active:scale-95 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1"
          >
            {sending ? (
              <span className="animate-spin text-[10px]">⏳</span>
            ) : (
              <span>Kirim</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function GlobalChatNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const roomTimestampsRef = useRef(new Map());
  const initialLoadRef = useRef(true);
  // Dulu gerbangnya membaca localStorage langsung, jadi pemilik kuki yang
  // cerminnya kosong tidak pernah menerima notifikasi pesan masuk sampai ia
  // masuk ulang — diam-diam, tanpa satu pun pesan galat.
  const { wa: sesiWa, siap: sesiSiap } = useSesi();

  useEffect(() => {
    // Jika sedang di halaman /chat, biarkan halaman chat yang mengurus realtime secara mandiri
    if (pathname === "/chat" || pathname?.startsWith("/admin")) return;

    let timer = null;

    async function checkNewMessages() {
      // Inbox bersifat privat; jangan polling untuk pengunjung anonim.
      if (!sesiSiap || !sesiWa) return;
      try {
        const res = await fetch("/api/chat/marketplace/inbox");
        if (res.status === 401 || !res.ok) return;
        const data = await res.json();
        if (!data.ok || !data.rooms) return;

        const myWa = data.myWa;
        const rooms = data.rooms || [];

        for (const room of rooms) {
          if (!room.id) continue;
          const isUser1 = room.user1_id === myWa;
          const partnerAlias = isUser1 ? room.user2_alias : room.user1_alias;
          const lastTs = roomTimestampsRef.current.get(room.id);
          const currentTs = new Date(room.updated_at || room.created_at || 0).getTime();

          if (initialLoadRef.current) {
            roomTimestampsRef.current.set(room.id, currentTs);
          } else if (lastTs && currentTs > lastTs) {
            roomTimestampsRef.current.set(room.id, currentTs);

            // Fetch latest message from this updated room
            const resRoom = await fetch(`/api/chat/room/${room.id}`);
            if (!resRoom.ok) continue;
            const roomData = await resRoom.json();
            const msgs = roomData.messages || [];
            if (!msgs.length) continue;

            const latestMsg = msgs[msgs.length - 1];
            if (latestMsg.sender_id !== myWa && latestMsg.sender_id !== "system") {
              playChatSound();
              hapticSuccess();

              const senderName = partnerAlias || latestMsg.sender_alias || "Teman Chat";
              const cleanText = latestMsg.message?.slice(0, 90) + (latestMsg.message?.length > 90 ? "..." : "");

              toast.custom((t) => (
                <QuickReplyToast
                  senderName={senderName}
                  messageText={cleanText}
                  roomId={room.id}
                  toastId={t}
                  router={router}
                />
              ), { duration: 10000 });
            }
          }
        }

        initialLoadRef.current = false;
      } catch (_) {
        // silent
      }
    }

    // Check after 3s, then poll every 15s
    const timeout = setTimeout(() => {
      checkNewMessages();
      timer = setInterval(checkNewMessages, 15000);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      if (timer) clearInterval(timer);
    };
  }, [pathname, router, sesiSiap, sesiWa]);

  return null;
}
