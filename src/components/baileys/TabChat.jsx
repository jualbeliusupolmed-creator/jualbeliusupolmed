"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabChat() {
  const { data, loading, error, refetch } = useApi("chats");
  const [search, setSearch] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);

  const chats = (data?.chats || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.jid.includes(search)
  );

  async function sendReply() {
    if (!replyTarget || !replyMsg.trim()) return;
    setReplying(true); setReplyStatus(null);
    const num = replyTarget.jid.split("@")[0];
    const r = await apiPost("send", { target: num, message: replyMsg });
    setReplyStatus(r.status ? { ok: true, text: "✅ Terkirim!" } : { ok: false, text: `❌ ${r.reason || r.error}` });
    setReplying(false);
    if (r.status) { setReplyMsg(""); setTimeout(() => { setReplyTarget(null); setReplyStatus(null); }, 1500); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Kontak & Chat Pribadi</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      {replyTarget && (
        <div className="card border-2 border-blue-300 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold dark:text-white">Balas ke: {replyTarget.name || replyTarget.jid.split("@")[0]}</p>
            <button onClick={() => setReplyTarget(null)} className="text-xs text-gray-400 hover:text-red-500">✕ Tutup</button>
          </div>
          <textarea className="input min-h-[80px] resize-y" placeholder="Tulis balasan..." value={replyMsg} onChange={e => setReplyMsg(e.target.value)} />
          <Alert ok={replyStatus?.ok} msg={replyStatus?.text} />
          <button onClick={sendReply} disabled={replying || !replyMsg.trim()} className="btn-primary">
            {replying ? "⏳ Mengirim..." : "🚀 Kirim Balas"}
          </button>
        </div>
      )}

      <input className="input max-w-sm" placeholder="Cari nama atau nomor..." value={search} onChange={e => setSearch(e.target.value)} />
      <p className="text-xs text-gray-400">{chats.length} chat</p>

      <div className="space-y-2">
        {chats.map(c => (
          <div key={c.jid} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold dark:text-white">{c.name || "–"}</p>
              <p className="font-mono text-xs text-gray-400">+{c.jid.split("@")[0]}</p>
              {c.preview && <p className="text-xs text-gray-500 truncate max-w-[240px]">{c.preview}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <CopyBtn text={c.jid.split("@")[0]} />
              <button onClick={() => setReplyTarget(c)} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300">
                💬 Balas
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}