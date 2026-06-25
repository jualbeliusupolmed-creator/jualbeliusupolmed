"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabStatus() {
  const { data, loading, error, refetch } = useApi("status");
  const [restarting, setRestarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleRestart() {
    if (!confirm("Restart bot sekarang?")) return;
    setRestarting(true);
    await apiPost("restart");
    setTimeout(() => { setRestarting(false); refetch(); }, 4000);
  }

  async function handleReset() {
    if (!confirm("HAPUS SESI WA? Bot akan logout dan minta scan QR ulang.")) return;
    setResetting(true);
    const r = await apiPost("reset");
    setMsg(r.ok ? { ok: true, text: "✅ Sesi dihapus. Bot restart, scan QR baru." } : { ok: false, text: "❌ Gagal reset." });
    setTimeout(() => { setResetting(false); refetch(); }, 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Status Koneksi Bot</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      <Alert ok={msg?.ok} msg={msg?.text} />

      {data?.hasQR && (
        <div className="card p-5 border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
          <p className="mb-4 text-center text-sm font-semibold text-amber-700 dark:text-amber-400">📱 Bot belum terhubung — Scan QR Code</p>
          <QRDisplay />
        </div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Koneksi</p>
            <div className="flex items-center gap-2">
              <StatusDot on={data.connected} />
              <span className="font-bold dark:text-white">{data.connected ? "Terhubung ✅" : "Terputus ❌"}</span>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Nomor WA Bot</p>
            <p className="font-bold dark:text-white font-mono">{data.phone ? `+${data.phone}` : "–"}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Terhubung Sejak</p>
            <p className="font-medium dark:text-white text-sm">{data.connectedAt ? new Date(data.connectedAt).toLocaleString("id-ID") : "–"}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Uptime</p>
            <p className="font-bold dark:text-white">
              {data.uptime ? `${Math.floor(data.uptime / 3600)}j ${Math.floor((data.uptime % 3600) / 60)}m ${data.uptime % 60}d` : "–"}
            </p>
          </div>
          <div className="card p-4 sm:col-span-2">
            <p className="text-xs text-gray-400 mb-2">Webhook URL</p>
            <p className="font-mono text-sm dark:text-white break-all">{data.webhookUrl || "–"}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={handleRestart} disabled={restarting} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {restarting ? "⏳ Restarting..." : "🔄 Restart Bot"}
        </button>
        <button onClick={handleReset} disabled={resetting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {resetting ? "⏳ Mereset..." : "🗑️ Reset Sesi (Logout WA)"}
        </button>
      </div>
    </div>
  );
}