"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabStatus() {
  const { data, loading, error, refetch } = useApi("status");
  const [restarting, setRestarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // State untuk Pairing Code
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [requestingPairing, setRequestingPairing] = useState(false);

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
    setPairingCode("");
    setTimeout(() => { setResetting(false); refetch(); }, 4000);
  }

  async function handleRequestPairing() {
    if (!pairingPhone) {
        setMsg({ ok: false, text: "⚠️ Masukkan nomor HP terlebih dahulu." });
        return;
    }
    setRequestingPairing(true);
    setPairingCode("");
    try {
        const r = await apiPost("pairing-code", { phone: pairingPhone });
        if (r.ok && r.code) {
            setPairingCode(r.code);
            setMsg({ ok: true, text: "✅ Kode pairing berhasil didapatkan!" });
        } else {
            setMsg({ ok: false, text: `❌ Gagal: ${r.error || 'Terjadi kesalahan'}` });
        }
    } catch (e) {
        setMsg({ ok: false, text: `❌ Error: ${e.message}` });
    }
    setRequestingPairing(false);
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
          <p className="mb-4 text-center text-sm font-semibold text-amber-700 dark:text-amber-400">📱 Bot belum terhubung — Scan QR Code atau Gunakan Nomor HP</p>
          
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            {/* Opsi 1: QR Code */}
            <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Opsi 1: Scan QR</p>
                <QRDisplay />
            </div>

            <div className="hidden md:block w-px h-32 bg-amber-200 dark:bg-amber-800"></div>

            {/* Opsi 2: Pairing Code */}
            <div className="flex flex-col items-center w-full max-w-xs space-y-3">
                <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Opsi 2: Nomor Telepon</p>
                <input 
                    type="text" 
                    placeholder="Contoh: 62812..." 
                    className="input w-full text-center font-mono"
                    value={pairingPhone}
                    onChange={e => setPairingPhone(e.target.value)}
                    disabled={requestingPairing || !!pairingCode}
                />
                {!pairingCode ? (
                    <button 
                        onClick={handleRequestPairing}
                        disabled={requestingPairing || !pairingPhone}
                        className="btn-primary w-full disabled:opacity-50"
                    >
                        {requestingPairing ? "Meminta..." : "Dapatkan Kode"}
                    </button>
                ) : (
                    <div className="w-full text-center space-y-2">
                        <div className="bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-500 rounded-xl p-3 shadow-inner">
                            <p className="text-2xl font-black tracking-[0.2em] text-gray-800 dark:text-white">
                                {pairingCode}
                            </p>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Masukkan kode ini di notifikasi WhatsApp di HP kamu.
                        </p>
                        <button onClick={() => setPairingCode("")} className="btn-outline w-full text-xs mt-2">
                            Ulangi / Ganti Nomor
                        </button>
                    </div>
                )}
            </div>
          </div>
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