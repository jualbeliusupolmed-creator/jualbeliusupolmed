"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { FACULTIES } from "@/lib/profanity";
import { toast } from "sonner";

export default function ChatPage() {
  const [mainTab, setMainTab] = useState("random"); // 'random' | 'marketplace'

  // User Identification State
  const [userId, setUserId] = useState("");
  const [userAlias, setUserAlias] = useState("Anonim");
  const [userFaculty, setUserFaculty] = useState("Umum");

  // Anonymous Chat State: 'idle' | 'matching' | 'chat' | 'ended'
  const [chatState, setChatState] = useState("idle");
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState({ alias: "Anonim", faculty: "Umum" });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Initialize unique user ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      let uid = localStorage.getItem("chat_user_id");
      if (!uid) {
        uid = "chat_" + Math.random().toString(36).substring(2, 14);
        localStorage.setItem("chat_user_id", uid);
      }
      setUserId(uid);
    }
  }, []);

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling Messages while in chat
  const fetchRoomData = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/chat/room/${roomId}`);
      const data = await res.json();
      if (data.room) {
        if (data.room.status === "closed" && chatState === "chat") {
          setChatState("ended");
        }
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    }
  }, [chatState]);

  // Start Matchmaking
  const handleStartMatch = async () => {
    if (!userId) return;
    setChatState("matching");
    setMessages([]);
    setCurrentRoomId(null);

    try {
      const res = await fetch("/api/chat/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "find",
          userId,
          alias: userAlias,
          faculty: userFaculty,
        }),
      });

      const data = await res.json();

      if (data.status === "matched" && data.room) {
        setCurrentRoomId(data.room.id);
        const partnerIsUser1 = data.room.user1_id !== userId;
        setPartnerInfo({
          alias: partnerIsUser1 ? data.room.user1_alias : data.room.user2_alias,
          faculty: partnerIsUser1 ? data.room.user1_faculty : data.room.user2_faculty,
        });
        setChatState("chat");
        fetchRoomData(data.room.id);
        toast.success("🎉 Berhasil terhubung dengan teman!");
      } else if (data.status === "waiting" && data.roomId) {
        setCurrentRoomId(data.roomId);
        // Start polling for match
        startPollingForPartner(data.roomId);
      }
    } catch (e) {
      toast.error("Gagal memulai pencarian teman.");
      setChatState("idle");
    }
  };

  // Poll waiting room until user2 joins
  const startPollingForPartner = (roomId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", userId, roomId }),
        });
        const data = await res.json();

        if (data.isMatched && data.room) {
          clearInterval(pollIntervalRef.current);
          setCurrentRoomId(data.room.id);
          const partnerIsUser1 = data.room.user1_id !== userId;
          setPartnerInfo({
            alias: partnerIsUser1 ? data.room.user1_alias : data.room.user2_alias,
            faculty: partnerIsUser1 ? data.room.user1_faculty : data.room.user2_faculty,
          });
          setChatState("chat");
          fetchRoomData(data.room.id);
          toast.success("🎉 Teman ditemukan!");
        }
      } catch {
        // silent
      }
    }, 2000);
  };

  // Poll message feed while in chat
  useEffect(() => {
    let msgInterval;
    if (chatState === "chat" && currentRoomId) {
      fetchRoomData(currentRoomId);
      msgInterval = setInterval(() => {
        fetchRoomData(currentRoomId);
      }, 2000);
    }
    return () => {
      if (msgInterval) clearInterval(msgInterval);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [chatState, currentRoomId, fetchRoomData]);

  // Wake up polling on tab active (fixes browser background throttling)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (chatState === "matching" && currentRoomId) {
          fetch("/api/chat/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "poll", userId, roomId: currentRoomId }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.isMatched && data.room) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setCurrentRoomId(data.room.id);
                const partnerIsUser1 = data.room.user1_id !== userId;
                setPartnerInfo({
                  alias: partnerIsUser1 ? data.room.user1_alias : data.room.user2_alias,
                  faculty: partnerIsUser1 ? data.room.user1_faculty : data.room.user2_faculty,
                });
                setChatState("chat");
                fetchRoomData(data.room.id);
                toast.success("🎉 Teman ditemukan setelah tab aktif!");
              }
            })
            .catch(() => {});
        } else if (chatState === "chat" && currentRoomId) {
          fetchRoomData(currentRoomId);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [chatState, currentRoomId, userId, fetchRoomData]);

  // Cancel Matching
  const handleCancelMatch = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (currentRoomId) {
      await fetch("/api/chat/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", userId, roomId: currentRoomId }),
      });
    }
    setChatState("idle");
    setCurrentRoomId(null);
  };

  // Send Message
  const handleSendMessage = async (customText) => {
    const text = (customText || inputMessage).trim();
    if (!text || !currentRoomId || sending) return;

    setSending(true);
    setInputMessage("");

    // Optimistic UI
    const tempMsg = {
      id: "temp_" + Date.now(),
      sender_id: userId,
      sender_alias: userAlias,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/chat/room/${currentRoomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          senderAlias: userAlias,
          message: text,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Gagal mengirim pesan");
      }
    } catch {
      toast.error("Gagal mengirim pesan");
    } finally {
      setSending(false);
      fetchRoomData(currentRoomId);
    }
  };

  // Leave / Skip Chat
  const handleLeaveChat = async () => {
    if (currentRoomId) {
      await fetch(`/api/chat/room/${currentRoomId}`, { method: "DELETE" });
    }
    setChatState("idle");
    setCurrentRoomId(null);
    setMessages([]);
  };

  const handleSkipChat = async () => {
    if (currentRoomId) {
      await fetch(`/api/chat/room/${currentRoomId}`, { method: "DELETE" });
    }
    handleStartMatch();
  };

  const ICEBREAKERS = [
    "Halo! Jurusan apa nih? 👋",
    "Anak kos atau pp dari rumah?",
    "Lagi di kampus ga hari ini?",
    "Rekomendasi tempat makan murah dong 🤤",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans selection:bg-primary/20 flex flex-col">
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div>
            <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
              OBROLAN KAMPUS
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Pusat Obrolan
            </h1>
          </div>
        </div>

        {/* 2 TABS */}
        <div className="flex px-4 max-w-2xl mx-auto border-t border-slate-50 dark:border-slate-800/60">
          <button
            onClick={() => {
              if (chatState === "chat") {
                if (confirm("Keluar dari obrolan anonim saat ini?")) {
                  handleLeaveChat();
                  setMainTab("random");
                }
              } else {
                setMainTab("random");
              }
            }}
            className={`flex-1 text-center py-2.5 text-xs font-bold transition-all relative ${
              mainTab === "random"
                ? "text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            🎭 Cari Teman Anonim
            {mainTab === "random" && (
              <div className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-t-full" />
            )}
          </button>

          <button
            onClick={() => setMainTab("marketplace")}
            className={`flex-1 text-center py-2.5 text-xs font-bold transition-all relative ${
              mainTab === "marketplace"
                ? "text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            💬 Chat Jual Beli
            {mainTab === "marketplace" && (
              <div className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: RANDOM ANONYMOUS CHAT */}
      {mainTab === "random" && (
        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-4">
          {/* 1. STATE: IDLE */}
          {chatState === "idle" && (
            <div className="my-auto py-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-sky-400 text-white rounded-3xl shadow-xl shadow-blue-500/20 flex items-center justify-center mx-auto text-4xl">
                🎭
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Cari Teman Ngobrol Anonim
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Ngobrol 1-on-1 dengan sesama mahasiswa USU & POLMED secara acak tanpa perlu tahu identitas asli.
                </p>
              </div>

              {/* Preferences Box */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left space-y-3.5 max-w-sm mx-auto">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Fakultas / Kampus Kamu
                  </label>
                  <select
                    value={userFaculty}
                    onChange={(e) => setUserFaculty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FACULTIES.map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Panggilanmu (Boleh Samaran)
                  </label>
                  <input
                    type="text"
                    value={userAlias}
                    onChange={(e) => setUserAlias(e.target.value)}
                    placeholder="Anonim / Si Manis / Budi"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Big CTA */}
              <button
                onClick={handleStartMatch}
                className="w-full max-w-sm mx-auto py-3.5 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>🚀 Mulai Cari Teman</span>
              </button>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-center pt-2">
                <div className="p-2">
                  <span className="text-base">🔒</span>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">100% Rahasia</p>
                </div>
                <div className="p-2">
                  <span className="text-base">⚡</span>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Bebas Skip</p>
                </div>
                <div className="p-2">
                  <span className="text-base">🛡️</span>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Sensor Sopan</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. STATE: MATCHING (RADAR) */}
          {chatState === "matching" && (
            <div className="my-auto py-16 text-center space-y-6 animate-in fade-in duration-300">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                <div className="relative w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl shadow-lg shadow-primary/40">
                  🔍
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mencari Teman Mengobrol...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Menghubungkanmu dengan mahasiswa USU/Polmed yang sedang online.
                </p>
              </div>

              <button
                onClick={handleCancelMatch}
                className="px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batalkan Pencarian
              </button>
            </div>
          )}

          {/* 3. STATE: CHAT ROOM */}
          {(chatState === "chat" || chatState === "ended") && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
              {/* Chat Room Top Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      👤
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {partnerInfo.alias}
                    </p>
                    <p className="text-[10px] text-slate-500">{partnerInfo.faculty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSkipChat}
                    title="Ganti Lawan Obrolan"
                    className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                  >
                    <span>⏭️ Ganti</span>
                  </button>
                  <button
                    onClick={handleLeaveChat}
                    title="Keluar"
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                  >
                    <Icon.X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[350px] max-h-[50vh]">
                {messages.map((m, idx) => {
                  const isMe = m.sender_id === userId;
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
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
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

              {/* Ended Banner */}
              {chatState === "ended" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 text-center space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    👋 Temanmu telah keluar dari obrolan.
                  </p>
                  <button
                    onClick={handleStartMatch}
                    className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95"
                  >
                    🚀 Cari Teman Baru
                  </button>
                </div>
              )}

              {/* Icebreaker Prompts */}
              {chatState === "chat" && messages.length <= 2 && (
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

              {/* Message Input Box */}
              {chatState === "chat" && (
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
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
          )}
        </div>
      )}

      {/* TAB 2: MARKETPLACE TRANSACTIONS CHAT */}
      {mainTab === "marketplace" && (
        <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
              🛒
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Obrolan Transaksi & Tawar Barang
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Semua penawaran dan tanya jawab dengan penjual dikelola secara otomatis dan aman via Bot WhatsApp kami.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link
                href="/jual-beli"
                className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
              >
                <Icon.Package className="w-4 h-4" />
                Cari Barang di Pasar
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Dashboard Penjual
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
