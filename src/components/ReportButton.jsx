"use client";

import { useState } from "react";

import Link from "next/link";

const REASONS = [
  ["penipuan", "🚨 Penipuan / Scam"],
  ["barang_terlarang", "🚫 Barang Terlarang (Vape/Rokok/Alkohol/Obat)"],
  ["sengketa_cod", "⚖️ Sengketa COD / Barang Tidak Sesuai"],
  ["blokir", "⛔ Blokir & Laporkan Pengguna Ini"],
  ["spam", "🔁 Spam / Iklan Ganda"],
  ["lainnya", "📝 Lainnya"],
];

// Tombol "Laporkan iklan" untuk pembeli. Mengirim ke /api/report.
export default function ReportButton({ listing, className = "" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0][0]);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id, reason, detail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengirim laporan");
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 text-center text-xs text-emerald-800 dark:text-emerald-300 ${className}`}>
        <p className="font-bold">✓ Laporan Diterima oleh Moderator</p>
        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
          Tim mediasi akan menindaklanjuti dalam waktu maksimal 1×24 jam. Terima kasih telah menjaga keamanan komunitas.
        </p>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 transition-colors hover:text-rose-600 hover:underline"
        >
          Laporkan iklan atau minta mediasi
        </button>
      ) : (
        <div className="card mt-2 space-y-3 p-4 text-left border-rose-200 dark:border-rose-900/50">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Laporkan Iklan / Sengketa</p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Pilih alasan pelaporan atau kendala transaksi dengan penjual ini.
            </p>
          </div>
          <select
            className="input text-xs"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <textarea
            className="input min-h-16 text-xs"
            placeholder="Jelaskan detail kendala (misal: barang rusak saat COD, penjual tidak datang, indikasi tipuan)..."
            value={detail}
            maxLength={500}
            onChange={(e) => setDetail(e.target.value)}
          />
          {err && <p className="text-xs text-rose-600">{err}</p>}

          {/* Jalur Mediasi Tertulis */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold">⚖️ Jalur Mediasi Resmi Komunitas</p>
            <p className="leading-relaxed">
              Semua laporan ditindaklanjuti oleh tim moderator kampus dalam 1×24 jam. Jika terjadi perselisihan transaksi COD, tim kami siap memfasilitasi musyawarah.
            </p>
            <Link href="/panduan-aman#mediasi" target="_blank" className="font-bold underline text-amber-900 dark:text-amber-200 block pt-0.5">
              Baca Prosedur Mediasi &amp; Titik COD Aman →
            </Link>
          </div>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="btn-primary flex-1 text-xs py-2 bg-rose-600 hover:bg-rose-700"
            >
              {busy ? "Mengirim Laporan…" : "Kirim Laporan"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="btn-outline text-xs py-2"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
