"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabKonteks() {
  const { data, loading, error, refetch } = useApi("context");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [clearing, setClearing] = useState(null);
  const [msg, setMsg] = useState(null);

  const entries = (data?.entries || []).filter(e =>
    e.jid.includes(search)
  );

  async function handleClear(jid) {
    if (!confirm(jid ? `Hapus context sesi untuk ${jid}?` : "Hapus SEMUA sesi aktif?")) return;
    setClearing(jid || "all"); setMsg(null);
    const r = await apiDelete("context", jid ? { jid } : {});
    setMsg(r.ok ? { ok: true, text: jid ? "✅ Sesi dihapus." : "✅ Semua sesi dihapus." } : { ok: false, text: "❌ Gagal." });
    if (r.ok) refetch();
    setClearing(null);
  }

  const now = data?.now || Date.now();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Sesi Percakapan Aktif</h2>
        <div className="flex gap-2">
          {(data?.count || 0) > 0 && (
            <button onClick={() => handleClear(null)} disabled={clearing === "all"}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
              {clearing === "all" ? "⏳" : "🗑️ Hapus Semua"}
            </button>
          )}
          <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        💡 Sesi aktif = riwayat percakapan AI per-user (max 5 pesan, expire 30 menit). Berguna untuk debug user yang stuck.
      </div>

      <Alert ok={msg?.ok} msg={msg?.text} />
      {loading && <p className="text-sm text-gray-400">Memuat sesi...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      {data && (
        <>
          <div className="flex items-center gap-3">
            <input className="input max-w-sm" placeholder="Cari JID / nomor..." value={search} onChange={e => setSearch(e.target.value)} />
            <p className="text-xs text-gray-400 whitespace-nowrap">{data.count} sesi aktif</p>
          </div>

          {entries.length === 0 && !loading && <p className="text-sm text-gray-400">Tidak ada sesi aktif.</p>}

          <div className="space-y-2">
            {entries.map(e => {
              const minsAgo = Math.floor((now - e.lastTime) / 60000);
              return (
                <div key={e.jid} className="card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold dark:text-white text-sm">+{e.jid.split("@")[0]}</p>
                      <p className="text-xs text-gray-400">
                        {e.messages} pesan • {minsAgo < 1 ? "baru saja" : `${minsAgo} menit lalu`} • terakhir: <span className="italic">{e.lastRole}</span>
                      </p>
                      {e.lastText && <p className="text-xs text-gray-500 truncate max-w-[300px]">"{e.lastText}"</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setExpanded(expanded === e.jid ? null : e.jid)}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300">
                        {expanded === e.jid ? "▲ Tutup" : "▼ Detail"}
                      </button>
                      <button onClick={() => handleClear(e.jid)} disabled={clearing === e.jid}
                        className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400">
                        {clearing === e.jid ? "⏳" : "🗑️ Reset"}
                      </button>
                    </div>
                  </div>

                  {expanded === e.jid && (
                    <div className="border-t dark:border-slate-700 pt-2 space-y-1">
                      {e.history.map((h, i) => (
                        <div key={i} className={`rounded p-2 text-xs ${h.role === "user" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300" : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300"}`}>
                          <span className="font-bold">{h.role === "user" ? "👤 User" : "🤖 Bot"}:</span> {h.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}