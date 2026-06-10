"use client";

import { useState } from "react";

const REASONS = [
  ["penipuan", "Penipuan / scam"],
  ["barang_terlarang", "Barang terlarang"],
  ["spam", "Spam / iklan ganda"],
  ["salah_kategori", "Salah kategori"],
  ["lainnya", "Lainnya"],
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
      <p className={`text-center text-xs text-gray-400 ${className}`}>
        ✅ Laporan terkirim. Terima kasih sudah menjaga komunitas.
      </p>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 transition-colors hover:text-rose-600 hover:underline"
        >
          🚩 Laporkan iklan ini
        </button>
      ) : (
        <div className="card mt-2 space-y-2 p-3 text-left">
          <p className="text-sm font-semibold">Laporkan iklan</p>
          <select
            className="input"
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
            className="input min-h-16"
            placeholder="Detail (opsional)…"
            value={detail}
            maxLength={500}
            onChange={(e) => setDetail(e.target.value)}
          />
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="btn-primary flex-1 text-sm"
            >
              {busy ? "Mengirim…" : "Kirim laporan"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="btn-outline text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
