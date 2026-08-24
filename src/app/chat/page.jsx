"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import MarketplaceInbox from "@/components/MarketplaceInbox";
import { playChatSound, playSentSound } from "@/lib/sound";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

function waktuRelatif(iso) {
  if (!iso) return "";
  const detik = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)}m lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)}j lalu`;
  return `${Math.floor(detik / 86400)}h lalu`;
}

const ICEBREAKERS = [
  "Halo! Jurusan apa nih? 👋",
  "Anak kos atau pp dari rumah? 🏠",
  "Lagi di kampus ga hari ini? 🏫",
  "Rekomendasi tempat makan murah dong 🤤",
];

function parseMessageContent(msg) {
  if (!msg) return { isImage: false, text: "" };
  const imgMatch = String(msg).match(/\[img\](.*?)\[\/img\]/);
  if (imgMatch) {
    const imgUrl = imgMatch[1];
    const text = String(msg).replace(imgMatch[0], "").trim();
    return { isImage: true, imgUrl, text };
  }
  return { isImage: false, text: String(msg) };
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomQuery = searchParams.get("room");
  const anonView = searchParams.get("anon") === "1";

  // ── Kotak masuk ──────────────────────────────────────────────────────────
  const [ringkasAnon, setRingkasAnon] = useState(null);
  const [anonLoading, setAnonLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showPastHistory, setShowPastHistory] = useState(false);

  // ── Utas anonim (?anon=1) ────────────────────────────────────────────────
  const [utas, setUtas] = useState(null);
  const [utasLoading, setUtasLoading] = useState(true);

  // ── Obrolan jual beli / DM yang sedang dibuka (?room=<id>) ──────────────
  const [myWa, setMyWa] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null); // 'active' | 'closed'
  const [roomType, setRoomType] = useState("marketplace"); // 'marketplace' | 'direct'
  const [partnerInfo, setPartnerInfo] = useState({ alias: "Anonim", faculty: "Umum" });
  const [messages, setMessages] = useState([]);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(null);

  const messagesEndRef = useRef(null);
  const rtChannelRef = useRef(null);
  const messageCountRef = useRef(0);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // ══ SCROLL & SOUND TRIGGER ══════════════════════════════════════════════
  useEffect(() => {
    const totalMessages = anonView
      ? (utas?.segmen?.find((s) => s.roomId === utas?.aktifRoomId)?.pesan || []).length
      : messages.length;

    if (totalMessages > messageCountRef.current) {
      if (messageCountRef.current > 0) {
        const lastMsg = anonView
          ? (utas?.segmen?.find((s) => s.roomId === utas?.aktifRoomId)?.pesan || []).slice(-1)[0]
          : messages.slice(-1)[0];
        const isMe = lastMsg ? (anonView ? lastMsg.sender_id === utas?.myId : lastMsg.sender_id === myWa) : true;
        if (lastMsg && !isMe && lastMsg.sender_id !== "system") {
          playChatSound();
          hapticLight();
        }
      }
      messageCountRef.current = totalMessages;
      scrollToBottom();
    }
  }, [messages, utas, anonView, myWa]);

  // ══ KOTAK MASUK ════════════════════════════════════════════════════════
  const refreshAnonInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/anon/inbox");
      if (res.status === 401) {
        setRingkasAnon(null);
        return;
      }
      const data = await res.json();
      if (data.ok) setRingkasAnon(data.utas || null);
    } catch {
      setRingkasAnon(null);
    } finally {
      setAnonLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roomQuery || anonView) return;
    refreshAnonInbox();
    const iv = setInterval(refreshAnonInbox, 15000);
    return () => clearInterval(iv);
  }, [roomQuery, anonView, refreshAnonInbox]);

  // ══ UTAS ANONIM ════════════════════════════════════════════════════════
  const muatUtas = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/anon/thread");
      if (res.status === 401) {
        toast.error("Masuk dulu ya untuk membuka obrolan.");
        router.push("/profil");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setUtas(data);
      }
    } catch {
      // silent
    } finally {
      setUtasLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!anonView) return;
    setUtasLoading(true);
    muatUtas();
  }, [anonView, muatUtas]);

  useEffect(() => {
    if (!anonView) return;
    const iv = setInterval(muatUtas, 10000);
    const saatTampil = () => {
      if (document.visibilityState === "visible") muatUtas();
    };
    document.addEventListener("visibilitychange", saatTampil);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", saatTampil);
    };
  }, [anonView, muatUtas]);

  // Room tunggu dipantau agar otomatis terhubung begitu lawan bicara ditemukan
  const menungguRoomId = anonView ? utas?.menungguRoomId : ringkasAnon?.menungguRoomId;
  useEffect(() => {
    if (!menungguRoomId) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", roomId: menungguRoomId }),
        });
        const data = await res.json();
        if (data.status === "not_found") {
          clearInterval(iv);
        } else if (data.isMatched) {
          clearInterval(iv);
          toast.success("🎉 Teman ditemukan!");
          playChatSound();
          hapticSuccess();
        } else {
          return;
        }
        if (anonView) muatUtas();
        else refreshAnonInbox();
      } catch {
        // silent
      }
    }, 3500);
    return () => clearInterval(iv);
  }, [menungguRoomId, anonView, muatUtas, refreshAnonInbox]);

  // ══ ROOM JUAL BELI ═════════════════════════════════════════════════════
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
        if (data.room.type === "random") {
          router.replace("/chat?anon=1");
          return;
        }
        setMyWa(data.myId);
        setRoomStatus(data.room.status);
        setRoomType(data.room.type || "marketplace");
        const akuUser1 = data.room.user1_id === data.myId;
        setPartnerInfo({
          alias: (akuUser1 ? data.room.user2_alias : data.room.user1_alias) || "Anonim",
          faculty: (akuUser1 ? data.room.user2_faculty : data.room.user1_faculty) || "Umum",
          wa: akuUser1 ? data.room.user2_id : data.room.user1_id,
        });
        setMessages(data.messages || []);
      } catch {
        setRoomNotFound(true);
      }
    })();
  }, [roomQuery, router]);

  const fetchRoomData = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/chat/room/${roomId}`);
      const data = await res.json();
      if (res.status === 401) return;
      if (data.room) {
        setRoomStatus(data.room.status);
        setRoomType(data.room.type || "marketplace");
        if (data.myId) {
          setMyWa(data.myId);
          const akuUser1 = data.room.user1_id === data.myId;
          const aliasLawan = akuUser1 ? data.room.user2_alias : data.room.user1_alias;
          if (aliasLawan) {
            setPartnerInfo({
              alias: aliasLawan,
              faculty: (akuUser1 ? data.room.user2_faculty : data.room.user1_faculty) || "Umum",
              wa: akuUser1 ? data.room.user2_id : data.room.user1_id,
            });
          }
        }
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Realtime Broadcast ──
  const kanalRoomId = anonView ? utas?.aktifRoomId : roomStatus === "active" ? roomQuery : null;
  useEffect(() => {
    if (!kanalRoomId) return;
    let channel = null;
    let supa = null;
    try {
      supa = getSupabase();
      channel = supa
        .channel(`chat-room-${kanalRoomId}`)
        .on("broadcast", { event: "pesan" }, () => {
          if (anonView) muatUtas();
          else fetchRoomData(kanalRoomId);
        })
        .on("broadcast", { event: "typing" }, (payload) => {
          const sender = payload.payload?.senderId;
          const currentId = anonView ? utas?.myId : myWa;
          if (sender && sender !== currentId) {
            setPartnerTyping({ alias: payload.payload?.alias || "Lawan bicara" });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setPartnerTyping(null), 3000);
          }
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[chat] Realtime fallback polling 10s.");
          }
        });
      rtChannelRef.current = channel;
    } catch (e) {
      console.warn("[chat] Realtime init error:", e?.message || e);
    }
    return () => {
      rtChannelRef.current = null;
      if (channel && supa) {
        try { supa.removeChannel(channel); } catch {}
      }
    };
  }, [kanalRoomId, anonView, muatUtas, fetchRoomData, myWa, utas?.myId]);

  useEffect(() => {
    if (anonView || !roomQuery || roomStatus !== "active") return;
    const iv = setInterval(() => fetchRoomData(roomQuery), 10000);
    return () => clearInterval(iv);
  }, [anonView, roomQuery, roomStatus, fetchRoomData]);

  // ══ AKSI ═══════════════════════════════════════════════════════════════
  const handleFindPartner = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/chat/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find" }),
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

      if (data.status === "matched") {
        toast.success("🎉 Berhasil terhubung dengan teman!");
        playChatSound();
        hapticSuccess();
      } else if (data.status === "waiting") {
        toast.info("🔍 Belum ada yang online sekarang — kamu masuk antrean.");
      }
      if (anonView) muatUtas();
      else router.push("/chat?anon=1");
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
      toast.info("Pencarian dibatalkan.");
    } catch {}
    if (anonView) muatUtas();
    else refreshAnonInbox();
  };

  const handleInputChange = (val) => {
    setInputMessage(val);
    const now = Date.now();
    if (val.trim() && now - lastTypingSentRef.current > 2000 && rtChannelRef.current) {
      lastTypingSentRef.current = now;
      const currentId = anonView ? utas?.myId : myWa;
      const myAlias = anonView
        ? utas?.segmen?.find((s) => s.roomId === utas.aktifRoomId)?.aliasKu || "Temanmu"
        : "Temanmu";
      try {
        rtChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: { senderId: currentId, alias: myAlias },
        });
      } catch {}
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar/foto yang diperbolehkan.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 10 MB.");
      return;
    }

    setUploadingImg(true);
    const toastId = toast.loading("Mengunggah foto...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah foto");

      toast.dismiss(toastId);
      await handleSendMessage(`[img]${data.url}[/img]`);
      toast.success("Foto berhasil dikirim 📷");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.message || "Gagal mengirim foto");
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (customText) => {
    const text = (customText || inputMessage).trim();
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    const alias = anonView
      ? utas?.segmen?.find((s) => s.roomId === utas.aktifRoomId)?.aliasKu || "Anonim"
      : "Pengguna";
    if (!text || !targetRoom || sending) return;

    setSending(true);
    setInputMessage("");

    try {
      const res = await fetch(`/api/chat/room/${targetRoom}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderAlias: alias, message: text }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Gagal mengirim pesan");
      } else {
        playSentSound();
        hapticLight();
        try {
          rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
        } catch {}
      }
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
      if (anonView) muatUtas();
      else fetchRoomData(targetRoom);
    }
  };

  const handleReportPartner = async () => {
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    if (!targetRoom) return;
    const alasan = prompt("Laporkan lawan bicara — apa alasannya? (mis. kasar, pelecehan, spam, penipuan)");
    if (alasan === null) return;
    try {
      const res = await fetch(`/api/chat/room/${targetRoom}/report`, {
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

  const tutupObrolanAktif = async () => {
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    if (!targetRoom) return;
    await fetch(`/api/chat/room/${targetRoom}`, { method: "DELETE" });
    try {
      rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
    } catch {}
  };

  const handleLeaveChat = async () => {
    await tutupObrolanAktif();
    if (anonView) muatUtas();
    else router.push("/chat");
  };

  const handleExchangeContact = async (targetRoomId) => {
    const rId = targetRoomId || (anonView ? utas?.aktifRoomId : roomQuery);
    if (!rId) return;
    try {
      const res = await fetch(`/api/chat/room/${rId}/exchange-contact`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengajak tukar kontak");
        return;
      }
      if (data.status === "revealed") {
        toast.success("🎉 Saling setuju! Kontak DM Pribadi website terbuka.");
        playSentSound();
        hapticSuccess();
      } else if (data.status === "requested") {
        toast.info("📩 Ajakan terkirim. Menunggu persetujuan lawan bicara...");
      } else if (data.status === "waiting_partner") {
        toast.info("⏳ Kamu sudah mengirim ajakan. Menunggu lawan bicara setuju.");
      }
      if (anonView) muatUtas();
      else fetchRoomData(rId);
    } catch {
      toast.error("Gagal mengirim permintaan tukar kontak");
    }
  };

  const handleSkipChat = async () => {
    handleFindPartner();
  };

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN 1: UTAS ANONIM (?anon=1) — FRESH CANVAS & CLEAN MOBILE/PC
  // ══════════════════════════════════════════════════════════════════════
  if (anonView) {
    const rawSegmen = utas?.segmen || [];
    const aktifRoomId = utas?.aktifRoomId || null;
    const isWaiting = !!utas?.menungguRoomId || searching;

    // Sesi aktif saat ini
    const segAktif = rawSegmen.find((s) => s.roomId === aktifRoomId) || null;
    // Sesi terakhir yang pernah ada (jika tidak ada yang aktif)
    const segTerakhir = rawSegmen.length > 0 ? rawSegmen[rawSegmen.length - 1] : null;
    // Sesi yang akan dirender: prioritas sesi aktif, atau sesi terakhir jika baru saja selesai
    const segmenDitampilkan = segAktif || (segTerakhir?.status === "closed" ? segTerakhir : null);

    const pesanTampil = (segmenDitampilkan?.pesan || []).filter(
      (m) => m.sender_id !== "system" || m.message?.startsWith("system:")
    );
    const realMsgCount = pesanTampil.filter(
      (m) => !m.sender_id.startsWith("system")
    ).length;

    return (
      <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-76px)] md:my-3 max-w-2xl w-full mx-auto bg-white dark:bg-[#000000] md:rounded-[28px] md:shadow-2xl md:border md:border-black/[0.08] dark:md:border-white/[0.08] overflow-hidden font-sans select-none no-tap-highlight">
        {/* ── HEADER APPLE HIG ── */}
        <div className="bg-white/85 dark:bg-[#000000]/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 z-40 pt-[max(env(safe-area-inset-top),0.5rem)] px-3 xs:px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <button
                onClick={() => router.push("/chat")}
                className="p-1.5 -ml-1 text-gray-500 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] rounded-full active:scale-90 transition-transform"
                title="Kembali ke kotak masuk"
              >
                <Icon.ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <div className="w-8 h-8 xs:w-9 xs:h-9 rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/20 text-primary flex items-center justify-center font-bold text-base shadow-xs">
                  🎭
                </div>
                {aktifRoomId && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs xs:text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                    {segmenDitampilkan ? segmenDitampilkan.alias : "Cari Temen"}
                  </p>
                  {segmenDitampilkan && (
                    <span className="text-[9px] font-semibold bg-primary/10 text-primary dark:text-purple-300 px-2 py-0.5 rounded-full shrink-0">
                      {segmenDitampilkan.faculty}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {aktifRoomId
                    ? "🟢 Sedang terhubung"
                    : isWaiting
                      ? "🔍 Sedang mencari partner..."
                      : "Sesi anonim"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {aktifRoomId ? (
              <div className="flex items-center gap-1 xs:gap-1.5 shrink-0">
                <button
                  onClick={() => handleExchangeContact(aktifRoomId)}
                  title="Ajak lanjut mengobrol di DM Pribadi website"
                  className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-full text-[11px] font-bold hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs"
                >
                  <span>💬 DM</span>
                </button>
                <button
                  onClick={handleReportPartner}
                  title="Laporkan lawan bicara"
                  className="p-1.5 rounded-full text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors active:scale-90"
                >
                  🚩
                </button>
                <button
                  onClick={handleSkipChat}
                  title="Ganti Lawan Obrolan"
                  className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1.5 rounded-full text-[11px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] active:scale-95 transition-all shadow-2xs"
                >
                  <span>⏭️ Ganti</span>
                </button>
                <button
                  onClick={handleLeaveChat}
                  title="Akhiri obrolan"
                  className="p-1.5 text-gray-400 hover:text-rose-500 rounded-full transition-colors active:scale-90"
                >
                  <Icon.X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleFindPartner}
                disabled={searching || isWaiting}
                className="flex items-center gap-1 bg-primary text-white px-3.5 py-1.5 rounded-full text-[11px] font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <span>{searching ? "Mencari..." : "🚀 Cari Baru"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── CHAT CANVAS AREA ── */}
        <div className="flex-1 p-4 overflow-y-auto overscroll-contain space-y-3">
          {utasLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-gray-400 font-medium">Menghubungkan ke Cari Temen...</p>
            </div>
          ) : isWaiting && !aktifRoomId ? (
            /* RADAR / WAITING SCREEN */
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 animate-ping absolute" />
                <div className="w-20 h-20 rounded-full bg-primary/15 animate-pulse absolute" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center text-3xl shadow-lg relative z-10">
                  🎭
                </div>
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="text-base font-black text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Sedang Mencari Teman...
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Menghubungkan dengan mahasiswa USU/POLMED yang sedang online. Kamu tetap bisa menunggu di sini atau kami beri notifikasi saat cocok!
                </p>
              </div>
              <button
                onClick={() => handleCancelWaiting(utas?.menungguRoomId)}
                className="px-4 py-2 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-xs font-bold text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] active:scale-95 transition-all"
              >
                Batalkan Pencarian
              </button>
            </div>
          ) : !segmenDitampilkan ? (
            /* EMPTY / WELCOME SCREEN */
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-[24px] bg-gradient-to-tr from-primary/20 via-purple-500/10 to-transparent flex items-center justify-center text-4xl shadow-sm border border-primary/20">
                🎭
              </div>
              <div className="space-y-2 max-w-xs">
                <h2 className="text-lg font-black text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Cari Teman Kampus
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Ngobrol santai 1-on-1 secara anonim & rahasia dengan sesama mahasiswa USU & POLMED.
                </p>
              </div>
              <button
                onClick={handleFindPartner}
                disabled={searching}
                className="w-full max-w-xs py-3.5 rounded-full bg-primary hover:brightness-105 text-white text-xs font-black shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>{searching ? "Mencari Teman..." : "🚀 Mulai Cari Teman"}</span>
              </button>
            </div>
          ) : (
            /* ACTIVE SESSION STREAM (FRESH CANVAS) */
            <div className="space-y-3.5">
              {/* Info Header Banner */}
              <div className="text-center my-3 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] max-w-sm mx-auto">
                <p className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center justify-center gap-1.5">
                  <span>🎭</span> Terhubung dengan {segmenDitampilkan.alias}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Fakultas {segmenDitampilkan.faculty} · Obrolan 100% Anonim & Rahasia
                </p>
              </div>

              {/* Messages list */}
              {segmenDitampilkan.pesan.map((m, idx) => {
                const isMe = m.sender_id === utas?.myId;

                // ── Direct Consent Request Bubble ──
                if (m.sender_id === "system:consent_request") {
                  let reqData = null;
                  try { reqData = JSON.parse(m.message); } catch {}
                  const isReqMe = reqData?.requesterId === utas?.myId;
                  return (
                    <div key={m.id || idx} className="my-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs text-xs animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                            {isReqMe ? "Ajakan Lanjut DM Terkirim" : `${reqData?.requesterAlias || "Temanmu"} Mengajak Lanjut DM`}
                          </p>
                          <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px] leading-relaxed mb-2.5">
                            {isReqMe
                              ? `Menunggu ${segmenDitampilkan.alias} menyetujui ajakan untuk membuka ruang DM Pribadi di website.`
                              : "Jika kamu setuju, ruang DM Pribadi 1-on-1 permanen akan otomatis dibuat di kotak masuk akun kalian berdua."}
                          </p>
                          {!isReqMe && segmenDitampilkan.status === "active" && (
                            <button
                              onClick={() => handleExchangeContact(segmenDitampilkan.roomId)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5"
                            >
                              <span>✓ Setuju & Buka DM Pribadi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Direct Consent Revealed Bubble ──
                if (m.sender_id === "system:consent_revealed") {
                  let revData = null;
                  try { revData = JSON.parse(m.message); } catch {}
                  const isUser1 = revData?.user1_id === utas?.myId;
                  const partnerAlias = isUser1 ? revData?.user2_alias : revData?.user1_alias;
                  const directRoomId = revData?.directRoomId;

                  return (
                    <div key={m.id || idx} className="my-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs text-xs animate-in fade-in duration-200">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">🎉</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-emerald-900 dark:text-emerald-200 text-xs mb-1">
                            Saling Setuju! Ruang DM Pribadi Terbuka
                          </p>
                          <p className="text-emerald-800/90 dark:text-emerald-300/90 text-[11px] leading-relaxed mb-2.5">
                            Kalian berdua telah terhubung di DM Pribadi website bersama <b>{partnerAlias || segmenDitampilkan.alias}</b>.
                          </p>
                          {directRoomId ? (
                            <button
                              onClick={() => router.push(`/chat?room=${directRoomId}`)}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
                            >
                              <span>💬 Masuk ke Ruang DM Pribadi ↗</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Ruang DM berhasil dibuat</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── General System Notice ──
                if (m.sender_id === "system") {
                  return (
                    <div key={m.id || idx} className="text-center my-2">
                      <span className="inline-block bg-black/[0.04] dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full font-medium">
                        {m.message}
                      </span>
                    </div>
                  );
                }

                const parsed = parseMessageContent(m.message);
                return (
                  <div key={m.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[78%] xs:max-w-[85%] text-xs leading-relaxed ${
                        parsed.isImage
                          ? isMe
                            ? "bg-primary text-white p-1 rounded-[20px] rounded-br-[4px] shadow-xs"
                            : "bg-[#E9E9EB] text-[#000000] dark:bg-[#262628] dark:text-[#FFFFFF] p-1 rounded-[20px] rounded-bl-[4px]"
                          : isMe
                            ? "bg-primary text-white px-3.5 py-2 rounded-[20px] rounded-br-[4px] shadow-xs"
                            : "bg-[#E9E9EB] text-[#000000] dark:bg-[#262628] dark:text-[#FFFFFF] px-3.5 py-2 rounded-[20px] rounded-bl-[4px]"
                      }`}
                    >
                      {parsed.isImage ? (
                        <div className="space-y-1">
                          <div
                            onClick={() => setPreviewImage(parsed.imgUrl)}
                            className="relative rounded-[16px] overflow-hidden cursor-pointer group bg-black/5"
                          >
                            <img
                              src={parsed.imgUrl}
                              alt="Foto obrolan"
                              className="w-full max-h-64 object-cover rounded-[16px] transition-transform duration-300 group-hover:scale-102"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                              🔍 Perbesar Foto
                            </div>
                          </div>
                          {parsed.text && <p className="px-2 pt-1 text-xs leading-relaxed">{parsed.text}</p>}
                        </div>
                      ) : (
                        parsed.text
                      )}
                    </div>
                  </div>
                );
              })}

              {/* End of session notice if closed */}
              {segmenDitampilkan.status === "closed" && (
                <div className="my-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-center space-y-3 animate-in fade-in duration-300">
                  <div className="text-2xl">👋</div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Obrolan dengan {segmenDitampilkan.alias} telah berakhir.
                  </p>
                  <button
                    onClick={handleFindPartner}
                    disabled={searching}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:brightness-105 text-white text-xs font-black shadow-md shadow-primary/20 active:scale-95 transition-all"
                  >
                    <span>🚀 Cari Teman Baru</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Typing Indicator */}
          {partnerTyping && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9E9EB] dark:bg-[#262628] text-gray-600 dark:text-gray-300 text-xs w-fit my-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
              </span>
              <span className="text-[11px] font-semibold">{partnerTyping.alias} sedang mengetik...</span>
            </div>
          )}

          {/* Past History Accordion (Clean & Non-Intrusive) */}
          {rawSegmen.length > 1 && !isWaiting && (
            <div className="pt-6 border-t border-black/[0.04] dark:border-white/[0.06] text-center">
              <button
                onClick={() => setShowPastHistory(!showPastHistory)}
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 inline-flex items-center gap-1 transition-colors"
              >
                <span>📜 {showPastHistory ? "Sembunyikan" : "Lihat"} Riwayat Obrolan Lalu ({rawSegmen.length - (aktifRoomId ? 1 : 0)})</span>
                <Icon.ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPastHistory ? "rotate-180" : ""}`} />
              </button>

              {showPastHistory && (
                <div className="mt-3 text-left space-y-2 max-h-60 overflow-y-auto p-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                  {rawSegmen
                    .filter((s) => s.roomId !== aktifRoomId)
                    .map((s) => (
                      <div key={s.roomId} className="p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.04] dark:border-white/[0.06] text-[11px] flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">🎭 {s.alias} · {s.faculty}</p>
                          <p className="text-gray-400 text-[10px]">{s.pesan.length} pesan · {waktuRelatif(s.mulai)}</p>
                        </div>
                        <span className="text-[9px] text-gray-400 font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                          Selesai
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── ICEBREAKERS (When active and new) ── */}
        {aktifRoomId && realMsgCount <= 1 && (
          <div className="px-3 py-2 bg-black/[0.02] dark:bg-white/[0.03] border-t border-black/[0.04] dark:border-white/[0.06] flex gap-1.5 overflow-x-auto touch-pan-x no-tap-highlight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ICEBREAKERS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-[11px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] whitespace-nowrap active:scale-95 transition-all shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* ── BOTTOM INPUT BAR ── */}
        {aktifRoomId ? (
          <div className="p-2.5 xs:p-3 bg-white/85 dark:bg-[#000000]/85 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImg || sending}
              title="Kirim Foto"
              className="w-9 h-9 shrink-0 rounded-full bg-black/[0.05] dark:bg-white/[0.1] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-90 transition-all text-sm disabled:opacity-50"
            >
              {uploadingImg ? "⏳" : "📷"}
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              placeholder="Ketik pesan santai..."
              className="flex-1 bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] rounded-full px-4 py-2 text-base md:text-xs text-[#1d1d1f] dark:text-white placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || sending || uploadingImg}
              className="w-9 h-9 shrink-0 rounded-full bg-primary disabled:opacity-40 text-white flex items-center justify-center active:scale-[0.92] transition-all shadow-[0_2px_8px_rgba(83,43,152,0.3)]"
            >
              <Icon.ArrowUp className="w-4 h-4" />
            </button>
          </div>
        ) : isWaiting ? (
          <div className="p-3 bg-primary/5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-base animate-pulse">🔍</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Menunggu partner…</p>
              <p className="text-[10px] text-slate-500">Kami kabari lewat notifikasi kalau ada yang cocok</p>
            </div>
            <button
              onClick={() => handleCancelWaiting(utas?.menungguRoomId)}
              className="text-[10px] font-bold text-rose-500 px-3 py-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
            >
              Batalkan
            </button>
          </div>
        ) : (
          <div className="p-3 bg-white dark:bg-[#000000] border-t border-black/[0.06] dark:border-white/[0.08] pb-[max(env(safe-area-inset-bottom),0.6rem)]">
            <button
              onClick={handleFindPartner}
              disabled={searching}
              className="w-full py-3 rounded-full bg-primary text-white text-xs font-black shadow-md shadow-primary/25 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <span>{searching ? "Mencari Teman..." : "🚀 Cari Teman Baru"}</span>
            </button>
          </div>
        )}

        {/* LIGHTBOX PREVIEW FOTO */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white rounded-full bg-white/10"
                title="Tutup"
              >
                <Icon.X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Preview Foto"
                className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                >
                  Buka Ukuran Asli ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN 2: ROOM JUAL BELI & DM PRIBADI (?room=<id>)
  // ══════════════════════════════════════════════════════════════════════
  if (roomQuery) {
    if (roomNotFound) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">🔎</div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Obrolan ini tidak ditemukan.</p>
          <button
            onClick={() => router.push("/chat")}
            className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            Kembali ke Kotak Masuk
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-76px)] md:my-3 max-w-2xl w-full mx-auto bg-white dark:bg-[#000000] md:rounded-[28px] md:shadow-2xl md:border md:border-black/[0.08] dark:md:border-white/[0.08] overflow-hidden font-sans select-none no-tap-highlight">
        <div className="bg-white/85 dark:bg-[#000000]/85 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 z-40 pt-[max(env(safe-area-inset-top),0.5rem)] px-3 xs:px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => router.push("/chat")}
                className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] rounded-full active:scale-90 transition-transform"
                title="Kembali ke kotak masuk"
              >
                <Icon.ChevronLeft className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  roomType === "direct"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
                }`}>
                  {roomType === "direct" ? "💬" : "👤"}
                </div>
                {roomStatus === "active" && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs xs:text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{partnerInfo.alias}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {roomType === "direct" ? `💬 DM Pribadi · ${partnerInfo.faculty}` : partnerInfo.faculty}
                </p>
              </div>
            </div>

            {roomType === "marketplace" && partnerInfo.wa && (
              <a
                href={`https://wa.me/${String(partnerInfo.wa).replace(/^0/, "62")}?text=${encodeURIComponent("Halo Kak, saya dari obrolan Jual Beli USU 👋")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-100 shadow-2xs active:scale-95 transition-all shrink-0"
                title="Lanjut ngobrol di WhatsApp Pribadi"
              >
                <span>🟢 Lanjut WA</span>
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto overscroll-contain space-y-2.5">
          {messages.map((m, idx) => {
            const isMe = m.sender_id === myWa;
            const isSystem = m.sender_id === "system";
            if (isSystem) {
              return (
                <div key={m.id || idx} className="text-center my-2">
                  <span className="inline-block bg-black/[0.04] dark:bg-white/[0.08] text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full font-medium">
                    {m.message}
                  </span>
                </div>
              );
            }
            const parsed = parseMessageContent(m.message);
            return (
              <div key={m.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[78%] xs:max-w-[85%] text-xs leading-relaxed ${
                    parsed.isImage
                      ? isMe
                        ? "bg-primary text-white p-1 rounded-[20px] rounded-br-[4px] shadow-xs"
                        : "bg-[#E9E9EB] text-[#000000] dark:bg-[#262628] dark:text-[#FFFFFF] p-1 rounded-[20px] rounded-bl-[4px]"
                      : isMe
                        ? "bg-primary text-white px-3.5 py-2 rounded-[20px] rounded-br-[4px] shadow-xs"
                        : "bg-[#E9E9EB] text-[#000000] dark:bg-[#262628] dark:text-[#FFFFFF] px-3.5 py-2 rounded-[20px] rounded-bl-[4px]"
                  }`}
                >
                  {parsed.isImage ? (
                    <div className="space-y-1">
                      <div
                        onClick={() => setPreviewImage(parsed.imgUrl)}
                        className="relative rounded-[16px] overflow-hidden cursor-pointer group bg-black/5"
                      >
                        <img
                          src={parsed.imgUrl}
                          alt="Foto obrolan"
                          className="w-full max-h-64 object-cover rounded-[16px] transition-transform duration-300 group-hover:scale-102"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                          🔍 Perbesar Foto
                        </div>
                      </div>
                      {parsed.text && <p className="px-2 pt-1 text-xs leading-relaxed">{parsed.text}</p>}
                    </div>
                  ) : (
                    parsed.text
                  )}
                </div>
              </div>
            );
          })}
          {partnerTyping && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9E9EB] dark:bg-[#262628] text-gray-600 dark:text-gray-300 text-xs w-fit my-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
              </span>
              <span className="text-[11px] font-semibold">{partnerTyping.alias} sedang mengetik...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {roomStatus === "closed" && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 text-center space-y-2 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              👋 Obrolan ini telah berakhir.
            </p>
            <button
              onClick={() => router.push("/chat")}
              className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95"
            >
              Kembali ke Kotak Masuk
            </button>
          </div>
        )}

        {roomStatus === "active" && (
          <div className="p-2.5 xs:p-3 bg-white/85 dark:bg-[#000000]/85 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImg || sending}
              title="Kirim Foto"
              className="w-9 h-9 shrink-0 rounded-full bg-black/[0.05] dark:bg-white/[0.1] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-90 transition-all text-sm disabled:opacity-50"
            >
              {uploadingImg ? "⏳" : "📷"}
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              placeholder={roomType === "direct" ? `Ketik pesan ke ${partnerInfo.alias}...` : "Ketik pesan..."}
              className="flex-1 bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] rounded-full px-4 py-2 text-base md:text-xs text-[#1d1d1f] dark:text-white placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || sending || uploadingImg}
              className="w-9 h-9 shrink-0 rounded-full bg-primary disabled:opacity-40 text-white flex items-center justify-center active:scale-[0.92] transition-all shadow-[0_2px_8px_rgba(83,43,152,0.3)]"
            >
              <Icon.ArrowUp className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LIGHTBOX PREVIEW FOTO */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white rounded-full bg-white/10"
                title="Tutup"
              >
                <Icon.X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Preview Foto"
                className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                >
                  Buka Ukuran Asli ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN 3: KOTAK MASUK (/chat)
  // ══════════════════════════════════════════════════════════════════════
  const anon = ringkasAnon;
  const cuplikan = anon?.pesanTerakhir
    ? `${anon.pesanTerakhir.milikku ? "Kamu: " : ""}${anon.pesanTerakhir.teks}`
    : anon?.menunggu
      ? "Sedang mencari teman… kamu dikabari begitu ada yang cocok"
      : anon?.ada
        ? "Belum ada pesan"
        : "Ngobrol 1-on-1 dengan mahasiswa USU & POLMED — ketuk buat mulai";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] pb-28 font-sans">
      <div className="bg-white/80 dark:bg-[#000000]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] sticky top-0 z-40">
        <div className="px-4 py-3 max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
              OBROLAN KAMPUS
            </span>
            <h1 className="text-xl font-black text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight mt-0.5">Pusat Obrolan</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-4 space-y-6">
        {/* ── OBROLAN ANONIM — SATU KARTU UTAMA ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-1.5">
              🎭 Cari Temen
            </h2>
            <button
              onClick={handleFindPartner}
              disabled={searching}
              className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-[0_2px_8px_rgba(83,43,152,0.25)] hover:brightness-105 active:scale-[0.96] transition-all disabled:opacity-60"
            >
              <span>{searching ? "Mencari..." : "🚀 Cari Teman Baru"}</span>
            </button>
          </div>

          {anonLoading ? (
            <div className="text-center p-6 text-xs text-gray-500">Memuat...</div>
          ) : (
            <div className="bg-white dark:bg-[#1c1c1e] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              <button
                onClick={() => router.push("/chat?anon=1")}
                className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/20 text-primary flex items-center justify-center text-xl shadow-xs">
                  🎭
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">Cari Temen</span>
                    {anon?.partnerAktif ? (
                      <span className="text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                        {anon.partnerAktif}
                      </span>
                    ) : anon?.menunggu ? (
                      <span className="text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                        Mencari…
                      </span>
                    ) : anon?.ada ? (
                      <span className="text-[9px] font-medium bg-black/[0.05] dark:bg-white/[0.08] text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                        Tidak aktif
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{cuplikan}</p>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-[10px] shrink-0">{waktuRelatif(anon?.updatedAt)}</span>
                  <Icon.ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ── CHAT JUAL BELI & DM PRIBADI ── */}
        <div>
          <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">💬 Chat Jual Beli & DM Pribadi</h2>
          <MarketplaceInbox onSelectRoom={(roomId) => router.push(`/chat?room=${roomId}`)} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Memuat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
