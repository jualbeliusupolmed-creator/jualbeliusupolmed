"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import { playChatSound, playSentSound } from "@/lib/sound";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import Link from "next/link";

function waktuRelatif(iso) {
  if (!iso) return "";
  const detik = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)}m lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)}j lalu`;
  return `${Math.floor(detik / 86400)}h lalu`;
}

const ICEBREAKERS = [
  "Halo! Jurusan apa nih?",
  "Anak kos atau pp dari rumah?",
  "Lagi di kampus ga hari ini?",
  "Rekomendasi tempat makan murah dong",
];

const PROFIL_SWIPE_DEFAULT = [
  {
    id: "fk-1",
    name: "Faris Kurniawan",
    age: 20,
    avatar: "FK",
    stambuk: "2023",
    campus: "USU",
    faculty: "Fasilkom-TI",
    major: "Ilmu Komputer • USU Padang Bulan",
    bio: "Lagi cari partner buat ikut Hackathon USU / PKM-KC. Suka ngoding React, riset AI & ngopi di Warkop Harapan atau FIB. Gas saling sapa dan nugas bareng!",
    favSpot: "Perpus Pusat USU Lt. 2",
    tags: ["#HackathonUSU", "#WebDev", "#NugasBareng", "#NgopiSantai"],
  },
  {
    id: "da-2",
    name: "Dimas Adrian",
    age: 21,
    avatar: "DA",
    stambuk: "2022",
    campus: "USU",
    faculty: "Fakultas Teknik",
    major: "Teknik Mesin • FT USU",
    bio: "Butuh temen sharing praktikum thermo & tugas CAD. Santai, suka nongkrong di Kantin Teknik atau Pintu 2 sehabis ashar.",
    favSpot: "Kantin FT & Gazebo Teknik",
    tags: ["#TeknikMesin", "#AutoCAD", "#Pintu2USU", "#FutsalKampus"],
  },
  {
    id: "sl-3",
    name: "Sarah Lubis",
    age: 20,
    avatar: "SL",
    stambuk: "2023",
    campus: "USU",
    faculty: "FEB USU",
    major: "Akuntansi • FEB USU",
    bio: "Lagi ngejar skripsi akuntansi & butuh teman belajar bareng di perpustakaan. Suka matcha dingin & diskusi bisnis kampus.",
    favSpot: "Perpustakaan Pusat USU & Gazebo FEB",
    tags: ["#AkuntansiUSU", "#StudyWithMe", "#PerpusUSU", "#BisnisMahasiswa"],
  },
  {
    id: "ks-4",
    name: "Kevin Siregar",
    age: 22,
    avatar: "KS",
    stambuk: "2021",
    campus: "POLMED",
    faculty: "Teknik Komputer",
    major: "Teknik Komputer • POLMED",
    bio: "Anak IT Polmed, hobi oprek IoT dan mikrokontroler. Terbuka kolaborasi lintas kampus USU-POLMED buat proyek tugas akhir.",
    favSpot: "Kantin Gedung Z POLMED",
    tags: ["#AnakPOLMED", "#IoTMedan", "#CodingBareng", "#MedanTech"],
  },
];

const MATCH_HARI_INI = [
  { name: "Dimas Adrian", initials: "DA", faculty: "Teknik Mesin FT USU", campus: "USU", time: "10:15" },
  { name: "Sarah Lubis", initials: "SL", faculty: "Akuntansi FEB USU", campus: "USU", time: "08:30" },
  { name: "Kevin Siregar", initials: "KS", faculty: "Teknik Komputer POLMED", campus: "POLMED", time: "Kemarin" },
];

const BASECAMP_SPOTS = [
  "Perpustakaan Pusat USU",
  "Pendopo USU",
  "Kantin Gedung Z POLMED",
  "Pintu 2 USU",
  "Gazebo FIB USU",
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
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomQuery = searchParams.get("room");
  const anonView = searchParams.get("anon") === "1";

  // Desktop sub-view mode: "chat" | "swipe"
  const [desktopMode, setDesktopMode] = useState(roomQuery || anonView ? "chat" : "swipe");
  const [sidebarFilter, setSidebarFilter] = useState("semua"); // "semua" | "teman" | "po" | "market"
  const [searchFilter, setSearchFilter] = useState("");
  const [kampusTersedia, setKampusTersedia] = useState([
    { shortName: "USU" },
    { shortName: "POLMED" },
  ]);

  // Swipe Deck state
  const [swipeIndex, setSwipeIndex] = useState(0);

  // Kotak Masuk Marketplace
  const [inboxRooms, setInboxRooms] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  // Anon & Thread State
  const [ringkasAnon, setRingkasAnon] = useState(null);
  const [anonLoading, setAnonLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [utas, setUtas] = useState(null);
  const [utasLoading, setUtasLoading] = useState(true);

  // Active Room State (?room=<id>)
  const [myWa, setMyWa] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null); // 'active' | 'closed'
  const [roomType, setRoomType] = useState("marketplace"); // 'marketplace' | 'direct'
  const [partnerInfo, setPartnerInfo] = useState({ alias: "Anonim", faculty: "Umum", wa: "" });
  const [messages, setMessages] = useState([]);
  const [roomNotFound, setRoomNotFound] = useState(false);

  // Message input state
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
  const loadingThreadRef = useRef(false);
  const pollingMatchRef = useRef(false);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setIsLoggedIn(Boolean(data?.loggedIn)))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setAuthChecked(true));
    fetch("/api/kampus", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data?.campuses) && data.campuses.length) setKampusTersedia(data.campuses);
      })
      .catch(() => {});
  }, []);

  // Sync desktopMode when URL changes
  useEffect(() => {
    if (roomQuery || anonView) {
      setDesktopMode("chat");
    }
  }, [roomQuery, anonView]);

  // Scroll on new messages
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

  // Load Marketplace Inbox
  const fetchInboxRooms = useCallback(async () => {
    try {
      setInboxLoading(true);
      const res = await fetch("/api/chat/marketplace/inbox");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setInboxRooms(data.rooms || []);
          if (data.myWa) setMyWa(data.myWa);
        }
      }
    } catch (e) {
      console.warn("Gagal memuat inbox:", e);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked || !isLoggedIn) return;
    fetchInboxRooms();
  }, [authChecked, isLoggedIn, fetchInboxRooms]);

  // Kotak Masuk Anonim
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
    if (!authChecked || !isLoggedIn) {
      if (authChecked) setAnonLoading(false);
      return;
    }
    refreshAnonInbox();
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") refreshAnonInbox();
    }, 60000);
    return () => clearInterval(iv);
  }, [authChecked, isLoggedIn, refreshAnonInbox]);

  // Utas Anonim (?anon=1)
  const muatUtas = useCallback(async () => {
    if (loadingThreadRef.current) return;
    loadingThreadRef.current = true;
    try {
      const res = await fetch("/api/chat/anon/thread", { cache: "no-store" });
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
      loadingThreadRef.current = false;
      setUtasLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!anonView) return;
    setUtasLoading(true);
    muatUtas();
  }, [anonView, muatUtas]);

  // Polling Match antrean
  const menungguRoomId = anonView ? utas?.menungguRoomId : ringkasAnon?.menungguRoomId;
  useEffect(() => {
    if (!menungguRoomId) return;
    const iv = setInterval(async () => {
      if (document.visibilityState !== "visible" || pollingMatchRef.current) return;
      pollingMatchRef.current = true;
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
          toast.success("Teman ditemukan!");
          playChatSound();
          hapticSuccess();
        } else {
          return;
        }
        if (anonView) muatUtas();
        else refreshAnonInbox();
      } catch {
        // silent
      } finally {
        pollingMatchRef.current = false;
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [menungguRoomId, anonView, muatUtas, refreshAnonInbox]);

  // Active Room Data (?room=<id>)
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

  // Realtime Broadcast
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
            console.warn("[chat] Realtime fallback polling active");
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

  // Handlers
  const handleFindPartner = async () => {
    if (!isLoggedIn) {
      toast.error("Masuk dulu untuk mulai mengobrol.");
      router.push("/dashboard/login?next=/chat");
      return;
    }
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
        toast.success("Berhasil terhubung dengan teman!", {
          icon: <Icon.HeartFilled className="h-4 w-4 text-emerald-600" />,
        });
        playChatSound();
        hapticSuccess();
      } else if (data.status === "waiting") {
        toast.info("Belum ada yang online — kamu masuk antrean.", {
          icon: <Icon.Search className="h-4 w-4 text-primary" />,
        });
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
      toast.success("Foto berhasil dikirim");
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
        toast.success("Saling setuju! Kontak DM Pribadi website terbuka.");
        playSentSound();
        hapticSuccess();
      } else if (data.status === "requested") {
        toast.info("Ajakan terkirim. Menunggu persetujuan lawan bicara...");
      } else if (data.status === "waiting_partner") {
        toast.info("Kamu sudah mengirim ajakan. Menunggu lawan bicara setuju.");
      }
      if (anonView) muatUtas();
      else fetchRoomData(rId);
    } catch {
      toast.error("Gagal mengirim permintaan tukar kontak");
    }
  };

  const handleLeaveChat = async () => {
    const targetRoom = anonView ? utas?.aktifRoomId : roomQuery;
    if (!targetRoom) return;
    await fetch(`/api/chat/room/${targetRoom}`, { method: "DELETE" });
    try {
      rtChannelRef.current?.send({ type: "broadcast", event: "pesan", payload: {} });
    } catch {}
    if (anonView) muatUtas();
    else router.push("/chat");
  };

  // Swipe Action
  const currentSwipeProfile = PROFIL_SWIPE_DEFAULT[swipeIndex % PROFIL_SWIPE_DEFAULT.length];

  const handleNextSwipe = (action = "pass") => {
    if (action === "super") {
      toast.success(`Super Match dengan ${currentSwipeProfile.name}! 🌟`);
      playChatSound();
      hapticSuccess();
    } else if (action === "like") {
      toast.success(`Kamu menyapa ${currentSwipeProfile.name}! 🙌`);
      hapticSuccess();
    } else {
      hapticLight();
    }
    setSwipeIndex((prev) => (prev + 1) % PROFIL_SWIPE_DEFAULT.length);
  };

  // Filtered rooms in sidebar
  const filteredRooms = useMemo(() => {
    return inboxRooms.filter((r) => {
      const isDirect = r.type === "direct";
      const isUser1 = r.user1_id === myWa;
      const partnerAlias = (isUser1 ? r.user2_alias : r.user1_alias) || "";
      const listingTitle = r.listings?.title || "";

      // Match category
      if (sidebarFilter === "teman" && !isDirect) return false;
      if (sidebarFilter === "market" && isDirect) return false;

      // Match search
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesName = partnerAlias.toLowerCase().includes(query);
        const matchesTitle = listingTitle.toLowerCase().includes(query);
        return matchesName || matchesTitle;
      }
      return true;
    });
  }, [inboxRooms, sidebarFilter, searchFilter, myWa]);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 w-44 rounded-xl bg-gray-200 dark:bg-slate-800" />
        <div className="h-28 rounded-2xl bg-gray-100 dark:bg-slate-900" />
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-slate-900" />
      </div>
    );
  }

  // Active Anon Thread calculations
  const rawSegmen = utas?.segmen || [];
  const aktifRoomId = utas?.aktifRoomId || null;
  const isWaiting = !!utas?.menungguRoomId || searching;
  const segAktif = rawSegmen.find((s) => s.roomId === aktifRoomId) || null;
  const activeMessages = (segAktif?.pesan || []).filter(
    (m) => m.sender_id !== "system" || m.message?.startsWith("system:")
  );
  const realMsgCount = activeMessages.filter((m) => !m.sender_id.startsWith("system")).length;
  const labelKampus = kampusTersedia.map((kampus) => kampus.shortName).join(" • ");

  return (
    <div className="w-full flex-1 flex flex-col bg-surface font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* ── TOP SUB-HEADER: MODE SWITCHER BANNER (from 16.html) ── */}
      <div className="w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-md px-3 sm:px-6 py-2 shrink-0 z-30">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => {
                setDesktopMode("swipe");
                if (roomQuery || anonView) router.push("/chat");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                desktopMode === "swipe" && !roomQuery && !anonView
                  ? "bg-[#047857] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon.Users className="w-4 h-4 text-emerald-300" />
              <span>Cari Teman &amp; Swipe</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                Live
              </span>
            </button>
            <button
              onClick={() => setDesktopMode("chat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                desktopMode === "chat" || roomQuery || anonView
                  ? "bg-[#047857] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon.MessageCircle className="w-4 h-4" />
              <span>Semua Percakapan</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-black">
                {inboxRooms.length + (ringkasAnon?.ada ? 1 : 0)}
              </span>
            </button>
          </div>

          {/* Right Live Indicator & Campus Tag */}
          <div className="flex items-center gap-2 text-xs">
            {authChecked && !isLoggedIn && (
              <Link
                href="/dashboard/login?next=/chat"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-800 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800"
              >
                <Icon.Lock className="h-3.5 w-3.5" />
                <span>Masuk untuk mengobrol</span>
              </Link>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Mahasiswa aktif di {labelKampus}</span>
            </span>
            <Link
              href="/teman"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Icon.Sparkles className="w-3.5 h-3.5" />
              <span>Preferensi Teman</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN SPLIT CONTAINER ── */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto flex flex-col md:flex-row overflow-hidden relative h-[calc(100dvh-6.5rem)]">
        {/* ══════════════════════════════════════════════════════════════════
            PANEL KIRI (SIDEBAR): DAFTAR PESAN & MATCH BARU
            Visible on desktop; on mobile hidden if a room is actively open
            ══════════════════════════════════════════════════════════════════ */}
        <aside
          className={`w-full md:w-[350px] lg:w-[370px] shrink-0 bg-white dark:bg-[#121214] flex flex-col h-full overflow-hidden border-r border-slate-200 dark:border-slate-800 ${
            (roomQuery || anonView) ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header & Search */}
          <div className="p-3.5 pb-2.5 flex flex-col gap-2.5 bg-white dark:bg-[#121214] border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Pesan &amp; Kontak
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  {inboxRooms.length + 1} Aktif
                </span>
              </div>
              <button
                onClick={handleFindPartner}
                disabled={searching}
                title="Mulai Obrolan Baru"
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-700 transition-colors"
              >
                <Icon.Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-slate-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all border border-transparent focus-within:border-emerald-500/40">
              <Icon.Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari teman, pesan, stambuk..."
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter("")} className="text-slate-400 hover:text-slate-600">
                  <Icon.X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Horizontal Story / Match Baru Avatars (from 16.html & 13.html) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Match Baru</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">3 Teman</span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none [scrollbar-width:none]">
                {/* Swipe shortcut */}
                <button
                  onClick={() => {
                    setDesktopMode("swipe");
                    router.push("/chat");
                  }}
                  className="w-11 h-11 rounded-full border-2 border-dashed border-emerald-600/60 dark:border-emerald-500/60 flex flex-col items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  title="Cari Teman Baru"
                >
                  <Icon.Plus className="w-4 h-4" />
                </button>

                {MATCH_HARI_INI.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDesktopMode("swipe");
                      setSwipeIndex(idx % PROFIL_SWIPE_DEFAULT.length);
                      router.push("/chat");
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        {m.initials}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[50px] text-center">
                      {m.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none [scrollbar-width:none]">
              {[
                { id: "semua", label: "Semua" },
                { id: "teman", label: "Teman Kampus" },
                { id: "po", label: "Open PO" },
                { id: "market", label: "Marketplace" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    sidebarFilter === tab.id
                      ? "bg-[#047857] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y-0 p-2 space-y-1.5 scrollbar-none [scrollbar-width:none]">
            {/* Pinned Item: Cari Teman & Swipe (from 16.html) */}
            <article
              onClick={() => {
                setDesktopMode("swipe");
                router.push("/chat");
              }}
              className={`p-2.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all relative ${
                desktopMode === "swipe" && !roomQuery && !anonView
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Icon.Users className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 truncate">
                      Cari Teman &amp; Swipe
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#047857] text-white truncate shrink-0">
                      Mode Aktif ⚡
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Online</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    <Icon.Flame className="w-3 h-3" />
                    <span className="truncate max-w-[130px]">Swipe Kenalan Kampus</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Buka untuk swipe teman baru di sekitarmu
                  </p>
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                </div>
              </div>
            </article>

            {/* Pinned Label */}
            <div className="px-2 pt-2 pb-0.5 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                <Icon.Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Obrolan Kamu</span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                {filteredRooms.length} Kamar
              </span>
            </div>

            {/* Anonim Chat Room Item */}
            {ringkasAnon && (
              <article
                onClick={() => {
                  setDesktopMode("chat");
                  router.push("/chat?anon=1");
                }}
                className={`p-2.5 rounded-xl flex items-start gap-3 cursor-pointer transition-all border ${
                  anonView
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                    : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold shadow-xs">
                    <Icon.MessageCircle className="w-5 h-5" />
                  </div>
                  {ringkasAnon.partnerAktif && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {ringkasAnon.partnerAktif ? ringkasAnon.partnerAktif : "Obrolan Anonim USU"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 truncate shrink-0">
                        Anon 1-on-1
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {waktuRelatif(ringkasAnon.updatedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {ringkasAnon.pesanTerakhir?.teks || (ringkasAnon.menunggu ? "Sedang mencari teman..." : "Ketuk untuk mengobrol")}
                  </p>
                </div>
              </article>
            )}

            {/* Real Marketplace & Direct DM Rooms */}
            {inboxLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Memuat percakapan...</div>
            ) : filteredRooms.length === 0 && !ringkasAnon ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Icon.MessageCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada obrolan aktif</p>
                <p className="text-[10px] text-slate-500">Mulai chat dengan menekan tombol + di atas atau swipe teman!</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isDirect = room.type === "direct";
                const isUser1 = room.user1_id === myWa;
                const partnerAlias = (isUser1 ? room.user2_alias : room.user1_alias) || "Anak Kampus";
                const partnerFaculty = (isUser1 ? room.user2_faculty : room.user1_faculty) || "USU";
                const listing = room.listings;
                const isSelected = roomQuery === room.id;

                return (
                  <article
                    key={room.id}
                    onClick={() => {
                      setDesktopMode("chat");
                      router.push(`/chat?room=${room.id}`);
                    }}
                    className={`p-2.5 rounded-xl flex items-start gap-3 cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      {isDirect ? (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {partnerAlias[0]?.toUpperCase() || "T"}
                        </div>
                      ) : listing?.image_url ? (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#047857]/10 text-[#047857] flex items-center justify-center font-bold text-sm">
                          <Icon.Package className="w-5 h-5" />
                        </div>
                      )}
                      {room.status === "active" && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {partnerAlias}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 truncate shrink-0">
                            {partnerFaculty}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {waktuRelatif(room.updated_at)}
                        </span>
                      </div>

                      {listing?.title && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9.5px] font-bold">
                            <Icon.Tag className="w-3 h-3" />
                            <span className="truncate max-w-[130px]">{listing.title}</span>
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {isDirect ? "Obrolan personal mahasiswa" : `Transaksi produk: ${listing?.title || "Barang"}`}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════
            PANEL KANAN (CENTER & RIGHT): 
            MODE A: CARI TEMAN & SWIPE DECK (from 16.html)
            MODE B: ACTIVE CHAT ROOM (?room=<id> or ?anon=1)
            ══════════════════════════════════════════════════════════════════ */}
        <section
          className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-black relative min-w-0 overflow-hidden ${
            (!roomQuery && !anonView) ? "flex" : "flex"
          }`}
        >
          {/* ── SUB-VIEW A: CARI TEMAN & SWIPE DECK (from 16.html) ── */}
          {desktopMode === "swipe" && !roomQuery && !anonView && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header Atas: Swipe & Cari Teman Kampus */}
              <header className="px-4 md:px-6 py-3 bg-white dark:bg-[#121214] shadow-xs flex items-center justify-between gap-3 shrink-0 border-b border-slate-200 dark:border-slate-800 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Icon.Users className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        Cari Teman &amp; Swipe Kenalan Kampus
                      </h2>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Live {labelKampus}</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Temukan partner nugas, praktikum, teman nongkrong, atau tim lomba
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                    <Icon.Compass className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-bold text-slate-900 dark:text-white">Kampus: {labelKampus}</span>
                  </div>
                  <button
                    onClick={() => handleNextSwipe("pass")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Icon.ArrowRight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lewati Profil</span>
                  </button>
                </div>
              </header>

              {/* Main Swipe Viewport */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6 items-stretch justify-center scrollbar-none [scrollbar-width:none]">
                {/* Kartu Swipe Utama (Pusat Perhatian) */}
                <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
                  <div className="w-full bg-white dark:bg-[#1c1c1e] rounded-3xl border border-emerald-500/20 shadow-md p-6 flex flex-col justify-between transition-all relative overflow-hidden">
                    {/* Top verified banner */}
                    <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                          <Icon.CheckCircle className="w-3.5 h-3.5" />
                          NIM Terverifikasi {currentSwipeProfile.campus}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          Rekomendasi Hari Ini
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        Stambuk {currentSwipeProfile.stambuk}
                      </span>
                    </div>

                    {/* Profile body */}
                    <div className="py-5 flex flex-col md:flex-row items-center md:items-start gap-5">
                      <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center text-3xl font-black shadow-md">
                          {currentSwipeProfile.avatar}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#047857] ring-2 ring-white dark:ring-black flex items-center justify-center text-[12px] text-white font-bold">
                          ✓
                        </span>
                      </div>

                      <div className="flex-1 text-center md:text-left min-w-0">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                          {currentSwipeProfile.name}, {currentSwipeProfile.age} thn
                        </h3>
                        <p className="text-xs text-[#047857] dark:text-emerald-400 font-bold flex items-center justify-center md:justify-start gap-1 mb-3 mt-0.5">
                          <Icon.BookOpen className="w-3.5 h-3.5" />
                          <span>{currentSwipeProfile.major}</span>
                        </p>

                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800">
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                            “{currentSwipeProfile.bio}”
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60">
                            <Icon.MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            Spot: {currentSwipeProfile.favSpot}
                          </span>
                          {currentSwipeProfile.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons panel */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4">
                      <button
                        onClick={() => handleNextSwipe("pass")}
                        className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all shadow-xs active:scale-90"
                        title="Lewati (Next Profil)"
                      >
                        <Icon.X className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => handleNextSwipe("super")}
                        className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90"
                        title="Super Match / Simpan Teman"
                      >
                        <Icon.StarFilled className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleNextSwipe("like")}
                        className="px-6 py-3 rounded-full bg-[#047857] hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-700/25 transition-all active:scale-95"
                        title="Ajak Kenalan Sekarang"
                      >
                        <Icon.HeartFilled className="w-4 h-4 text-emerald-200" />
                        <span>Ajak Kenalan &amp; Mulai Chat</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sisi Kanan: Match Hari Ini & Basecamp Favorit (from 16.html) */}
                <div className="w-full xl:w-72 shrink-0 flex flex-col gap-4">
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Match Hari Ini
                      </h4>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        3 Teman
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {MATCH_HARI_INI.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {m.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {m.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {m.faculty}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              toast.success(`Membuka percakapan dengan ${m.name}`);
                              router.push("/chat?anon=1");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#047857] text-white text-[10px] font-black shrink-0 hover:bg-emerald-800 transition-colors"
                          >
                            Chat
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5">
                      <Icon.MapPin className="w-4 h-4 text-emerald-600" />
                      Titik Temu &amp; Basecamp Favorit
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed">
                      Rekomendasi spot aman dan nyaman untuk ketemuan pertama kali:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {BASECAMP_SPOTS.map((spot, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          {spot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUB-VIEW B: UTAS ANONIM (?anon=1) ── */}
          {anonView && (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121214] overflow-hidden">
              {/* Header Utas Anonim */}
              <div className="bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-3 sm:px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => router.push("/chat")}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full"
                    title="Kembali"
                  >
                    <Icon.ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <Icon.MessageCircle className="w-5 h-5" />
                    </div>
                    {aktifRoomId && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {aktifRoomId ? (segAktif ? segAktif.alias : "Partner Anonim") : "Bot Obrolan Anonim"}
                      </p>
                      {aktifRoomId && segAktif?.faculty && (
                        <span className="text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                          {segAktif.faculty}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {aktifRoomId ? "Sedang terhubung langsung" : isWaiting ? "Sedang mencari partner..." : `Mahasiswa ${labelKampus}`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {aktifRoomId ? (
                    <>
                      <button
                        onClick={() => handleExchangeContact(aktifRoomId)}
                        title="Ajak lanjut mengobrol di DM Pribadi"
                        className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-100 transition-all shadow-2xs"
                      >
                        <Icon.CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tukar Kontak</span>
                      </button>
                      <button
                        onClick={handleFindPartner}
                        title="Ganti Lawan Obrolan"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800"
                      >
                        <Icon.Refresh className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleLeaveChat}
                        title="Akhiri Obrolan"
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full"
                      >
                        <Icon.X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleFindPartner}
                      disabled={searching || isWaiting}
                      className="flex items-center gap-1 bg-[#047857] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs hover:bg-emerald-800 transition-all disabled:opacity-50"
                    >
                      {searching ? "Mencari..." : <><Icon.Sparkles className="w-3.5 h-3.5" /><span>Cari Baru</span></>}
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Canvas Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {utasLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">Menghubungkan ke Cari Teman...</p>
                  </div>
                ) : rawSegmen.length === 0 && !isWaiting ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-3xl shadow-xs border border-emerald-500/20">
                      <Icon.MessageCircle className="w-8 h-8 text-emerald-700" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Obrolan Anonim {labelKampus}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ngobrol santai 1-on-1 secara anonim &amp; rahasia dengan sesama mahasiswa kampus. Ketuk tombol di bawah untuk mulai!
                      </p>
                    </div>
                    <button
                      onClick={handleFindPartner}
                      disabled={searching}
                      className="px-6 py-2.5 rounded-full bg-[#047857] hover:bg-emerald-800 text-white text-xs font-black shadow-md shadow-emerald-700/25 active:scale-95 transition-all flex items-center gap-2"
                    >
                      {searching ? "Mencari Teman..." : <><Icon.Sparkles className="w-4 h-4" /><span>Mulai Obrolan Sekarang</span></>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rawSegmen.map((seg, sIdx) => (
                      <div key={seg.roomId || sIdx} className="space-y-3">
                        {/* Session Banner */}
                        <div className="flex items-center justify-center my-2">
                          <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-center shadow-2xs">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 justify-center">
                              <Icon.Users className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Terhubung dengan {seg.alias}</span>
                              {seg.faculty && (
                                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                                  {seg.faculty}
                                </span>
                              )}
                              {seg.mulai && (
                                <span className="text-slate-400 font-normal text-[10px]">
                                  · {waktuRelatif(seg.mulai)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Messages */}
                        {seg.pesan.map((m, idx) => {
                          const isMe = m.sender_id === utas?.myId;
                          const parsed = parseMessageContent(m.message);

                          return (
                            <div key={m.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              <div
                                className={`max-w-[85%] text-xs leading-relaxed ${
                                  parsed.isImage
                                    ? isMe
                                      ? "bg-[#047857] text-white p-1 rounded-2xl rounded-br-sm shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white p-1 rounded-2xl rounded-bl-sm"
                                    : isMe
                                      ? "bg-[#047857] text-white px-3.5 py-2 rounded-2xl rounded-br-sm shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2 rounded-2xl rounded-bl-sm"
                                }`}
                              >
                                {parsed.isImage ? (
                                  <div className="space-y-1">
                                    <img
                                      src={parsed.imgUrl}
                                      alt="Foto"
                                      onClick={() => setPreviewImage(parsed.imgUrl)}
                                      className="rounded-xl max-h-60 object-cover cursor-pointer hover:opacity-95"
                                    />
                                    {parsed.text && <p className="px-2 pt-1 text-xs">{parsed.text}</p>}
                                  </div>
                                ) : (
                                  parsed.text
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Icebreakers for new chat */}
              {aktifRoomId && realMsgCount <= 1 && (
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  {ICEBREAKERS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Input */}
              {aktifRoomId ? (
                <div className="p-3.5 bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
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
                    className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all text-sm disabled:opacity-50"
                  >
                    {uploadingImg ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Icon.Camera className="h-4 w-4" />}
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                    placeholder="Ketik pesan santai..."
                    className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || sending || uploadingImg}
                    className="w-10 h-10 shrink-0 rounded-full bg-[#047857] disabled:opacity-40 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                  >
                    <Icon.ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <button
                    onClick={handleFindPartner}
                    disabled={searching}
                    className="w-full py-2.5 rounded-full bg-[#047857] text-white text-xs font-black shadow-md shadow-emerald-700/25 hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {searching ? "Mencari Teman..." : <><Icon.Sparkles className="w-4 h-4" /><span>Cari Teman Baru</span></>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── SUB-VIEW C: ACTIVE ROOM (?room=<id>) ── */}
          {roomQuery && (
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121214] overflow-hidden">
              {roomNotFound ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Icon.Search className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Obrolan tidak ditemukan</p>
                  <button
                    onClick={() => router.push("/chat")}
                    className="px-4 py-1.5 rounded-full bg-[#047857] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                  >
                    Kembali
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Room Header */}
                  <div className="bg-white/90 dark:bg-[#121214]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-3 sm:px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => router.push("/chat")}
                        className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full"
                        title="Kembali"
                      >
                        <Icon.ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                            roomType === "direct"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {roomType === "direct" ? <Icon.Users className="w-4 h-4" /> : <Icon.Package className="w-4 h-4" />}
                        </div>
                        {roomStatus === "active" && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {partnerInfo.alias}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {roomType === "direct" ? `Teman Kampus · ${partnerInfo.faculty}` : `Marketplace · ${partnerInfo.faculty}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {partnerInfo.wa && (
                        <a
                          href={`https://wa.me/${String(partnerInfo.wa).replace(/^0/, "62")}?text=${encodeURIComponent("Halo, saya dari obrolan Kampus Kita ")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-[#047857] px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                        >
                          <Icon.Phone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}
                      <button
                        onClick={handleLeaveChat}
                        title="Tutup Obrolan"
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full"
                      >
                        <Icon.X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {messages.map((m, idx) => {
                      const isMe = m.sender_id === myWa;
                      const parsed = parseMessageContent(m.message);

                      return (
                        <div key={m.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[85%] text-xs leading-relaxed ${
                              parsed.isImage
                                ? isMe
                                  ? "bg-[#047857] text-white p-1 rounded-2xl rounded-br-sm shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white p-1 rounded-2xl rounded-bl-sm"
                                : isMe
                                  ? "bg-[#047857] text-white px-3.5 py-2 rounded-2xl rounded-br-sm shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2 rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            {parsed.isImage ? (
                              <div className="space-y-1">
                                <img
                                  src={parsed.imgUrl}
                                  alt="Foto"
                                  onClick={() => setPreviewImage(parsed.imgUrl)}
                                  className="rounded-xl max-h-60 object-cover cursor-pointer hover:opacity-95"
                                />
                                {parsed.text && <p className="px-2 pt-1 text-xs">{parsed.text}</p>}
                              </div>
                            ) : (
                              parsed.text
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Room Input Bar */}
                  {roomStatus === "active" && (
                    <div className="p-3.5 bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
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
                        className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all text-sm disabled:opacity-50"
                      >
                        {uploadingImg ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Icon.Camera className="h-4 w-4" />}
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                        placeholder="Ketik pesan..."
                        className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputMessage.trim() || sending || uploadingImg}
                        className="w-10 h-10 shrink-0 rounded-full bg-[#047857] disabled:opacity-40 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs"
                      >
                        <Icon.ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>

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
              alt="Preview"
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat Obrolan Kampus...</div>}>
      <ChatContent />
    </Suspense>
  );
}
