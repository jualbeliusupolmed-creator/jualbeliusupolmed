"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabBlocklist() {
  const { data, loading, error, refetch } = useApi("blocklist");
  const [blockInput, setBlockInput] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleBlock(e) {
    e.preventDefault();
    if (!blockInput.trim()) return;
    setBlocking(true); setMsg(null);
    const jid = normalizeJid(blockInput.trim());
    const r = await apiPost("blocklist/block", { jid });
    setMsg(r.ok ? { ok: true, text: `✅ ${jid.split("@")[0]} berhasil diblokir.` } : { ok: false, text: `❌ ${r.error}` });
    if (r.ok) { setBlockInput(""); refetch(); }
    setBlocking(false);
  }

  async function handleUnblock(jid) {
    if (!confirm(`Unblock ${jid}?`)) return;
    const r = await apiPost("blocklist/unblock", { jid });
    setMsg(r.ok ? { ok: true, text: `✅ ${jid.split("@")[0]} berhasil di-unblock.` } : { ok: false, text: `❌ ${r.error}` });
    if (r.ok) refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Daftar Blokir WA Bot</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      <form onSubmit={handleBlock} className="card p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">Blokir Nomor Baru</label>
          <input className="input" placeholder="08xxxxxxxxxx atau 628xxxxxxxxxx" value={blockInput} onChange={e => setBlockInput(e.target.value)} />
        </div>
        <button type="submit" disabled={blocking} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 shrink-0">
          {blocking ? "⏳" : "🚫 Blokir"}
        </button>
      </form>
      <Alert ok={msg?.ok} msg={msg?.text} />

      {loading && <p className="text-sm text-gray-400">Memuat blocklist...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      {data && (
        <>
          <p className="text-xs text-gray-400">{(data.blocklist || []).length} nomor diblokir</p>
          {(data.blocklist || []).length === 0 && <p className="text-sm text-gray-400">Tidak ada nomor yang diblokir.</p>}
          <div className="space-y-2">
            {(data.blocklist || []).map(jid => (
              <div key={jid} className="card flex items-center justify-between p-3">
                <p className="font-mono text-sm dark:text-white">+{jid.split("@")[0]}</p>
                <div className="flex gap-2">
                  <CopyBtn text={jid.split("@")[0]} />
                  <button onClick={() => handleUnblock(jid)} className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300">
                    ✅ Unblock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}