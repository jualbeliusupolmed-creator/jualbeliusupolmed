"use client";

import { useState } from "react";

/*
 * Tombol bagikan halaman toko.
 *
 * Dulu isinya `alert("Link profil disalin!")` — kotak sistem yang menghentikan
 * seluruh halaman, terlihat seperti galat, dan di iOS memunculkan nama domain
 * di judulnya. Sekarang tombolnya menjawab pada dirinya sendiri, dan di ponsel
 * ia memakai lembar bagikan bawaan supaya penjual bisa langsung memilih
 * WhatsApp, Instagram, atau apa pun yang ada di HP-nya.
 */
export default function ShareProfileButton({ nama = "", warna }) {
  const [tersalin, setTersalin] = useState(false);

  async function bagikan() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const teks = nama ? `Mampir ke toko ${nama} ya 🙏\n${url}` : url;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: nama || "Toko", text: teks, url });
        return;
      } catch (_) {
        // Dibatalkan pengguna — bukan galat, dan tidak perlu dilaporkan.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={bagikan}
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      style={tersalin && warna ? { color: warna.utama, borderColor: warna.utama } : undefined}
    >
      {tersalin ? (
        <>✓ Tersalin</>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 3v13M8 7l4-4 4 4" />
          </svg>
          Bagikan
        </>
      )}
    </button>
  );
}
