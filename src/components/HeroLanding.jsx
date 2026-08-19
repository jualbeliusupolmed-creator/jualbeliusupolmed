"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";

/* Hero beranda.

   Ditulis mobile-first secara harfiah: setiap kelas tanpa awalan breakpoint
   berlaku di 360px, dan sm:/lg: hanya menambah. Jadi yang dijamin rapi lebih
   dulu adalah layar kecil — bukan desktop yang dipaksa mengecil.

   Latar kampus (public/hero-kampus.jpg) dipasang sebagai background-image,
   bukan <img>. Alasannya: kalau berkasnya hilang, background yang gagal dimuat
   tidak meninggalkan ikon gambar rusak — pembaca cuma melihat gradien langit,
   dan halaman tetap utuh. Berkasnya potongan sisi kanan mockup desain (gedung
   USU & Polmed), 1200px lebar, ~190 KB: cukup tajam di layar HP tanpa jadi
   beban unduh di jaringan kampus. */

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
      <div className="relative isolate overflow-hidden bg-[#fdf8f5] pb-6 pt-7 sm:pb-8 lg:rounded-3xl lg:pb-10 lg:pt-12 dark:bg-slate-900">
        {/* Lapis 1 — foto kampus (opsional, lihat catatan di atas) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[url('/hero-kampus.jpg')] bg-cover bg-[position:72%_center] opacity-[0.55] sm:opacity-70 lg:bg-[position:60%_center] dark:opacity-25"
        />
        {/* Lapis 2 — langit + peredam. Di HP teks menumpuk penuh di atas gambar,
            jadi peredamnya vertikal dan pekat; di layar lebar teks hanya memakai
            sisi kiri, jadi peredamnya berubah jadi mendatar. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white/85 to-white/60 sm:from-white/95 sm:via-white/70 lg:bg-gradient-to-r lg:from-white lg:via-white/85 lg:to-transparent dark:from-slate-900 dark:via-slate-900/85 dark:to-slate-900/40"
        />

        <div className="mx-auto max-w-6xl px-4">
          <div className="lg:max-w-xl">
            <h1 className="text-[clamp(1.9rem,8.5vw,2.6rem)] font-extrabold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
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

            <p className="mt-3 text-[15px] font-medium leading-snug text-gray-600 sm:text-lg dark:text-slate-300">
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

            {/* Pencarian. Tombolnya tetap berlabel "Cari" walau sempit — ikon
                kaca pembesar sendirian sering dikira tombol filter. */}
            <form onSubmit={kirim} role="search" className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
              <Icon.Search className="ml-2.5 h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={nilai}
                onChange={(e) => { setNilai(e.target.value); onSearch?.(e.target.value); }}
                placeholder="Cari barang, kategori, atau toko…"
                aria-label="Cari barang"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-usu px-5 py-2.5 text-sm font-bold text-white transition active:scale-95 hover:bg-usu-dark"
              >
                Cari
              </button>
            </form>

            {/* Pemasangan aplikasi. Tampil hanya kalau peramban memang menawarkan
                (Android/Chrome); di iOS acara ini tak pernah ada, jadi menampilkan
                tombol mati di sana cuma bikin bingung. */}
            {pwaSiap && (
              <button
                type="button"
                onClick={onPasangPwa}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-gray-600 transition active:scale-95 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
              >
                <Icon.Download className="h-3.5 w-3.5" />
                Pasang aplikasinya
              </button>
            )}

            {/* Empat janji. Dua kolom di HP supaya labelnya tetap terbaca utuh;
                memaksa empat kolom di 360px membuat "Dari Mahasiswa Untuk
                Mahasiswa" pecah jadi lima baris. */}
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
              {FITUR.map((f) => (
                <li key={f.label.join(" ")} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  <span className={`grid h-11 w-11 place-items-center rounded-full ${f.warna === "usu" ? "bg-usu-soft text-usu dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-polmed-soft text-polmed dark:bg-violet-950/60 dark:text-violet-400"}`}>
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
              <dl className="mt-6 grid grid-cols-3 divide-x divide-gray-200/70 rounded-2xl bg-white/90 px-2 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur sm:px-4 dark:divide-slate-700 dark:bg-slate-800/90 dark:ring-white/10">
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

        {/* Pita ajakan. Di HP menumpuk (teks lalu tombol selebar layar) karena
            tombol sempit di samping teks panjang adalah sasaran jempol yang buruk. */}
        <div className="mx-auto mt-7 max-w-6xl px-4 lg:mt-10">
          <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-polmed to-usu px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <IkonFitur nama="perisai" className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight sm:text-base">Aman, Nyaman, dan Terpercaya</p>
                <p className="mt-0.5 text-xs leading-snug text-white/85 sm:text-sm">
                  Belanja dengan sesama mahasiswa jadi lebih mudah.
                </p>
              </div>
            </div>
            <Link
              href="#daftar-barang"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-gray-900 transition active:scale-95 hover:bg-gray-100 sm:shrink-0"
            >
              Mulai Belanja Sekarang
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
