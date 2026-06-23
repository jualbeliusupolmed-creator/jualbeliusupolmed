"use client";

import { useEffect, useState } from "react";

// Konversi VAPID public key dari base64url ke Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationButton({ wa }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (_) {}
  }

  async function toggleSubscription() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        // Unsubscribe
        await existing.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa, action: "unsubscribe", subscription: { endpoint: existing.endpoint } }),
        });
        setSubscribed(false);
      } else {
        // Subscribe — ambil VAPID key dari server
        const res = await fetch("/api/push/subscribe");
        if (!res.ok) return alert("Push notification belum dikonfigurasi di server.");
        const { publicKey } = await res.json();

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return alert("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wa, subscription: sub }),
        });
        setSubscribed(true);
      }
    } catch (err) {
      console.error("[push]", err);
      alert("Gagal mengaktifkan notifikasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      onClick={toggleSubscription}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        subscribed
          ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-sky-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {loading ? "..." : subscribed ? "🔔 Notif Aktif" : "🔕 Aktifkan Notif"}
    </button>
  );
}
