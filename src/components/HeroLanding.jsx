"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";

/* Hero beranda.

   Ditulis mobile-first secara harfiah: setiap kelas tanpa awalan breakpoint
   berlaku di 360px, dan sm:/lg: hanya menambah. Jadi yang dijamin rapi lebih
   dulu adalah layar kecil — bukan desktop yang dipaksa mengecil.

   Ilustrasi kampus (public/hero-kampus*.webp) muncul dua cara
   yang berbeda, dan itu disengaja. Di layar lebar ia jadi latar di sisi kanan:
   teks cuma memakai sisi kiri, jadi gambarnya boleh utuh dan pekat. Di HP teks
   menutupi seluruh lebar, dan latar yang dipudarkan di belakang huruf cuma jadi
   noda kelabu — di sana gambar yang sama diberi ruangnya sendiri sebagai <img>
   dengan rasio aslinya, jadi gedung dan lambang dua kampus benar-benar
   terbaca.

   Semua dalam WebP dan tiga ukuran: 800px (78 KB) untuk HP, 1200px (147 KB)
   untuk tablet, 1536px (214 KB) untuk latar layar lebar. Peramban memilih
   sendiri lewat srcSet — HP tidak perlu mengunduh berkas 1536px yang tiga kali
   lebih berat dari yang sanggup ia tampilkan. */

const FITUR = [
  { label: ["Aman &", "Terpercaya"], warna: "usu", ikon: "perisai" },
  { label: ["Banyak", "Pilihan"], warna: "polmed", ikon: "kotak" },
  { label: ["Dari Mahasiswa", "Untuk Mahasiswa"], warna: "usu", ikon: "salaman" },
  { label: ["Transaksi", "Cepat"], warna: "polmed", ikon: "petir" },
];

function IkonFitur({ nama, className }) {
  const umum = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  if (nama === "perisai") return <svg {...umum}><path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>;
  if (nama === "kotak") return <svg {...umum}><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" /><path d="M4 7.2l8 4.2 8-4.2M12 21v-9.6" /></svg>;
  if (nama === "salaman") return <svg {...umum}><path d="M7 12l3-3 3 2 3-3 2 2" /><path d="M3 10l4-4 3 2M21 10l-4-4-2 1" /><path d="M7 12l3 3 2-1 2 2 2-2" /></svg>;
  return <svg {...umum}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></svg>;
}

/** Angka statistik. Sengaja hanya menampilkan yang benar-benar ada datanya —
 *  klaim bulat seperti "100% transaksi aman" tidak bisa dibuktikan, dan halaman
 *  yang dinilai juri bukan tempat untuk angka karangan. */
function daftarStatistik(stats, total) {
  return [
    total > 0 && { angka: total, satuan: "+", label: "Iklan Aktif", ikon: "kotak", warna: "usu" },
    stats?.sellers > 0 && { angka: stats.sellers, satuan: "+", label: "Penjual Aktif", ikon: "salaman", warna: "polmed" },
    stats?.sold > 0 && { angka: stats.sold, satuan: "+", label: "Produk Terjual", ikon: "perisai", warna: "usu" },
  ].filter(Boolean);
}

