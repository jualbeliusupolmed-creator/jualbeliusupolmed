"use client";
import { useState, useCallback, useEffect } from "react";

export function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
    >{copied ? "✓" : "Copy"}</button>
  );
}

export function StatusDot({ on }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />;
}

export function Alert({ ok, msg }) {
  if (!msg) return null;
  return (
    <div className={`rounded-lg p-3 text-sm ${ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
      {msg}
    </div>
  );
}

// QR satu perangkat. `perangkat` menentukan endpoint mana yang ditanya: bot utama
// menjawab di /qr, sedangkan nomor cadangan ada di proses lain dan dijangkau lewat
// /perangkat2/qr milik bot utama. Tanpa parameter ini kartu kedua akan menampilkan
// QR perangkat pertama — dua kartu, satu QR, dan yang scan perangkat kedua gagal terus.
export function QRDisplay({ perangkat = 1 }) {
  const endpoint = perangkat === 2 ? "perangkat2/qr" : "qr";
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}&_t=${Date.now()}`);
      setQrData(await res.json());
    } catch (_) { setQrData(null); }
    finally { setQrLoading(false); setCountdown(30); }
  }, [endpoint]);

  useEffect(() => { fetchQr(); }, [fetchQr]);
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { fetchQr(); return 30; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [fetchQr]);

  if (qrLoading) return <p className="text-sm text-amber-600 animate-pulse">⏳ Memuat QR Code...</p>;
  // Bot yang tadinya diam menyiapkan socket baru begitu /qr diminta; QR-nya menyusul
  // beberapa detik lagi lewat polling di atas, jadi ini bukan kegagalan.
  if (!qrData?.qr) return (
    <p className="text-sm text-gray-400">
      {qrData?.menyiapkan ? "⏳ Menyiapkan QR… (±15 detik)" : "QR tidak tersedia."}
    </p>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qrData.qr} alt={`QR perangkat ${perangkat}`} className="w-56 h-56 rounded-xl border-4 border-green-400 shadow-lg" />
      <p className="text-xs text-gray-500 dark:text-slate-400 text-center">WhatsApp → Perangkat Tertaut → Tautkan Perangkat</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Refresh dalam</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{countdown}d</span>
        <button onClick={fetchQr} className="text-xs text-blue-500 hover:underline">Refresh sekarang</button>
      </div>
    </div>
  );
}

// Baris "label — nilai" seperti di dashboard bot. Dipakai kartu ringkasan.
export function KV({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-xs text-gray-500 dark:text-slate-400">{k}</span>
      <span className="text-right text-sm font-semibold dark:text-white">{v}</span>
    </div>
  );
}

// Kartu ringkasan berjudul.
export function Kartu({ judul, children, className = "" }) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="mb-3 text-sm font-bold dark:text-white">{judul}</p>
      {children}
    </div>
  );
}
