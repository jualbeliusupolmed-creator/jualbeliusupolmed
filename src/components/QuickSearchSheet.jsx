"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "./BottomSheet";
import { Icon } from "./Icons";
import { hapticLight } from "@/lib/haptics";
import {
  SKALA_TEKS,
  bacaSkala,
  terapkanSkala,
  bacaTema,
  terapkanTema,
} from "@/lib/tampilan";

const KUNCI_RIWAYAT = "riwayat_cari";
const PINTASAN = [
  { href: "/dicari", label: "Barang Dicari", ikon: "📌" },
  { href: "/favorit", label: "Favorit", ikon: "❤️" },
  { href: "/jasa", label: "Jasa", ikon: "🛠️" },
  { href: "/chat", label: "Obrolan", ikon: "💬" },
];
const TEMA = [
  { id: "terang", label: "Terang" },
  { id: "gelap", label: "Gelap" },
  { id: "sistem", label: "Sistem" },
];

function bacaRiwayat() {
  try {
    const r = JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || "[]");
    return Array.isArray(r) ? r.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export default function QuickSearchSheet({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [riwayat, setRiwayat] = useState([]);
  const [tema, setTema] = useState("sistem");
  const [skala, setSkala] = useState("normal");

  useEffect(() => {
    if (!isOpen) return undefined;
    setRiwayat(bacaRiwayat());
    setTema(bacaTema());
    setSkala(bacaSkala());
    // BottomSheet memindahkan fokus ke tombol tutup lebih dulu; kita ambil
    // alih sesudahnya supaya papan ketik langsung siap dipakai.
    const t = setTimeout(() => inputRef.current?.focus(), 140);
    return () => clearTimeout(t);
  }, [isOpen]);

  const cari = (istilah) => {
    const term = (istilah ?? q).trim();
    if (!term) return;
    try {
      const baru = [term, ...bacaRiwayat().filter((x) => x !== term)].slice(0, 6);
      localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify(baru));
    } catch {}
    hapticLight();
    onClose();
    router.push(`/jual-beli?q=${encodeURIComponent(term)}`);
  };

  const buka = (href) => {
    hapticLight();
    onClose();
    router.push(href);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Cari & Tampilan">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cari();
        }}
        className="relative"
      >
        <Icon.Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          enterKeyHint="search"
          placeholder="Cari barang, jasa, kos…"
          aria-label="Cari barang atau jasa"
          className="w-full rounded-2xl border border-black/[0.08] bg-black/[0.03] py-3.5 pl-11 pr-20 text-[15px] text-[#1d1d1f] outline-none transition-all focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-white dark:focus:bg-[#1c1c1e]"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40"
          disabled={!q.trim()}
        >
          Cari
        </button>
      </form>

      {riwayat.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Pencarian terakhir
          </p>
          <div className="flex flex-wrap gap-2">
            {riwayat.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => cari(r)}
                className="rounded-full border border-black/[0.06] bg-black/[0.03] px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] active:scale-95 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Pintasan
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PINTASAN.map((p) => (
            <button
              key={p.href}
              type="button"
              onClick={() => buka(p.href)}
              className="flex flex-col items-center gap-1 rounded-2xl border border-black/[0.06] bg-black/[0.03] px-2 py-3 text-[11px] font-semibold text-[#1d1d1f] active:scale-95 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white"
            >
              <span className="text-lg leading-none">{p.ikon}</span>
              <span className="truncate max-w-full">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-black/[0.02] p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Mode tampilan
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {TEMA.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  setTema(t.id);
                  terapkanTema(t.id);
                }}
                aria-pressed={tema === t.id}
                className={`rounded-xl px-2 py-2 text-xs font-bold transition-all active:scale-95 ${
                  tema === t.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-[#1d1d1f] dark:bg-white/[0.08] dark:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Ukuran teks
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {SKALA_TEKS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  setSkala(s.id);
                  terapkanSkala(s.id);
                }}
                aria-pressed={skala === s.id}
                className={`rounded-xl px-2 py-2 font-bold transition-all active:scale-95 ${
                  skala === s.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-[#1d1d1f] dark:bg-white/[0.08] dark:text-white"
                }`}
                style={{ fontSize: `${10 * s.nilai + 2}px` }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
