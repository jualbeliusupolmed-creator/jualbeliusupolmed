"use client";

import { useEffect, useState } from "react";

/*
 * Ajakan menyalakan notifikasi peramban — untuk SEMUA pengunjung.
 *
 * Sebelum ini satu-satunya cara berlangganan adalah tombol di /dashboard, dan
 * tombol itu hanya muncul kalau sudah punya akun penjual. Jadi orang yang
 * paling ingin tahu ada barang baru — pembeli, yang tidak perlu punya akun
 * untuk membeli — tidak pernah ditawari sama sekali.
 *
 * Aturan mainnya sengaja sopan, karena izin notifikasi cuma bisa diminta
 * SEKALI: kalau ditolak, peramban mengunci jawabannya dan situs tidak punya
 * cara meminta lagi.
 *
 *   - Tidak muncul di kunjungan pertama. Ditahan sampai orangnya sudah membuka
 *     halaman kedua ATAU sudah 25 detik di halaman — cukup untuk tahu situs ini
 *     tentang apa sebelum diminta sesuatu.
 *   - "Nanti" menyembunyikannya 14 hari, bukan selamanya.
 *   - Kalau sudah berlangganan atau izinnya sudah pernah ditolak, ia tidak
 *     pernah muncul lagi. Meminta ulang tidak akan berhasil, cuma mengganggu.
 */

const KUNCI_TUNDA = "notif-prompt-tunda";
const KUNCI_KUNJUNGAN = "notif-prompt-kunjungan";
const TUNDA_MS = 14 * 24 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotifPrompt() {
  const [tampil, setTampil] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    let batal = false;

    async function periksa() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      // Izin yang sudah dijawab — apa pun jawabannya — tidak bisa ditanya lagi.
      if (Notification.permission !== "default") return;

      try {
        const tunda = Number(localStorage.getItem(KUNCI_TUNDA) || 0);
        if (tunda && Date.now() < tunda) return;

        const kunjungan = Number(localStorage.getItem(KUNCI_KUNJUNGAN) || 0) + 1;
        localStorage.setItem(KUNCI_KUNJUNGAN, String(kunjungan));

        // Sudah berlangganan di perangkat ini? Jangan tawari lagi.
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub || batal) return;

        if (kunjungan >= 2) setTampil(true);
        else setTimeout(() => { if (!batal) setTampil(true); }, 25000);
      } catch (_) {
        // localStorage bisa dilarang (mode penyamaran, setelan ketat). Kalau
        // begitu, diam saja — ajakan notifikasi bukan hal yang layak
        // menjatuhkan halaman.
      }
    }

    periksa();
    return () => { batal = true; };
  }, []);

  function nanti() {
    try { localStorage.setItem(KUNCI_TUNDA, String(Date.now() + TUNDA_MS)); } catch (_) {}
    setTampil(false);
  }

  async function aktifkan() {
    setSibuk(true);
    try {
      const res = await fetch("/api/push/subscribe");
      if (!res.ok) { setTampil(false); return; }
      const { publicKey } = await res.json();

      const izin = await Notification.requestPermission();
      if (izin !== "granted") { setTampil(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      // Tanpa `wa`: pengunjung tidak perlu punya akun untuk dikabari.
      const simpan = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!simpan.ok) {
        // Langganannya sudah ada di peramban tapi belum tercatat di server —
        // dilepas lagi supaya tidak ada perangkat yang mengira dirinya
        // berlangganan padahal tidak akan pernah dikirimi apa pun.
        await sub.unsubscribe().catch(() => {});
        setTampil(false);
        return;
      }

      setSelesai(true);
      setTimeout(() => setTampil(false), 2600);
    } catch (_) {
      setTampil(false);
    } finally {
      setSibuk(false);
    }
  }

  if (!tampil) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-5 sm:bottom-5">
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17h5l-1.4-1.4A1 1 0 0118 15v-5a6 6 0 00-5-5.9V4a1 1 0 00-2 0v.1A6 6 0 006 10v5a1 1 0 01-.6.9L4 17h5m6 0a3 3 0 01-6 0" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          {selesai ? (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi aktif ✓</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                Kamu akan dikabari tiap ada barang baru tayang.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Mau dikabari kalau ada barang baru?</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                Notifikasi langsung ke HP kamu tiap ada iklan baru tayang. Tanpa akun, bisa dimatikan kapan saja.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={aktifkan} disabled={sibuk} className="btn-primary px-4 py-2 text-xs">
                  {sibuk ? "Menyalakan…" : "Aktifkan"}
                </button>
                <button onClick={nanti} className="btn-outline px-4 py-2 text-xs">Nanti saja</button>
              </div>
            </>
          )}
        </div>

        <button onClick={nanti} aria-label="Tutup" className="-mr-1 -mt-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
