"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function waktu(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatRupiah(num) {
  if (!num && num !== 0) return "";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `Rp${num}`;
  }
}

function formatWa(wa) {
  if (!wa) return "";
  const s = String(wa).trim();
  if (s.startsWith("62")) return "0" + s.slice(2);
  return s;
}

export default function AdminObrolanList({
  rooms = [],
  messagesByRoom = {},
  waMap = {},
  profileMap = {},
  listingMap = {},
  searchQuery = "",
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCloseRoom(room) {
    if (!confirm(`Tutup dan akhiri percakapan room ini sekarang?`)) return;

    setBusyId(room.id);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close_chat_room",
          id: room.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menutup obrolan");
      showToast("Room percakapan berhasil ditutup!");
      router.refresh();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-3 text-xs font-bold shadow-lg transition-all animate-bounce ${
            toast.isError
              ? "bg-rose-600 text-white"
              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {rooms.length ? (
        <div className="space-y-4">
          {rooms.map((room) => {
            const roomMessages = messagesByRoom[room.id] || [];
            const wa1 = room.user1_id ? waMap[room.user1_id] || room.user1_id : null;
            const wa2 = room.user2_id ? waMap[room.user2_id] || room.user2_id : null;
            const prof1 = wa1 ? profileMap[wa1] : null;
            const prof2 = wa2 ? profileMap[wa2] : null;
            const listing = room.listing_id ? listingMap[room.listing_id] : null;
            const isMarketplace = room.type === "marketplace";
            const isDirect = room.type === "direct";
            const isBusy = busyId === room.id;

            return (
              <article
                key={room.id}
                className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
              >
                {/* HEADER */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* TYPE BADGE */}
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isDirect
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : isMarketplace
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                        }`}
                      >
                        {isDirect ? "💬 DM Pribadi" : isMarketplace ? "🛒 Marketplace" : "🎭 Cari Teman"}
                      </span>

                      {/* Participant 1 */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isMarketplace ? "🛍️ Pembeli:" : isDirect ? "👤 Pengguna 1:" : "👤:"}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {prof1?.name || room.user1_alias || "Anonim"}
                        </span>
                        {room.user1_faculty && room.user1_faculty !== "Umum" && (
                          <span className="text-[10px] text-slate-400">({room.user1_faculty})</span>
                        )}
                        {wa1 && (
                          <>
                            <Link
                              href={`/admin/penjual/${encodeURIComponent(wa1)}`}
                              className="ml-1 text-[10px] font-bold text-primary dark:text-emerald-400 hover:underline"
                            >
                              Profil ({formatWa(wa1)}) ↗
                            </Link>
                            <a
                              href={`https://wa.me/${wa1.replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              💬 WA
                            </a>
                          </>
                        )}
                      </div>

                      <span className="text-slate-400 font-bold">↔</span>

                      {/* Participant 2 */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isMarketplace ? "🏪 Penjual:" : isDirect ? "👤 Pengguna 2:" : "👤:"}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {prof2?.name || room.user2_alias || "Menunggu"}
                        </span>
                        {room.user2_faculty && room.user2_faculty !== "Umum" && (
                          <span className="text-[10px] text-slate-400">({room.user2_faculty})</span>
                        )}
                        {wa2 && (
                          <>
                            <Link
                              href={`/admin/penjual/${encodeURIComponent(wa2)}`}
                              className="ml-1 text-[10px] font-bold text-primary dark:text-emerald-400 hover:underline"
                            >
                              Profil ({formatWa(wa2)}) ↗
                            </Link>
                            <a
                              href={`https://wa.me/${wa2.replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              💬 WA
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* MARKETPLACE LISTING DETAIL */}
                    {listing && (
                      <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-fit">
                        <span className="text-slate-400 text-[11px]">Barang:</span>
                        <Link
                          href={`/barang/${listing.slug || listing.id}`}
                          target="_blank"
                          className="font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-1"
                        >
                          <span>{listing.title}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">({formatRupiah(listing.price)})</span>
                          <span className="text-[10px] text-slate-400">↗</span>
                        </Link>
                        {listing.is_sold && (
                          <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[9px] px-1.5 py-0.5 rounded font-black">
                            TERJUAL
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400">
                      ID Room: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px]">{room.id.slice(0, 8)}</code> • Dibuat {waktu(room.created_at)} • {roomMessages.length} pesan tercatat
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        room.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : room.status === "waiting"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {room.status === "active" ? "● Aktif Mengobrol" : room.status === "waiting" ? "⏳ Menunggu Lawan" : "✓ Selesai"}
                    </span>

                    {room.status !== "closed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleCloseRoom(room)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-all disabled:opacity-50"
                        title="Tutup paksa obrolan"
                      >
                        🛑 Tutup Room
                      </button>
                    )}
                  </div>
                </header>

                {/* MESSAGES THREAD */}
                <div className="max-h-80 space-y-2 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-900/30">
                  {roomMessages.length ? (
                    roomMessages.map((message) => {
                      const isUser1 = message.sender_id === room.user1_id;
                      const senderWa = message.sender_id ? waMap[message.sender_id] || (isMarketplace ? message.sender_id : null) : null;
                      const senderProf = senderWa ? profileMap[senderWa] : null;

                      const labelPengirim = isMarketplace
                        ? isUser1 ? "🛍️ Pembeli" : "🏪 Penjual"
                        : isUser1 ? "👤 Peserta 1" : "👤 Peserta 2";

                      return (
                        <div
                          key={message.id}
                          className={`rounded-2xl p-3 border text-xs ${
                            isUser1
                              ? "bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80"
                              : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                            <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200">
                              <span className={isUser1 ? "text-blue-600 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-400"}>
                                {labelPengirim}:
                              </span>
                              <span>{senderProf?.name || message.sender_alias}</span>
                              {senderWa && (
                                <Link
                                  href={`/admin/penjual/${encodeURIComponent(senderWa)}`}
                                  className="font-bold text-[10px] text-primary dark:text-emerald-400 hover:underline"
                                >
                                  ({formatWa(senderWa)})
                                </Link>
                              )}
                            </div>
                            <time className="shrink-0 text-[10px] text-slate-400">{waktu(message.created_at)}</time>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 leading-relaxed text-xs pl-0.5">
                            {message.message}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">Belum ada percakapan terkirim di room ini.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500 dark:border-slate-700">
          {searchQuery ? `Tidak ada percakapan yang cocok dengan pencarian "${searchQuery}".` : "Belum ada percakapan tercatat."}
        </div>
      )}
    </div>
  );
}
