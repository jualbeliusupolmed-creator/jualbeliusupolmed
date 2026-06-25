"use client";

import { useEffect, useState, useCallback } from "react";

const TABS = ["status", "chat", "grup", "saluran", "kirim", "log"];
const TAB_LABELS = {
  status: "🔌 Status Bot",
  chat: "💬 Kontak & Chat",
  grup: "👥 Grup",
  saluran: "📢 Saluran",
  kirim: "✉️ Kirim Pesan",
  log: "📜 Log Pesan",
};

function useApi(endpoint, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { if (autoFetch) fetch_(); }, [fetch_, autoFetch]);

  return { data, loading, error, refetch: fetch_ };
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function StatusDot({ on }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
  );
}

// ── QR Code display dengan auto-refresh ──────────────────────────────────────
function QRDisplay() {
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/admin/baileys?endpoint=qr");
      const json = await res.json();
      setQrData(json);
    } catch (_) {
      setQrData(null);
    } finally {
      setQrLoading(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    fetchQr();
  }, [fetchQr]);

  // Countdown + auto-refresh tiap 30 detik (QR WA expire ~60 detik)
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchQr(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchQr]);

  if (qrLoading) return <p className="text-sm text-amber-600 animate-pulse">⏳ Memuat QR Code...</p>;
  if (!qrData?.qr) return <p className="text-sm text-gray-400">QR tidak tersedia (bot mungkin sedang reconnect).</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qrData.qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl border-4 border-green-400 shadow-lg" />
      <p className="text-xs text-gray-500 dark:text-slate-400">Scan dengan WhatsApp → Perangkat Tertaut → Tautkan Perangkat</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Refresh otomatis dalam</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{countdown}d</span>
        <button onClick={fetchQr} className="text-xs text-blue-500 hover:underline">Refresh sekarang</button>
      </div>
    </div>
  );
}

