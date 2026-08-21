"use client";
import { useState, useCallback, useEffect } from "react";
import { useApi, apiPost } from "./api";
import { StatusDot, Alert } from "./ui";
import { KartuTaut } from "./KartuTaut";

// Status perangkat kedua. Sengaja tidak lewat useApi: kalau bot kedua mati atau
// belum dikonfigurasi, bot utama menjawab 502/503 — dan justru DI DALAM body itulah
// keterangan yang paling dibutuhkan (`adaBot2`, `hidup`). useApi membuang body
// non-2xx dan hanya menyisakan pesan error, jadi kartunya tidak bisa membedakan
// "bot kedua belum dipasang" dari "bot kedua sedang mati".
function usePerangkat2() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=perangkat2/status&_t=${Date.now()}`);
      setData(await res.json().catch(() => ({})));
    } catch (e) {
      setData({ error: e.message, hidup: false });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}

export function TabStatus() {
  const { data, loading, error, refetch } = useApi("status");
  const { data: data2, refetch: refetch2 } = usePerangkat2();
  const [restarting, setRestarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null);

  const segarkan = useCallback(() => { refetch(); refetch2(); }, [refetch, refetch2]);

  // Selama masih ada perangkat yang belum tertaut, keadaan di halaman ini berubah
  // sendiri di sisi bot (QR muncul, pairing berhasil). Tanpa polling, orang yang
  // baru saja scan tetap melihat layar "belum terhubung" sampai menekan Refresh.
  const adaYangBelumTertaut = (data && !data.connected) || (data2 && data2.adaBot2 !== false && !data2.connected);
  useEffect(() => {
    if (!adaYangBelumTertaut) return;
    const t = setInterval(segarkan, 15000);
    return () => clearInterval(t);
  }, [adaYangBelumTertaut, segarkan]);

  async function handleRestart() {
    if (!confirm("Restart bot sekarang?")) return;
    setRestarting(true);
    await apiPost("restart");
    setTimeout(() => { setRestarting(false); segarkan(); }, 4000);
  }

  async function handleReset() {
    if (!confirm("HAPUS SESI WA? Bot akan logout dan minta scan QR ulang.")) return;
    setResetting(true);
    const r = await apiPost("reset");
    setMsg(r.ok ? { ok: true, text: "✅ Sesi dihapus. Bot restart, scan QR baru." } : { ok: false, text: "❌ Gagal reset." });
    setTimeout(() => { setResetting(false); segarkan(); }, 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Status Koneksi Bot</h2>
        <button onClick={segarkan} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      <Alert ok={msg?.ok} msg={msg?.text} />

      {/* Dua perangkat, dua kartu. Yang kedua menghilang sendiri kalau bot kedua
          memang belum dikonfigurasi di server (BOT2_TOKEN kosong). */}
      {data && <KartuTaut perangkat={1} status={data} onRefresh={segarkan} />}
      {data2 && data2.adaBot2 !== false && <KartuTaut perangkat={2} status={data2} onRefresh={segarkan} />}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Koneksi (perangkat 1)</p>
            <div className="flex items-center gap-2">
              <StatusDot on={data.connected} />
              <span className="font-bold dark:text-white">{data.connected ? "Terhubung ✅" : "Terputus ❌"}</span>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Nomor WA Bot</p>
            <p className="font-bold dark:text-white font-mono">{data.phone ? `+${data.phone}` : "–"}</p>
          </div>
          {data2 && data2.adaBot2 !== false && (
            <>
              <div className="card p-4">
                <p className="text-xs text-gray-400 mb-2">Koneksi (perangkat 2)</p>
                <div className="flex items-center gap-2">
                  <StatusDot on={!!data2.connected} />
                  <span className="font-bold dark:text-white">
                    {data2.hidup === false ? "Tidak berjalan ⛔" : data2.connected ? "Terhubung ✅" : "Terputus ❌"}
                  </span>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-400 mb-2">Nomor WA Cadangan</p>
                <p className="font-bold dark:text-white font-mono">{data2.phone ? `+${data2.phone}` : "–"}</p>
              </div>
            </>
          )}
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
      <p className="text-xs text-gray-400">
        Tombol Restart & Reset di atas hanya mengenai perangkat 1. Perangkat 2 diurus dari server.
      </p>
    </div>
  );
}
