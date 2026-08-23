"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { FACULTIES } from "@/lib/profanity";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import MarketplaceInbox from "@/components/MarketplaceInbox";

function waktuRelatif(iso) {
  if (!iso) return "";
  const detik = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

const ICEBREAKERS = [
  "Halo! Jurusan apa nih? 👋",
  "Anak kos atau pp dari rumah?",
  "Lagi di kampus ga hari ini?",
  "Rekomendasi tempat makan murah dong 🤤",
];

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomQuery = searchParams.get("room");

  // ── Kotak masuk (dilihat saat tidak ada ?room=) ─────────────────────────
  const [anonRooms, setAnonRooms] = useState([]);
  const [anonLoading, setAnonLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [userAlias, setUserAlias] = useState("Anonim");
  const [userFaculty, setUserFaculty] = useState("Umum");
  const [searching, setSearching] = useState(false);

  // ── Obrolan yang sedang dibuka (?room=<id>) ─────────────────────────────
  const [myWa, setMyWa] = useState(null);
  const [roomType, setRoomType] = useState(null); // 'random' | 'marketplace'
  const [roomStatus, setRoomStatus] = useState(null); // 'waiting' | 'active' | 'closed'
  const [partnerInfo, setPartnerInfo] = useState({ alias: "Anonim", faculty: "Umum" });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const messagesEndRef = useRef(null);
  const rtChannelRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Kotak masuk: daftar obrolan anonim milikku ──────────────────────────
  const refreshAnonInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/anon/inbox");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.ok) setAnonRooms(data.rooms || []);
    } catch {
      // silent — kotak masuk tetap menampilkan data lama
    } finally {
      setAnonLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roomQuery) return; // sedang di dalam obrolan, bukan di kotak masuk
    refreshAnonInbox();
    const iv = setInterval(refreshAnonInbox, 15000);
    return () => clearInterval(iv);
  }, [roomQuery, refreshAnonInbox]);

  // Room tunggu milikku dipantau lebih sering supaya begitu ada yang cocok,
  // langsung terbuka tanpa perlu menunggu push atau refresh manual — push
  // notification tetap jalan untuk saat tab ini sudah ditutup.
  useEffect(() => {
    if (roomQuery) return;
    const menunggu = anonRooms.find((r) => r.menunggu);
    if (!menunggu) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", roomId: menunggu.id }),
        });
        const data = await res.json();
        if (data.status === "not_found") {
          clearInterval(iv);
          refreshAnonInbox();
          return;
        }
        if (data.isMatched && data.room) {
          clearInterval(iv);
          toast.success("🎉 Teman ditemukan!");
          router.push(`/chat?room=${data.room.id}`);
        }
      } catch {
        // silent
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [roomQuery, anonRooms, router, refreshAnonInbox]);

  // ── Membuka satu room lewat ?room=<id> ──────────────────────────────────
  // Server (bukan localStorage) jadi sumber kebenaran: setiap kali link ini
  // dibuka — refresh, tautan dari push notification, tab baru — datanya
  // ditanyakan langsung ke API. Jadi "sesi hilang saat refresh" tidak bisa
  // terjadi lagi, dan tautan yang sama bisa dibuka dari perangkat mana pun.
  useEffect(() => {
    if (!roomQuery) {
      setRoomNotFound(false);
      return;
    }
    setRoomNotFound(false);
    (async () => {
      try {
        const res = await fetch(`/api/chat/room/${roomQuery}`);
        const data = await res.json();
        if (res.status === 401) {
          toast.error("Masuk dulu ya untuk membuka obrolan ini.");
          router.push("/profil");
          return;
        }
        if (!res.ok || !data.room) {
          setRoomNotFound(true);
          return;
        }
        setMyWa(data.myId);
        setRoomType(data.room.type);
        setRoomStatus(data.room.status);
        const akuUser1 = data.room.user1_id === data.myId;
        setPartnerInfo({
          alias: (akuUser1 ? data.room.user2_alias : data.room.user1_alias) || "Anonim",
          faculty: (akuUser1 ? data.room.user2_faculty : data.room.user1_faculty) || "Umum",
        });
        setMessages(data.messages || []);
      } catch {
        setRoomNotFound(true);
      }
    })();
  }, [roomQuery, router]);

  // Polling isi room — jaring pengaman kalau broadcast realtime terlewat.
  const fetchRoomData = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/chat/room/${roomId}`);
      const data = await res.json();
      if (res.status === 401) return;
      if (data.room) {
        setRoomStatus(data.room.status);
        if (data.myId) {
          setMyWa(data.myId);
          const akuUser1 = data.room.user1_id === data.myId;
          const aliasLawan = akuUser1 ? data.room.user2_alias : data.room.user1_alias;
          if (aliasLawan) {
            setPartnerInfo({
              alias: aliasLawan,
              faculty: (akuUser1 ? data.room.user2_faculty : data.room.user1_faculty) || "Umum",
            });
          }
        }
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Pesan masuk: Supabase Realtime Broadcast, polling tinggal jaring pengaman ──
  // postgres_changes butuh kebijakan RLS SELECT untuk anon — dan kebijakan itu
  // dicabut karena membuat seluruh isi chat bisa dibaca siapa pun. Broadcast
  // tidak menyentuh tabel; isinya cuma "ada pesan baru", data aslinya tetap
  // lewat API yang memeriksa keanggotaan room.
  useEffect(() => {
    if (!roomQuery || roomStatus !== "active") return;
    let channel = null;
    let supa = null;
    try {
      supa = getSupabase();
      channel = supa
        .channel(`chat-room-${roomQuery}`)
        .on("broadcast", { event: "pesan" }, () => fetchRoomData(roomQuery))
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[chat] Realtime tidak tersambung (" + status + ") — mengandalkan polling 10 detik.");
          }
        });
      rtChannelRef.current = channel;
    } catch (e) {
      console.warn("[chat] Kanal realtime tidak dibuat:", e?.message || e);
    }
    return () => {
      rtChannelRef.current = null;
      if (channel && supa) {
        try { supa.removeChannel(channel); } catch {}
      }
    };
  }, [roomQuery, roomStatus, fetchRoomData]);

  useEffect(() => {
    if (!roomQuery || roomStatus !== "active") return;
    const iv = setInterval(() => fetchRoomData(roomQuery), 10000);
    return () => clearInterval(iv);
  }, [roomQuery, roomStatus, fetchRoomData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && roomQuery && roomStatus === "active") {
        fetchRoomData(roomQuery);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [roomQuery, roomStatus, fetchRoomData]);

  // ── Cari teman baru ──────────────────────────────────────────────────────
  const handleFindPartner = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/chat/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find", alias: userAlias, faculty: userFaculty }),
      });
      const data = await res.json();

      if (res.status === 401) {
        toast.error("Masuk dulu ya untuk mulai mengobrol.");
        window.location.href = "/profil";
        return;
      }
      if (res.status === 403 || res.status === 429) {
        toast.error(data.error || "Belum bisa memulai obrolan sekarang.");
        return;
      }

      setShowSearchModal(false);
      if (data.status === "matched" && data.room) {
        toast.success("🎉 Berhasil terhubung dengan teman!");
        router.push(`/chat?room=${data.room.id}`);
      } else if (data.status === "waiting") {
        toast.info("🔍 Belum ada yang online sekarang — kamu masuk antrean. Kami kabari lewat notifikasi kalau ada yang cocok.");
        refreshAnonInbox();
      }
    } catch {
      toast.error("Gagal memulai pencarian teman.");
    } finally {
      setSearching(false);
    }
  };

  const handleCancelWaiting = async (waitingRoomId) => {
    try {
      await fetch("/api/chat/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", roomId: waitingRoomId }),
      });
    } catch {}
    refreshAnonInbox();
  };

  // ── Kirim pesan ───────────────────────────────────────────────────────────
  const handleSendMessage = async (customText) => {
    const text = (customText || inputMessage).trim();
    if (!text || !roomQuery || sending) return;

    setSending(true);
    setInputMessage("");

    const tempMsg = {
      id: "temp_" + Date.now(),
      sender_id: myWa,
      sender_alias: userAlias,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/chat/room/${roomQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderAlias: userAlias, message: text }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Gagal mengirim pesan");
      } else {
        try {
          rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
        } catch {}
      }
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
      fetchRoomData(roomQuery);
    }
  };

  // Laporkan lawan bicara — pola bot chat anonim Telegram: laporan dari tiga
  // room berbeda memblokir pelakunya otomatis dari obrolan selama seminggu.
  const handleReportPartner = async () => {
    if (!roomQuery) return;
    const alasan = prompt("Laporkan lawan bicara — apa alasannya? (mis. kasar, pelecehan, penipuan, spam)");
    if (alasan === null) return;
    try {
      const res = await fetch(`/api/chat/room/${roomQuery}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: alasan }),
      });
      const data = await res.json();
      if (data.success) toast.success(data.pesan || "Laporan diterima.");
      else toast.error(data.error || "Gagal mengirim laporan");
    } catch {
      toast.error("Gagal mengirim laporan");
    }
  };

  const handleLeaveChat = async () => {
    if (roomQuery) {
      await fetch(`/api/chat/room/${roomQuery}`, { method: "DELETE" });
      try {
        rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
      } catch {}
    }
    router.push("/chat");
  };

  const handleSkipChat = async () => {
    if (roomQuery) {
      await fetch(`/api/chat/room/${roomQuery}`, { method: "DELETE" });
      try {
        rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
      } catch {}
    }
    router.push("/chat");
    handleFindPartner();
  };

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN: ROOM VIEW (?room=<id> ada)
  // ══════════════════════════════════════════════════════════════════════
  if (roomQuery) {
    if (roomNotFound) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">🔎</div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Obrolan ini tidak ditemukan.</p>
          <button
            onClick={() => router.push("/chat")}
            className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold"
          >
            Kembali ke Kotak Masuk
          </button>
        </div>
      );
    }

    // Room masih menunggu partner (bisa terjadi kalau membuka tautan lamamu
    // sendiri sebelum ada yang cocok).
    if (roomStatus === "waiting") {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-2xl">🔍</div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Masih menunggu partner...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Kamu ada di antrean. Nanti kami kabari lewat notifikasi begitu ada yang cocok.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCancelWaiting(roomQuery).then(() => router.push("/chat"))}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Batalkan
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold"
            >
              Kembali ke Kotak Masuk
            </button>
          </div>
        </div>
      );
    }

    const isRandom = roomType === "random";

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => router.push("/chat")}
                className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full"
                title="Kembali ke kotak masuk"
              >
                <Icon.ChevronLeft className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">👤</div>
                {roomStatus === "active" && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{partnerInfo.alias}</p>
                <p className="text-[10px] text-slate-500">{partnerInfo.faculty}</p>
              </div>
            </div>

            {isRandom && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleReportPartner}
                  title="Laporkan lawan bicara"
                  className="px-2 py-1 rounded-full text-xs text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  🚩
                </button>
                {roomStatus === "active" && (
                  <button
                    onClick={handleSkipChat}
                    title="Ganti Lawan Obrolan"
                    className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                  >
                    <span>⏭️ Ganti</span>
                  </button>
                )}
                <button
                  onClick={handleLeaveChat}
                  title="Keluar"
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                >
                  <Icon.X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-4">
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[400px] max-h-[62vh]">
              {messages.map((m, idx) => {
                const isMe = m.sender_id === myWa;
                const isSystem = m.sender_id === "system";
                if (isSystem) {
                  return (
                    <div key={m.id || idx} className="text-center my-2">
                      <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-3 py-1 rounded-full font-medium">
                        {m.message}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={m.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-primary text-white rounded-br-none shadow-sm shadow-primary/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {roomStatus === "closed" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 text-center space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  👋 Temanmu telah keluar dari obrolan.
                </p>
                <button
                  onClick={() => router.push("/chat")}
                  className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95"
                >
                  Kembali ke Kotak Masuk
                </button>
              </div>
            )}

            {isRandom && roomStatus === "active" && messages.length <= 2 && (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ICEBREAKERS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap hover:bg-slate-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {roomStatus === "active" && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                  placeholder="Ketik pesan santai..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || sending}
                  className="w-8 h-8 rounded-full bg-primary disabled:opacity-40 text-white flex items-center justify-center transition-opacity"
                >
                  <Icon.ArrowUp className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN: KOTAK MASUK (tidak ada ?room=)
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="px-4 py-3 max-w-2xl mx-auto">
          <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
            OBROLAN KAMPUS
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">Pusat Obrolan</h1>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-4 space-y-6">
        {/* ── OBROLAN ANONIM — disematkan paling atas ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              🎭 Obrolan Anonim
            </h2>
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all"
            >
              <span>🚀 Cari Teman Baru</span>
            </button>
          </div>

          {anonLoading ? (
            <div className="text-center p-6 text-xs text-gray-500">Memuat...</div>
          ) : anonRooms.length === 0 ? (
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 hover:border-primary/50 transition-colors"
            >
              Belum ada obrolan anonim. Ngobrol 1-on-1 dengan sesama mahasiswa USU & POLMED secara acak, tanpa perlu tahu identitas asli. ✍️
            </button>
          ) : (
            <div className="space-y-2">
              {anonRooms.map((r) => {
                if (r.menunggu) {
                  return (
                    <div
                      key={r.id}
                      className="w-full bg-white dark:bg-slate-900 border border-dashed border-primary/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm"
                    >
                      <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-lg animate-pulse">🔍</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Menunggu partner...</p>
                        <p className="text-[10px] text-slate-500">Kami kabari lewat notifikasi kalau ada yang cocok</p>
                      </div>
                      <button
                        onClick={() => handleCancelWaiting(r.id)}
                        className="text-[10px] font-bold text-rose-500 px-2 py-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                      >
                        Batalkan
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/chat?room=${r.id}`)}
                    className="w-full text-left bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-2xl flex items-center gap-3 hover:border-primary/50 transition-colors shadow-sm"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">👤</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{r.partnerAlias}</span>
                        {r.status === "closed" && (
                          <span className="text-[9px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">Berakhir</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {r.pesanTerakhir ? `${r.pesanTerakhir.milikku ? "Kamu: " : ""}${r.pesanTerakhir.teks}` : "Belum ada pesan"}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{waktuRelatif(r.updatedAt)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CHAT JUAL BELI ── */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">💬 Chat Jual Beli</h2>
          <MarketplaceInbox onSelectRoom={(roomId) => router.push(`/chat?room=${roomId}`)} />
        </div>
      </div>

      {/* ── MODAL: Cari Teman Baru ── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Cari Teman Ngobrol</h3>
              <button onClick={() => setShowSearchModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <Icon.X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ngobrol 1-on-1 dengan sesama mahasiswa USU & POLMED secara acak tanpa perlu tahu identitas asli.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Fakultas / Kampus Kamu</label>
              <select
                value={userFaculty}
                onChange={(e) => setUserFaculty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              >
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Nama Panggilanmu (Boleh Samaran)</label>
              <input
                type="text"
                value={userAlias}
                onChange={(e) => setUserAlias(e.target.value)}
                placeholder="Anonim / Si Manis / Budi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleFindPartner}
              disabled={searching}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {searching ? "Mencari..." : "🚀 Mulai Cari Teman"}
            </button>

            <p className="text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              Dengan memulai, kamu setuju: sopan, tanpa SARA/pelecehan, dan jangan bagikan data pribadi.
              Ada tombol 🚩 untuk melaporkan lawan bicara — yang dilaporkan banyak orang diblokir otomatis.
              Namamu tidak pernah ditampilkan, tapi obrolan terikat ke akunmu supaya pelanggaran bisa ditindak.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
