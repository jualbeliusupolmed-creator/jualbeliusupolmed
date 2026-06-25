"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabLidMap() {
  const { data, loading, error, refetch } = useApi("lid-map");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState(null);

  const entries = (data?.entries || []).filter(e =>
    e.lid.includes(search) || e.phone.includes(search)
  );

  async function handleDelete(lid) {
    if (!confirm(`Hapus mapping ${lid}?`)) return;
    setDeleting(lid); setMsg(null);
    const r = await apiDelete("lid-map", { lid });
    setMsg(r.ok ? { ok: true, text: "✅ Entri dihapus." } : { ok: false, text: "❌ Gagal menghapus." });
    if (r.ok) refetch();
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">LID Resolution Map</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        💡 LID Map menyimpan mapping antara format WA baru (<code>@lid</code>) ke nomor HP asli. Hapus entri yang salah mapping saja — entri yang benar jangan dihapus.
      </div>

      <Alert ok={msg?.ok} msg={msg?.text} />
      {loading && <p className="text-sm text-gray-400">Memuat LID Map...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      {data && (
        <>
          <div className="flex items-center gap-3">
            <input className="input max-w-sm" placeholder="Cari LID atau nomor HP..." value={search} onChange={e => setSearch(e.target.value)} />
            <p className="text-xs text-gray-400 whitespace-nowrap">{data.count} entri total</p>
          </div>

          {entries.length === 0 && !loading && <p className="text-sm text-gray-400">Tidak ada entri yang cocok.</p>}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                <tr>
                  <th className="p-3">LID (@lid)</th>
                  <th className="p-3">Nomor HP Resolved</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="dark:text-slate-300">
                {entries.map(e => (
                  <tr key={e.lid} className="border-t dark:border-slate-800">
                    <td className="p-3 font-mono text-xs text-gray-500">{e.lid}</td>
                    <td className="p-3 font-mono font-medium">
                      +{e.phone.split("@")[0]}
                      <CopyBtn text={e.phone.split("@")[0]} />
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(e.lid)} disabled={deleting === e.lid}
                        className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 disabled:opacity-50">
                        {deleting === e.lid ? "⏳" : "🗑️ Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}