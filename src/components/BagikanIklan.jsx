"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { buildListingShortPath } from "@/lib/listingCode";

/*
 * Satu lembar "Bagikan" untuk satu iklan.
 *
 * Kenapa satu komponen dan bukan tombol-tombol yang ditempel di tiap halaman:
 * teks yang dibagikan penjual ke grup adalah iklan itu sendiri. Kalau tiap
 * halaman menyusun kalimatnya sendiri, iklan yang sama akan beredar dengan tiga
 * bentuk berbeda, dan yang paling jelek yang paling sering dipakai.
 *
 * Isinya cuma hal yang benar-benar bekerja di WhatsApp:
 *
 *   - Kirim ke grup: WhatsApp TIDAK punya tautan "kirim ke grup ini" (JID grup
 *     bukan alamat peramban). Yang ada pemilih chat bawaan (wa.me/?text=) —
 *     teks sudah terisi, tinggal pilih grupnya — plus tautan undangan grup
 *     marketplace dari Pengaturan untuk yang belum bergabung.
 *   - Bagikan ke aplikasi lain: share sheet bawaan HP (navigator.share).
 *     Tidak dipajang di peramban yang tidak punya — tombol mati lebih buruk
 *     daripada tombol yang tidak ada.
 *   - Salin tautan dan salin teks, untuk semua tempat lain.
 */

export default function BagikanIklan({ listing, onClose }) {
  const [grupLink, setGrupLink] = useState(null);
  const [tersalin, setTersalin] = useState("");
  const [bisaNative, setBisaNative] = useState(false);

  useEffect(() => {
    setBisaNative(typeof navigator !== "undefined" && !!navigator.share);
    let batal = false;
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => { if (!batal) setGrupLink(j?.contact?.waGroupLink || null); })
      .catch(() => {});
    return () => { batal = true; };
  }, []);

  useEffect(() => {
    function esc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const asal = typeof window !== "undefined"
    ? window.location.origin
    : "https://www.jualbeliusupolmed.web.id";
  const shortPath = buildListingShortPath(listing.listing_code);
  const url = shortPath ? `${asal}${shortPath}` : `${asal}/produk/${buildSlug(listing.title, listing.id)}`;

  const isRental = listing.type === "sewa";
  const harga = isRental && listing.rental_period
    ? `${rupiah(listing.price)}/${listing.rental_period}`
    : rupiah(listing.price);
  const kondisi = listing.condition === "new" ? " · Baru" : listing.condition === "used" ? " · Bekas" : "";

  const teks =
    `${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}*\n` +
    (listing.listing_code ? `#️⃣ Kode: ${listing.listing_code}\n` : "") +
    `💰 ${harga}${kondisi}\n` +
    (listing.category ? `🏷️ ${listing.category}\n` : "") +
    `\n👉 ${url}\n` +
    `_Jual Beli USU Polmed — COD area kampus_`;

  async function salin(nilai, tanda) {
    try {
      await navigator.clipboard.writeText(nilai);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = nilai;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
    }
    setTersalin(tanda);
    setTimeout(() => setTersalin(""), 1800);
  }

  async function bagikanNative() {
    try {
      await navigator.share({ title: listing.title, text: teks, url });
    } catch (_) {
      // Dibatalkan pengguna — bukan galat, dan tidak perlu dilaporkan.
    }
  }

  const waText = `https://wa.me/?text=${encodeURIComponent(teks)}`;

  const Baris = ({ ikon, judul, sub, ...sisa }) => {
    const isi = (
      <>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg dark:bg-slate-800">
          {ikon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">{judul}</span>
          {sub ? <span className="block text-xs text-gray-500 dark:text-slate-400">{sub}</span> : null}
        </span>
      </>
    );
    const kelas = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800";
    return sisa.href
      ? <a className={kelas} target="_blank" rel="noreferrer" {...sisa}>{isi}</a>
      : <button type="button" className={kelas} {...sisa}>{isi}</button>;
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Bagikan iklan</h2>
            <p className="truncate text-xs text-gray-500 dark:text-slate-400">{listing.title}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <pre className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-slate-800/60 dark:text-slate-300">
{teks}
        </pre>

        <div className="space-y-0.5">
          <Baris
            ikon="👥"
            judul="Kirim ke grup WA"
            sub="Buka WhatsApp, lalu pilih grupnya — teks sudah terisi"
            href={waText}
          />
          {grupLink ? (
            <Baris ikon="🔗" judul="Buka grup marketplace" sub="Belum gabung? Masuk dulu dari sini" href={grupLink} />
          ) : null}
          <Baris ikon="🟢" judul="Bagikan ke WhatsApp" sub="Chat pribadi atau status" href={waText} />
          {bisaNative ? (
            <Baris
              ikon="📤"
              judul="Bagikan ke aplikasi lain"
              sub="Instagram, Telegram, Facebook, dan seterusnya"
              onClick={bagikanNative}
            />
          ) : null}
          <Baris
            ikon="🔗"
            judul={tersalin === "url" ? "Tautan tersalin ✓" : "Salin tautan"}
            sub={url.replace(/^https?:\/\//, "")}
            onClick={() => salin(url, "url")}
          />
          <Baris
            ikon="📋"
            judul={tersalin === "teks" ? "Teks tersalin ✓" : "Salin teks iklan"}
            sub="Untuk ditempel di mana saja"
            onClick={() => salin(teks, "teks")}
          />
        </div>
      </div>
    </div>
  );
}
