"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";

/*
 * Katalog satu toko: pencarian + saringan kategori, dikerjakan di peramban.
 *
 * Kenapa di peramban dan bukan lewat server: seluruh isi toko sudah ikut
 * terkirim bersama halamannya (satu penjual, bukan seluruh marketplace), jadi
 * menyaringnya di sini instan dan tidak menambah satu pun permintaan. Kalau
 * suatu hari ada toko dengan ratusan barang, saringannya yang pindah ke server,
 * bukan halamannya yang dipecah.
 *
 * Chip kategori hanya muncul kalau tokonya memang punya lebih dari satu
 * kategori — saringan dengan satu pilihan cuma perabot yang tidak menyaring apa
 * pun.
 */
export default function TokoKatalog({ listings, warna }) {
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState("Semua");

  const kategoriAda = useMemo(() => {
    const set = new Set(listings.map((l) => l.category).filter(Boolean));
    return set.size > 1 ? ["Semua", ...[...set].sort()] : [];
  }, [listings]);

  const tampil = useMemo(() => {
    const s = q.trim().toLowerCase();
    return listings.filter((l) => {
      if (kategori !== "Semua" && l.category !== kategori) return false;
      if (!s) return true;
      return (
        l.title?.toLowerCase().includes(s) ||
        l.description?.toLowerCase().includes(s) ||
        l.category?.toLowerCase().includes(s)
      );
    });
  }, [listings, q, kategori]);

  const pakaiCari = listings.length >= 6;

  return (
    <>
      {(pakaiCari || kategoriAda.length > 0) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {pakaiCari && (
            <div className="relative sm:w-64">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              >
                <path d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari di toko ini…"
                aria-label="Cari barang di toko ini"
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gray-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          )}

          {kategoriAda.length > 0 && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {kategoriAda.map((k) => {
                const aktif = kategori === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKategori(k)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      aktif
                        ? "border-transparent text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                    style={aktif ? { background: warna.utama } : undefined}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tampil.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
          Tidak ada barang yang cocok dengan pencarianmu.
          <button
            onClick={() => { setQ(""); setKategori("Semua"); }}
            className="ml-1 font-semibold underline"
            style={{ color: warna.utama }}
          >
            Tampilkan semua
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tampil.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </>
  );
}
