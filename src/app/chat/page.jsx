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

// Garis pemisah antar-partner di dalam utas anonim. Ini yang menggantikan
// "satu baris kotak masuk per pertemuan": ganti orang tidak lagi melahirkan
// obrolan baru di daftar, cuma sekat baru di utas yang sama.
function Pemisah({ anak, nada = "netral" }) {
  const warna =
    nada === "putus"
      ? "text-slate-400 dark:text-slate-500"
      : "text-primary dark:text-emerald-400";
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <span className={`text-[10px] font-bold uppercase tracking-wide ${warna} shrink-0`}>{anak}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomQuery = searchParams.get("room");
  const anonView = searchParams.get("anon") === "1";

  // ── Kotak masuk ──────────────────────────────────────────────────────────
  const [ringkasAnon, setRingkasAnon] = useState(null);
  const [anonLoading, setAnonLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [userAlias, setUserAlias] = useState("Anonim");
  const [userFaculty, setUserFaculty] = useState("Umum");
  const [searching, setSearching] = useState(false);

  // ── Utas anonim (?anon=1) ────────────────────────────────────────────────
  const [utas, setUtas] = useState(null);
  const [utasLoading, setUtasLoading] = useState(true);

  // ── Obrolan jual beli yang sedang dibuka (?room=<id>) ────────────────────
  const [myWa, setMyWa] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null); // 'active' | 'closed'
  const [partnerInfo, setPartnerInfo] = useState({ alias: "Anonim", faculty: "Umum" });
  const [messages, setMessages] = useState([]);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const rtChannelRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, utas]);

  // ══ KOTAK MASUK ════════════════════════════════════════════════════════
  const refreshAnonInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/anon/inbox");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.ok) setRingkasAnon(data.utas || null);
    } catch {
      // silent — kotak masuk tetap menampilkan data lama
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
      if (data.ok) setUtas(data);
    } catch {
      // silent — polling berikutnya mencoba lagi
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

  // Room tunggu dipantau lebih sering supaya begitu ada yang cocok, utasnya
  // langsung menyambung tanpa menunggu push atau refresh manual.
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
        } else {
          return;
        }
        if (anonView) muatUtas();
        else refreshAnonInbox();
      } catch {
        // silent
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [menungguRoomId, anonView, muatUtas, refreshAnonInbox]);

  // ══ ROOM JUAL BELI ═════════════════════════════════════════════════════
  // Server (bukan localStorage) jadi sumber kebenaran: setiap kali link ini
  // dibuka — refresh, tautan dari notifikasi, tab baru — datanya ditanyakan
  // langsung ke API.
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
        // Tautan lama ke satu room anonim (mis. dari push notification yang
        // sudah terkirim) tetap sah — cuma tempatnya sekarang di dalam utas.
        if (data.room.type === "random") {
          router.replace("/chat?anon=1");
          return;
        }
        setMyWa(data.myId);
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
  }, [kanalRoomId, anonView, muatUtas, fetchRoomData]);

  useEffect(() => {
    if (anonView || !roomQuery || roomStatus !== "active") return;
    const iv = setInterval(() => fetchRoomData(roomQuery), 10000);
    return () => clearInterval(iv);
  }, [anonView, roomQuery, roomStatus, fetchRoomData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !anonView && roomQuery && roomStatus === "active") {
        fetchRoomData(roomQuery);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [anonView, roomQuery, roomStatus, fetchRoomData]);

  // ══ AKSI ═══════════════════════════════════════════════════════════════
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
      if (data.status === "matched") {
        toast.success("🎉 Berhasil terhubung dengan teman!");
      } else if (data.status === "waiting") {
        toast.info("🔍 Belum ada yang online sekarang — kamu masuk antrean. Kami kabari lewat notifikasi kalau ada yang cocok.");
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
    } catch {}
    if (anonView) muatUtas();
    else refreshAnonInbox();
  };

  const handleSendMessage = async (customText) => {
    const text = (customText || inputMessage).trim();
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    const alias = anonView
      ? utas?.segmen?.find((s) => s.roomId === utas.aktifRoomId)?.aliasKu || userAlias
      : userAlias;
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

  // Laporkan lawan bicara — pola bot chat anonim Telegram: laporan dari tiga
  // room berbeda memblokir pelakunya otomatis dari obrolan selama seminggu.
  const handleReportPartner = async () => {
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    if (!targetRoom) return;
    const alasan = prompt("Laporkan lawan bicara — apa alasannya? (mis. kasar, pelecehan, penipuan, spam)");
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

  const handleSkipChat = async () => {
    // Tidak perlu menutup manual: action "find" menutup obrolan aktif mana pun
    // milik kita sebelum mencari yang baru (satu partner pada satu waktu).
    handleFindPartner();
  };

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN: UTAS ANONIM (?anon=1)
  // ══════════════════════════════════════════════════════════════════════
  if (anonView) {
    const segmen = utas?.segmen || [];
    const aktifRoomId = utas?.aktifRoomId || null;
    const segAktif = segmen.find((s) => s.roomId === aktifRoomId) || null;
    const pesanAktif = (segAktif?.pesan || []).filter((m) => m.sender_id !== "system");

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
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">🎭</div>
                {aktifRoomId && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Cari Temen</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {segAktif
                    ? `Sedang bicara dengan ${segAktif.alias} · ${segAktif.faculty}`
                    : utas?.menungguRoomId
                      ? "Menunggu partner…"
                      : "Belum ada obrolan berjalan — ketuk Cari Teman Baru"}
                </p>
              </div>
            </div>

            {aktifRoomId && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleReportPartner}
                  title="Laporkan lawan bicara"
                  className="px-2 py-1 rounded-full text-xs text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  🚩
                </button>
                <button
                  onClick={handleSkipChat}
                  title="Ganti Lawan Obrolan"
                  className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                >
                  <span>⏭️ Ganti</span>
                </button>
                <button
                  onClick={handleLeaveChat}
                  title="Akhiri obrolan"
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
            <div className="flex-1 p-4 overflow-y-auto min-h-[400px] max-h-[62vh]">
              {utasLoading ? (
                <p className="text-center text-xs text-slate-400 py-10">Memuat obrolan…</p>
              ) : segmen.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="text-4xl">🎭</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Belum pernah ada obrolan di sini. Ketuk <b>Cari Teman Baru</b> di bawah — kalau belum ada yang
                    online, pencariannya tetap jalan di latar belakang dan kamu dikabari begitu ada yang cocok.
                    Semua obrolanmu tersimpan di satu tempat ini, dipisah garis tiap ganti orang.
                  </p>
                </div>
              ) : (
                segmen.map((seg) => (
                  <div key={seg.roomId}>
                    <Pemisah anak={`Terhubung dengan ${seg.alias} · ${seg.faculty}`} />
                    <div className="space-y-3">
                      {seg.pesan.map((m, idx) => {
                        const isMe = m.sender_id === utas.myId;
                        if (m.sender_id === "system") {
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
                    </div>
                    {seg.status === "closed" && <Pemisah anak="Obrolan berakhir" nada="putus" />}
                    {/* Sisa data lama: sebelum "satu partner aktif pada satu
                        waktu" berlaku (23 Agu 2026), satu orang bisa punya
                        beberapa obrolan hidup sekaligus. Yang bukan obrolan
                        terkini tidak punya kotak ketik — jadi jangan biarkan ia
                        terlihat seperti obrolan yang bisa dibalas. */}
                    {seg.status === "active" && seg.roomId !== aktifRoomId && (
                      <div className="my-2 flex items-center justify-center gap-2">
                        <span className="text-[10px] text-slate-400">Obrolan lama yang belum ditutup</span>
                        <button
                          onClick={async () => {
                            await fetch(`/api/chat/room/${seg.roomId}`, { method: "DELETE" });
                            muatUtas();
                          }}
                          className="text-[10px] font-bold text-rose-500 px-2 py-0.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Tutup
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {aktifRoomId && pesanAktif.length <= 1 && (
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

            {aktifRoomId ? (
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
            ) : utas?.menungguRoomId ? (
              <div className="p-3 bg-primary/5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-base animate-pulse">🔍</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Menunggu partner…</p>
                  <p className="text-[10px] text-slate-500">Kami kabari lewat notifikasi kalau ada yang cocok</p>
                </div>
                <button
                  onClick={() => handleCancelWaiting(utas.menungguRoomId)}
                  className="text-[10px] font-bold text-rose-500 px-2 py-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                >
                  Batalkan
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all"
                >
                  🚀 Cari Teman Baru
                </button>
              </div>
            )}
          </div>
        </div>

        <ModalCari
          tampil={showSearchModal}
          tutup={() => setShowSearchModal(false)}
          userAlias={userAlias}
          setUserAlias={setUserAlias}
          userFaculty={userFaculty}
          setUserFaculty={setUserFaculty}
          searching={searching}
          cari={handleFindPartner}
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // TAMPILAN: ROOM JUAL BELI (?room=<id>)
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
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                  placeholder="Ketik pesan..."
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
  // TAMPILAN: KOTAK MASUK
  // ══════════════════════════════════════════════════════════════════════
  const anon = ringkasAnon;
  // Barisnya SELALU ada, walau belum pernah ngobrol dan belum ada siapa-siapa
  // yang online: kotaknya harus bisa dimasuki dulu, pencariannya jalan sendiri
  // di latar belakang sampai ada yang muncul.
  const cuplikan = anon?.pesanTerakhir
    ? `${anon.pesanTerakhir.milikku ? "Kamu: " : ""}${anon.pesanTerakhir.teks}`
    : anon?.menunggu
      ? "Sedang mencari teman… kamu dikabari begitu ada yang cocok"
      : anon?.ada
        ? "Belum ada pesan"
        : "Ngobrol 1-on-1 dengan mahasiswa USU & POLMED — ketuk buat mulai";

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
        {/* ── OBROLAN ANONIM — satu baris, satu utas ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              🎭 Cari Temen
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
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <button
                onClick={() => router.push("/chat?anon=1")}
                className="w-full text-left p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg">🎭</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">Cari Temen</span>
                    {anon?.partnerAktif ? (
                      <span className="text-[9px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-1.5 py-0.5 rounded-full shrink-0">
                        {anon.partnerAktif}
                      </span>
                    ) : anon?.menunggu ? (
                      <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                        Mencari…
                      </span>
                    ) : anon?.ada ? (
                      <span className="text-[9px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                        Tidak aktif
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{cuplikan}</p>
                  {anon?.jumlahOrang > 1 && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{anon.jumlahOrang} orang pernah diajak ngobrol</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{waktuRelatif(anon?.updatedAt)}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── CHAT JUAL BELI — tetap terpisah per barang ── */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">💬 Chat Jual Beli</h2>
          <MarketplaceInbox onSelectRoom={(roomId) => router.push(`/chat?room=${roomId}`)} />
        </div>
      </div>

      <ModalCari
        tampil={showSearchModal}
        tutup={() => setShowSearchModal(false)}
        userAlias={userAlias}
        setUserAlias={setUserAlias}
        userFaculty={userFaculty}
        setUserFaculty={setUserFaculty}
        searching={searching}
        cari={handleFindPartner}
      />
    </div>
  );
}

function ModalCari({ tampil, tutup, userAlias, setUserAlias, userFaculty, setUserFaculty, searching, cari }) {
  if (!tampil) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Cari Teman Ngobrol</h3>
          <button onClick={tutup} className="p-1 text-slate-400 hover:text-slate-700">
            <Icon.X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ngobrol 1-on-1 dengan sesama mahasiswa USU & POLMED secara acak tanpa perlu tahu identitas asli.
          Kalau kamu sedang punya obrolan yang jalan, obrolan itu ditutup dulu.
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
          onClick={cari}
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
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