export default function HeroLanding({ q, onSearch, stats, total = 0, judul, subjudul, pwaSiap, onPasangPwa }) {
  const [nilai, setNilai] = useState(q || "");
  const statistik = daftarStatistik(stats, total);

  function kirim(e) {
    e.preventDefault();
    onSearch?.(nilai);
    // Setelah mencari, daftar barangnya ada di bawah lipatan — di HP hero ini
    // memenuhi layar, jadi tanpa digulirkan orang mengira tombolnya tak bekerja.
    document.getElementById("daftar-barang")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="-mx-4 -mt-3 mb-6 lg:mx-0 lg:mt-0">
      <div className="relative isolate overflow-hidden bg-white pb-7 pt-8 sm:pb-9 lg:rounded-[32px] lg:pb-12 lg:pt-14 dark:bg-[#111113] border border-black/[0.04] dark:border-white/[0.05] shadow-[0_2px_40px_rgba(0,0,0,0.04)]">
        {/* Lapis 1 — ilustrasi kampus, hanya sejak lg ke atas. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-20 hidden w-[52%] bg-[url('/hero-kampus.webp')] bg-cover bg-[position:68%_center] opacity-30 lg:block dark:opacity-15"
        />
        {/* Lapis 2 — peredam mendatar supaya judul di kiri tetap terbaca. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-white via-white/95 to-white/30 lg:block dark:from-[#111113] dark:via-[#111113]/95 dark:to-[#111113]/30"
        />

        <div className="mx-auto max-w-6xl px-4">
          <div className="lg:max-w-xl">
            <h1 className="text-[clamp(2rem,8.5vw,2.75rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl lg:text-[3.4rem] dark:text-white">
              {judul ? (
                judul
              ) : (
                <>
                  Jual Beli
                  <br />
                  <span className="text-usu dark:text-emerald-400">Lebih Mudah,</span>
                  <br />
                  Aman &amp; <span className="text-polmed dark:text-violet-400">Terpercaya</span>
                </>
              )}
            </h1>

            <p className="mt-4 text-[15px] font-normal leading-relaxed text-[#6e6e73] sm:text-lg dark:text-slate-300">
              {subjudul || (
                <>
                  Marketplace Resmi Mahasiswa
                  <br className="hidden sm:block" />{" "}
                  <span className="font-bold text-usu dark:text-emerald-400">USU</span>
                  <span className="text-gray-400"> &amp; </span>
                  <span className="font-bold text-polmed dark:text-violet-400">POLMED</span>
                </>
              )}
            </p>

            {/* Pencarian. */}
            <form onSubmit={kirim} role="search" className="mt-6 flex items-center gap-2 rounded-full bg-black/[0.04] p-1.5 transition-shadow focus-within:bg-white focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-within:ring-1 focus-within:ring-black/[0.06] dark:bg-white/[0.06] dark:focus-within:bg-[#1c1c1e] dark:focus-within:ring-white/10">
              <Icon.Search className="ml-3 h-4.5 w-4.5 shrink-0 text-gray-500" />
              <input
                value={nilai}
                onChange={(e) => { setNilai(e.target.value); onSearch?.(e.target.value); }}
                placeholder="Cari barang atau jasa…"
                aria-label="Cari barang"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-[#1d1d1f] outline-none placeholder:text-gray-500 dark:text-white dark:placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-black active:scale-[0.96] dark:bg-white dark:text-[#1d1d1f] shadow-sm"
              >
                Cari
              </button>
            </form>

            {/* Ilustrasi utuh untuk HP & tablet. Ukuran width/height ditulis apa
                adanya supaya peramban menyediakan ruangnya lebih dulu — tanpa itu
                isi di bawahnya melompat begitu gambarnya selesai diunduh. */}
            <img
              src="/hero-kampus-800.webp"
              srcSet="/hero-kampus-800.webp 800w, /hero-kampus-1200.webp 1200w"
              sizes="(min-width: 640px) 608px, 100vw"
              alt="Gedung Universitas Sumatera Utara dan Politeknik Negeri Medan berdampingan dengan lambang kedua kampus"
              width={1200}
              height={800}
              className="mt-6 w-full rounded-[20px] ring-1 ring-black/[0.05] lg:hidden dark:ring-white/10"
            />

            {/* Pemasangan aplikasi. Tampil hanya kalau peramban memang menawarkan
                (Android/Chrome); di iOS acara ini tak pernah ada, jadi menampilkan
                tombol mati di sana cuma bikin bingung. */}
            {pwaSiap && (
              <button
                type="button"
                onClick={onPasangPwa}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-semibold text-[#424245] transition active:scale-[0.98] hover:bg-[#f5f5f7] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Icon.Download className="h-3.5 w-3.5" />
                Pasang aplikasinya
              </button>
            )}

            {/* Empat janji. Dua kolom di HP supaya labelnya tetap terbaca utuh;
                memaksa empat kolom di 360px membuat "Dari Mahasiswa Untuk
                Mahasiswa" pecah jadi lima baris. */}
            <ul className="mt-7 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
              {FITUR.map((f) => (
                <li key={f.label.join(" ")} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${f.warna === "usu" ? "bg-usu-soft text-usu dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-polmed-soft text-polmed dark:bg-violet-950/60 dark:text-violet-400"}`}>
                    <IkonFitur nama={f.ikon} className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-gray-700 sm:text-xs dark:text-slate-300">
                    {f.label[0]}
                    <br />
                    {f.label[1]}
                  </span>
                </li>
              ))}
            </ul>

            {statistik.length > 0 && (
              <dl className="mt-7 grid grid-cols-3 divide-x divide-black/[0.06] rounded-[20px] bg-[#f5f5f7] px-2 py-3.5 sm:px-4 dark:divide-slate-700 dark:bg-slate-800/90">
                {statistik.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5 px-1 sm:flex-row sm:gap-2.5 sm:px-3">
                    <span className={`hidden shrink-0 sm:grid sm:h-9 sm:w-9 sm:place-items-center sm:rounded-full ${s.warna === "usu" ? "bg-usu-soft text-usu dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-polmed-soft text-polmed dark:bg-violet-950/60 dark:text-violet-400"}`}>
                      <IkonFitur nama={s.ikon} className="h-4 w-4" />
                    </span>
                    <div className="text-center sm:text-left">
                      <dd className="text-base font-extrabold leading-none text-gray-900 sm:text-lg dark:text-white">
                        {s.angka.toLocaleString("id-ID")}{s.satuan}
                      </dd>
                      <dt className="mt-1 text-[10px] font-medium leading-tight text-gray-500 sm:text-[11px] dark:text-slate-400">
                        {s.label}
                      </dt>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Pita ajakan. */}
        <div className="mx-auto mt-7 max-w-6xl px-4 lg:mt-10">
          <div className="flex flex-col gap-3 rounded-[24px] bg-gradient-to-r from-[#1d1d1f] to-[#3a3a3c] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 shadow-[0_12px_32px_rgba(0,0,0,0.15)] dark:from-[#2c2c2e] dark:to-[#1c1c1e] dark:border dark:border-white/[0.08]">
            <div className="flex items-start gap-3">
              <IkonFitur nama="perisai" className="mt-0.5 h-6 w-6 shrink-0 text-[#f5f5f7]" />
              <div>
                <p className="text-[15px] font-bold leading-tight sm:text-[17px] tracking-tight">Aman, Nyaman, dan Terpercaya</p>
                <p className="mt-0.5 text-xs leading-snug text-white/70 sm:text-sm">
                  Belanja dengan sesama mahasiswa jadi lebih mudah.
                </p>
              </div>
            </div>
            <Link
              href="#daftar-barang"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#1d1d1f] transition active:scale-[0.96] hover:bg-gray-100 sm:shrink-0 dark:bg-white dark:text-[#1d1d1f] shadow-sm"
            >
              Mulai Belanja
              <Icon.ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