// ── Tab: Status ───────────────────────────────────────────────────────────────
function TabStatus() {
  const { data, loading, error, refetch } = useApi("status");
  const [restarting, setRestarting] = useState(false);

  async function handleRestart() {
    if (!confirm("Restart bot Baileys sekarang?")) return;
    setRestarting(true);
    await fetch("/api/admin/baileys?endpoint=restart", { method: "POST" });
    setTimeout(() => { setRestarting(false); refetch(); }, 3000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Status Koneksi Bot</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat status...</p>}
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">⚠️ {error}</div>}

      {/* QR Code — muncul saat bot belum terhubung */}
      {data?.hasQR && (
        <div className="card p-5 border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
          <p className="mb-4 text-center text-sm font-semibold text-amber-700 dark:text-amber-400">
            📱 Bot belum terhubung — Scan QR Code berikut
          </p>
          <QRDisplay />
        </div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Koneksi</p>
            <div className="flex items-center gap-2">
              <StatusDot on={data.connected} />
              <span className="font-bold dark:text-white">{data.connected ? "Terhubung" : "Terputus"}</span>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Nomor WA Bot</p>
            <p className="font-bold dark:text-white font-mono">{data.phone ? `+${data.phone}` : "–"}</p>
          </div>

          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">Terhubung Sejak</p>
            <p className="font-medium dark:text-white text-sm">
              {data.connectedAt ? new Date(data.connectedAt).toLocaleString("id-ID") : "–"}
            </p>
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

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {restarting ? "⏳ Restarting..." : "🔄 Restart Bot"}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Kontak & Chat ────────────────────────────────────────────────────────
function TabChat() {
  const { data, loading, error, refetch } = useApi("chats");
  const [search, setSearch] = useState("");

  const chats = (data?.chats || []).filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.jid.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Kontak & Chat Pribadi</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat data chat...</p>}
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">⚠️ {error}</div>}

      {data && (
        <>
          <input
            className="input max-w-sm"
            placeholder="Cari nama atau nomor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <p className="text-xs text-gray-400">{chats.length} chat ditemukan</p>

          {chats.length === 0 && !loading && (
            <p className="text-sm text-gray-400">Belum ada riwayat chat pribadi yang terekam. (Bot mungkin perlu menerima pesan baru untuk menyimpan kontak).</p>
          )}

          <div className="space-y-2">
            {chats.map(c => (
              <div key={c.jid} className="card flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold dark:text-white">{c.name}</p>
                    {c.unreadCount > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{c.unreadCount} Baru</span>}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">+{c.jid.split('@')[0]}</p>
                  {c.lastMessageTime && <p className="text-xs text-gray-400">Terakhir: {new Date(c.lastMessageTime).toLocaleString("id-ID")}</p>}
                </div>
                <CopyBtn text={c.jid.split('@')[0]} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Grup ─────────────────────────────────────────────────────────────────
function TabGrup() {
  const { data, loading, error, refetch } = useApi("groups");
  const [search, setSearch] = useState("");

  const groups = (data?.groups || []).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) || g.jid.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Daftar Grup WhatsApp Bot</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat daftar grup...</p>}
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">⚠️ {error}</div>}

      {data && (
        <>
          <input
            className="input max-w-sm"
            placeholder="Cari nama grup / JID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <p className="text-xs text-gray-400">{groups.length} grup ditemukan</p>

          {groups.length === 0 && !loading && (
            <p className="text-sm text-gray-400">Bot belum bergabung ke grup manapun, atau tidak ada grup yang cocok.</p>
          )}

          <div className="space-y-2">
            {groups.map(g => (
              <div key={g.jid} className="card flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold dark:text-white">{g.name}</p>
                    {g.isAdmin && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">ADMIN</span>}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{g.jid}</p>
                  <p className="text-xs text-gray-400">{g.participants} anggota</p>
                </div>
                <CopyBtn text={g.jid} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab: Saluran ──────────────────────────────────────────────────────────────
function TabSaluran() {
  const { data, loading, error, refetch } = useApi("newsletters");
  const [invite, setInvite] = useState("");
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!invite.trim()) return;
    setAdding(true);
    setAddStatus(null);
    try {
      const res = await fetch("/api/admin/baileys?endpoint=newsletters/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAddStatus({ ok: true, msg: `✅ Saluran "${json.data.name}" berhasil ditambahkan!` });
        setInvite("");
        refetch();
      } else {
        setAddStatus({ ok: false, msg: `❌ ${json.error || "Gagal menambah saluran"}` });
      }
    } catch (err) {
      setAddStatus({ ok: false, msg: `❌ ${err.message}` });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Saluran (Newsletter) WhatsApp</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      <form onSubmit={handleAdd} className="card p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">Tambah Saluran via Link Invite</label>
          <input 
            className="input" 
            placeholder="https://whatsapp.com/channel/..." 
            value={invite} 
            onChange={(e) => setInvite(e.target.value)} 
          />
        </div>
        <button type="submit" disabled={adding} className="btn-primary shrink-0">
          {adding ? "⏳ Menyimpan..." : "➕ Tambah"}
        </button>
      </form>
      {addStatus && (
        <div className={`rounded-lg p-3 text-sm ${addStatus.ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
          {addStatus.msg}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Memuat saluran...</p>}
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">⚠️ {error}</div>}

      {data?.note && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          ℹ️ {data.note}
        </div>
      )}

      {data && (data.newsletters || []).length === 0 && !data.note && (
        <p className="text-sm text-gray-400">Belum ada saluran yang ditambahkan. Gunakan form di atas untuk menambah.</p>
      )}

      <div className="space-y-2">
        {(data?.newsletters || []).map(n => (
          <div key={n.jid} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold dark:text-white">{n.name}</p>
              <p className="mt-0.5 font-mono text-xs text-gray-400">{n.jid}</p>
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

// ── Tab: Kirim Pesan ──────────────────────────────────────────────────────────
function TabKirim() {
  const [form, setForm] = useState({ target: "", message: "", url: "" });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const { data: groupData } = useApi("groups");

  async function handleSend(e) {
    e.preventDefault();
    if (!form.target.trim() || !form.message.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/baileys?endpoint=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: form.target, message: form.message, url: form.url || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setStatus({ ok: true, msg: "✅ Pesan berhasil dikirim!" });
        setForm(f => ({ ...f, message: "" }));
      } else {
        setStatus({ ok: false, msg: `❌ ${data.reason || data.error || "Gagal kirim"}` });
      }
    } catch (e) {
      setStatus({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setSending(false);
    }
  }

  const groups = groupData?.groups || [];

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold dark:text-white">Kirim Pesan Manual via Baileys</h2>

      <form onSubmit={handleSend} className="card space-y-4 p-5">
        <div>
          <label className="label">Tujuan (Nomor / JID Grup)</label>
          <input
            className="input"
            placeholder="628xxxxxxxx atau 120363xxx@g.us"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            required
          />
          {groups.length > 0 && (
            <div className="mt-1">
              <label className="label text-xs">Atau pilih grup:</label>
              <select
                className="input text-sm"
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                defaultValue=""
              >
                <option value="" disabled>— Pilih grup —</option>
                {groups.map(g => (
                  <option key={g.jid} value={g.jid}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="label">Isi Pesan</label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="Ketik pesan di sini..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">URL Gambar (opsional)</label>
          <input
            className="input"
            placeholder="https://contoh.com/gambar.jpg"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          />
        </div>

        {status && (
          <div className={`rounded-lg p-3 text-sm ${status.ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
            {status.msg}
          </div>
        )}

        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? "⏳ Mengirim..." : "🚀 Kirim Sekarang"}
        </button>
      </form>
    </div>
  );
}

// ── Tab: Log ──────────────────────────────────────────────────────────────────
function TabLog() {
  const { data, loading, error, refetch } = useApi("logs");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Log Pesan Masuk (100 terakhir)</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Memuat log...</p>}
      {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">⚠️ {error}</div>}

      {data && (data.logs || []).length === 0 && (
        <p className="text-sm text-gray-400">Belum ada pesan masuk sejak bot terakhir restart.</p>
      )}

      {data && (data.logs || []).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Pengirim</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Preview</th>
              </tr>
            </thead>
            <tbody className="dark:text-slate-300">
              {(data.logs || []).map((l, i) => (
                <tr key={i} className="border-t dark:border-slate-800">
                  <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(l.time).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" })}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {l.sender}
                    <CopyBtn text={l.sender} />
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.type === "imageMessage" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {l.type === "imageMessage" ? "📷 Foto" : "💬 Teks"}
                    </span>
                  </td>
                  <td className="max-w-[250px] truncate p-3 text-gray-600 dark:text-slate-400">{l.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BaileysDashboard() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-3 dark:border-slate-800">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "status" && <TabStatus />}
      {tab === "chat" && <TabChat />}
      {tab === "grup" && <TabGrup />}
      {tab === "saluran" && <TabSaluran />}
      {tab === "kirim" && <TabKirim />}
      {tab === "log" && <TabLog />}
    </div>
  );
}
