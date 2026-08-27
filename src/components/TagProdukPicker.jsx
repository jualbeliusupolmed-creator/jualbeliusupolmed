"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { hapticLight } from "@/lib/haptics";

// Penulis postingan boleh menempelkan SATU iklan miliknya sendiri. Daftarnya
// diambil dari endpoint dashboard (terkunci sesi), jadi tidak ada cara
// menempelkan dagangan orang lain dari sini — dan server memeriksa ulang.
export default function TagProdukPicker({ value, onChange }) {
  const [iklan, setIklan] = useState([]);
  const [memuat, setMemuat] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const [sudahAmbil, setSudahAmbil] = useState(false);

  useEffect(() => {
    if (!terbuka || sudahAmbil) return;
    const wa = (() => {
      try {
        return localStorage.getItem("seller_wa") || "";
      } catch {
        return "";
      }
    })();
    if (!wa) {
      setSudahAmbil(true);
      return;
    }
    setMemuat(true);
    fetch(`/api/listings?seller_wa=${encodeURIComponent(wa)}`)
      .then((r) => r.json())
      .then((d) => {
        setIklan((d.listings || []).filter((l) => l.status === "active").slice(0, 20));
      })
      .catch(() => {})
      .finally(() => {
        setMemuat(false);
        setSudahAmbil(true);
      });
  }, [terbuka, sudahAmbil]);

  if (value) {
    const gambar =
      value.image_url || (Array.isArray(value.images) ? value.images[0] : null);
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-2.5">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/[0.06]">
          {gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gambar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">📦</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-[#1d1d1f] dark:text-white">
            {value.title}
          </p>
          <p className="text-[11px] font-semibold text-primary dark:text-violet-400">
            {rupiah(value.price)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onChange(null);
          }}
          className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/[0.1] dark:text-slate-200"
        >
          Lepas
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          hapticLight();
          setTerbuka((v) => !v);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-xs font-semibold text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-400"
      >
        🛍️ Tandai produk jualanmu (opsional)
      </button>

      {terbuka && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
          {memuat && <p className="p-2 text-[11px] text-slate-400">Memuat iklanmu…</p>}
          {!memuat && iklan.length === 0 && (
            <p className="p-2 text-[11px] text-slate-400">
              Belum ada iklan aktif. Pasang iklan dulu lewat tombol Buat → Jual Barang.
            </p>
          )}
          {iklan.map((l) => {
            const gambar = l.image_url || (Array.isArray(l.images) ? l.images[0] : null);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  onChange(l);
                  setTerbuka(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-white dark:hover:bg-white/[0.06]"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black/[0.06]">
                  {gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gambar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs">📦</div>
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
                    {l.title}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {rupiah(l.price)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
