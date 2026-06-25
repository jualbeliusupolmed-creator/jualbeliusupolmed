"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabLog() {
  const { data, loading, error, refetch } = useApi("logs");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refetch, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, refetch]);

  const logs = (data?.logs || []).filter(l => {
    const matchSearch = !search || l.sender.includes(search) || l.preview?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || l.type === typeFilter;
    return matchSearch && matchType;
  });

  async function sendReply() {
    if (!replyTarget || !replyMsg.trim()) return;
    setReplying(true); setReplyStatus(null);
    const num = replyTarget.split("@")[0];
    const r = await apiPost("send", { target: num, message: replyMsg });
    setReplyStatus(r.status ? { ok: true, text: "✅ Terkirim!" } : { ok: false, text: `❌ ${r.reason || r.error}` });
    setReplying(false);
    if (r.status) { setReplyMsg(""); setTimeout(() => { setReplyTarget(null); setReplyStatus(null); }, 1500); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Log Pesan Masuk</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-green-500" />
            <span className="text-xs text-gray-500 dark:text-slate-400">Auto (5d)</span>
          </label>
          <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
        </div>
      </div>

      {replyTarget && (
        <div className="card border-2 border-blue-300 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold dark:text-white">Balas ke: +{replyTarget.split("@")[0]}</p>
            <button onClick={() => setReplyTarget(null)} className="text-xs text-gray-400 hover:text-red-500">✕ Tutup</button>
          </div>
          <textarea className="input min-h-[80px] resize-y" placeholder="Tulis balasan..." value={replyMsg} onChange={e => setReplyMsg(e.target.value)} />
          <Alert ok={replyStatus?.ok} msg={replyStatus?.text} />
          <button onClick={sendReply} disabled={replying || !replyMsg.trim()} className="btn-primary">
            {replying ? "⏳ Mengirim..." : "🚀 Kirim Balas"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari nomor / pesan..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Semua tipe</option>
          <option value="conversation">💬 Teks</option>
          <option value="imageMessage">📷 Foto</option>
          <option value="extendedTextMessage">📝 Extended</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat log...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      <p className="text-xs text-gray-400">{logs.length} dari {(data?.logs || []).length} log</p>

      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Pengirim</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Preview</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="dark:text-slate-300">
              {logs.map((l, i) => (
                <tr key={i} className={`border-t dark:border-slate-800 ${replyTarget === l.sender ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(l.time).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" })}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    +{l.sender.split("@")[0]}
                    <CopyBtn text={l.sender.split("@")[0]} />
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.type === "imageMessage" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {l.type === "imageMessage" ? "📷 Foto" : "💬 Teks"}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate p-3 text-gray-600 dark:text-slate-400">{l.preview}</td>
                  <td className="p-3">
                    <button onClick={() => { setReplyTarget(l.sender); setReplyMsg(""); setReplyStatus(null); }}
                      className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 whitespace-nowrap">
                      💬 Balas
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}