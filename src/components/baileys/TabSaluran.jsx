"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabSaluran() {
  const { data, loading, error, refetch } = useApi("newsletters");
  const [invite, setInvite] = useState("");
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!invite.trim()) return;
    setAdding(true); setAddStatus(null);
    const r = await apiPost("newsletters/add", { invite });
    setAddStatus(r.success ? { ok: true, text: `✅ Saluran "${r.data?.name}" berhasil ditambahkan!` } : { ok: false, text: `❌ ${r.error || "Gagal"}` });
    if (r.success) { setInvite(""); refetch(); }
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Saluran (Newsletter) WA</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      <form onSubmit={handleAdd} className="card p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">Tambah via Link Invite</label>
          <input className="input" placeholder="https://whatsapp.com/channel/..." value={invite} onChange={e => setInvite(e.target.value)} />
        </div>
        <button type="submit" disabled={adding} className="btn-primary shrink-0">{adding ? "⏳" : "➕ Tambah"}</button>
      </form>
      <Alert ok={addStatus?.ok} msg={addStatus?.text} />

      {loading && <p className="text-sm text-gray-400">Memuat saluran...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      {data?.note && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">ℹ️ {data.note}</div>}

      <div className="space-y-2">
        {(data?.newsletters || []).map(n => (
          <div key={n.jid} className="card flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-semibold dark:text-white">{n.name}</p>
              <p className="font-mono text-xs text-gray-400">{n.jid}</p>
              {n.description && <p className="text-xs text-gray-500 mt-1">{n.description}</p>}
              <p className="text-xs text-gray-400 mt-1">{n.subscribers?.toLocaleString("id-ID")} subscriber</p>
            </div>
            <CopyBtn text={n.jid} />
          </div>
        ))}
      </div>
    </div>
  );
}