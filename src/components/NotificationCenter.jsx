"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushStatus, setPushStatus] = useState("default"); // 'default' | 'granted' | 'denied' | 'unsupported'
  const [pushBusy, setPushBusy] = useState(false);
  const popoverRef = useRef(null);

  // Check push permission status on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("unsupported");
      } else {
        setPushStatus(Notification.permission);
      }
    }
  }, []);

  // Fetch notifications
  const fetchNotifs = async () => {
    setLoading(true);
    try {
      // Gather latest announcements & listings for real-time notifications
      const [resMading, resListings] = await Promise.all([
        fetch("/api/mading?limit=5").then((r) => r.json()).catch(() => ({ posts: [] })),
        fetch("/api/listings/browse?limit=5&sort=newest").then((r) => r.json()).catch(() => ({ listings: [] })),
      ]);

      const madingItems = (resMading.posts || []).map((p) => ({
        id: `mading-${p.id}`,
        type: p.type === "info" ? "info" : "menfess",
        title: p.type === "info" ? (p.title || "Pengumuman Kampus") : "Menfess Baru",
        desc: p.content?.slice(0, 80) + (p.content?.length > 80 ? "…" : ""),
        time: p.created_at,
        url: "/mading",
        icon: p.type === "info" ? "📢" : "💌",
      }));

      const listingItems = (resListings.listings || []).map((l) => ({
        id: `listing-${l.id}`,
        type: "listing",
        title: `Iklan Baru: ${l.title}`,
        desc: `Rp ${(l.price || 0).toLocaleString("id-ID")} • di ${l.campus || "Medan"}`,
        time: l.created_at,
        url: `/produk/${l.slug || l.id}`,
        icon: "🛍️",
      }));

      const staticNotifs = [
        {
          id: "sys-welcome",
          type: "system",
          title: "Selamat datang di Kampusfess!",
          desc: "Marketplace, Menfess & Media Komunitas USU & POLMED.",
          time: new Date().toISOString(),
          url: "/cara-bergabung",
          icon: "🎓",
        }
      ];

      const combined = [...staticNotifs, ...madingItems, ...listingItems]
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
        .slice(0, 15);

      // Check read state from localStorage
      const readIds = JSON.parse(localStorage.getItem("read_notif_ids") || "[]");
      const unread = combined.filter((n) => !readIds.includes(n.id)).length;

      setNotifications(combined);
      setUnreadCount(unread);
    } catch {
      // Fallback silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    hapticLight();
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("read_notif_ids", JSON.stringify(allIds));
    setUnreadCount(0);
    toast.success("Semua notifikasi ditandai dibaca");
  };

  const enablePush = async () => {
    if (pushStatus === "unsupported") {
      toast.error("Browser ini tidak mendukung Web Push Notification.");
      return;
    }
    setPushBusy(true);
    hapticLight();
    try {
      const res = await fetch("/api/push/subscribe");
      if (!res.ok) throw new Error("Gagal mengambil kunci server");
      const { publicKey } = await res.json();

      const perm = await Notification.requestPermission();
      setPushStatus(perm);

      if (perm !== "granted") {
        toast.error("Izin notifikasi tidak diberikan.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });

      hapticSuccess();
      toast.success("🔔 Notifikasi HP berhasil diaktifkan!");
    } catch (e) {
      toast.error("Gagal menyalakan notifikasi: " + (e.message || ""));
    } finally {
      setPushBusy(false);
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

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "mading") return n.type === "info" || n.type === "menfess";
    if (activeFilter === "listing") return n.type === "listing";
    return true;
  });

  const readIds = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("read_notif_ids") || "[]") : [];

  const handleToggleOpen = () => {
    hapticLight();
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      // Tandai semua notifikasi sudah dilihat saat pengguna membuka panel
      const allIds = notifications.map((n) => n.id);
      if (allIds.length > 0) {
        const currentRead = JSON.parse(localStorage.getItem("read_notif_ids") || "[]");
        const merged = Array.from(new Set([...currentRead, ...allIds]));
        localStorage.setItem("read_notif_ids", JSON.stringify(merged));
        setUnreadCount(0);
      }
      fetchNotifs();
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* BELL BUTTON */}
      <button
        onClick={handleToggleOpen}
        aria-label="Pusat Notifikasi"
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
      >
        <Icon.Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION POPOVER / MODAL */}
      {isOpen && (
        <>
          {/* Backdrop on mobile for easy dismissal */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-x-3 top-[58px] mx-auto max-w-[390px] w-auto sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-w-[92vw] sm:mx-0 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
          
          {/* HEADER */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <span className="bg-primary/10 text-primary dark:bg-emerald-950 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-primary dark:text-emerald-400 hover:underline"
              >
                Tandai dibaca
              </button>
            )}
          </div>

          {/* PUSH NOTIF PROMO BANNER (IF NOT GRANTED) */}
          {pushStatus !== "granted" && pushStatus !== "unsupported" && (
            <div className="p-3.5 mx-3 mt-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-teal-500/10 border border-primary/20 flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                  <span>📱</span> Nyalakan Notifikasi HP
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Dapat info instan saat ada barang murah &amp; balasan menfess.
                </p>
              </div>
              <button
                onClick={enablePush}
                disabled={pushBusy}
                className="shrink-0 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-bold shadow-xs active:scale-95 transition-transform disabled:opacity-50"
              >
                {pushBusy ? "..." : "Aktifkan"}
              </button>
            </div>
          )}

          {/* FILTER PILLS */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "all", label: "Semua" },
              { id: "mading", label: "Menfess & Info" },
              { id: "listing", label: "Iklan Pasar" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  hapticLight();
                  setActiveFilter(tab.id);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all ${
                  activeFilter === tab.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* LIST */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 [scrollbar-width:thin]">
            {loading ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Memuat notifikasi…</p>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <span className="text-2xl">📭</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada notifikasi baru</p>
                <p className="text-[10px] text-slate-400">Pemberitahuan terbaru akan muncul di sini.</p>
              </div>
            ) : (
              filteredNotifs.map((item) => {
                const isRead = readIds.includes(item.id);
                return (
                  <Link
                    key={item.id}
                    href={item.url}
                    onClick={() => {
                      hapticLight();
                      const currentRead = JSON.parse(localStorage.getItem("read_notif_ids") || "[]");
                      if (!currentRead.includes(item.id)) {
                        localStorage.setItem("read_notif_ids", JSON.stringify([...currentRead, item.id]));
                        setUnreadCount((c) => Math.max(0, c - 1));
                      }
                      setIsOpen(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative ${
                      !isRead ? "bg-primary/[0.03] dark:bg-emerald-500/[0.03]" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs truncate ${!isRead ? "font-black text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-300"}`}>
                          {item.title}
                        </p>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {timeAgo(item.time)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {item.desc}
                      </p>
                    </div>
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary dark:bg-emerald-400 shrink-0 mt-2" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/mading"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-primary dark:text-emerald-400 hover:underline"
            >
              Lihat Mading &amp; Pengumuman Kampus →
            </Link>
          </div>

          </div>
        </>
      )}
    </div>
  );
}
