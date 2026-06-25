"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const TABS = ["status", "profil", "story", "chat", "grup", "saluran", "kirim", "blocklist", "lid", "konteks", "log"];
const TAB_LABELS = {
  status:    "🔌 Status",
  profil:    "👤 Profil Bot",
  story:     "📱 Status WA",
  chat:      "💬 Chat",
  grup:      "👥 Grup",
  saluran:   "📢 Saluran",
  kirim:     "✉️ Kirim",
  blocklist: "🚫 Blocklist",
  lid:       "🗺️ LID Map",
  konteks:   "🧠 Sesi Aktif",
  log:       "📜 Log",
};

// ── Shared hooks & helpers ────────────────────────────────────────────────────
function useApi(endpoint, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { if (autoFetch) fetch_(); }, [fetch_, autoFetch]);
  return { data, loading, error, refetch: fetch_ };
}

async function apiPost(endpoint, body = {}) {
  const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiDelete(endpoint, body = {}) {
  const res = await fetch(`/api/admin/baileys?endpoint=${endpoint}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
    >{copied ? "✓" : "Copy"}</button>
  );
}

function StatusDot({ on }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />;
}

function Alert({ ok, msg }) {
  if (!msg) return null;
  return (
    <div className={`rounded-lg p-3 text-sm ${ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
      {msg}
    </div>
  );
}

function normalizeJid(input) {
  if (!input) return "";
  if (input.includes("@")) return input;
  let num = input.replace(/[^0-9]/g, "");
  if (num.startsWith("0")) num = "62" + num.slice(1);
  return num + "@s.whatsapp.net";
}

// ── QR Display ────────────────────────────────────────────────────────────────
function QRDisplay() {
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/admin/baileys?endpoint=qr");
      setQrData(await res.json());
    } catch (_) { setQrData(null); }
    finally { setQrLoading(false); setCountdown(30); }
  }, []);

  useEffect(() => { fetchQr(); }, [fetchQr]);
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { fetchQr(); return 30; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [fetchQr]);

  if (qrLoading) return <p className="text-sm text-amber-600 animate-pulse">⏳ Memuat QR Code...</p>;
  if (!qrData?.qr) return <p className="text-sm text-gray-400">QR tidak tersedia.</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qrData.qr} alt="QR" className="w-56 h-56 rounded-xl border-4 border-green-400 shadow-lg" />
      <p className="text-xs text-gray-500 dark:text-slate-400 text-center">WhatsApp → Perangkat Tertaut → Tautkan Perangkat</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Refresh dalam</span>
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

// ── Tab: Profil Bot ───────────────────────────────────────────────────────────
function TabProfil() {
  const { data, loading, refetch } = useApi("profile");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (data) { setName(data.name || ""); setStatus(""); }
  }, [data]);

  async function save(field, value) {
    setSaving(field);
    setMsg(null);
    try {
      const r = await apiPost(`profile/${field}`, { [field]: value });
      setMsg(r.ok ? { ok: true, text: `✅ ${field === "name" ? "Nama" : "Status"} berhasil diperbarui!` } : { ok: false, text: `❌ ${r.error}` });
      if (r.ok) refetch();
    } catch (e) { setMsg({ ok: false, text: `❌ ${e.message}` }); }
    finally { setSaving(null); }
  }

  return (
    <div className="max-w-lg space-y-5">
      <h2 className="text-lg font-bold dark:text-white">Profil Bot WhatsApp</h2>
      {loading && <p className="text-sm text-gray-400">Memuat profil...</p>}
      <Alert ok={msg?.ok} msg={msg?.text} />

      {data && (
        <div className="card p-4 space-y-1">
          <p className="text-xs text-gray-400">Akun Terhubung</p>
          <p className="font-mono font-bold dark:text-white">+{data.phone || "–"}</p>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Nama Bot</label>
          <div className="flex gap-2">
            <input className="input flex-1" value={name} onChange={e => setName(e.target.value)} placeholder="Nama yang tampil di WA" />
            <button onClick={() => save("name", name)} disabled={saving === "name" || !name.trim()} className="btn-primary shrink-0">
              {saving === "name" ? "⏳" : "Simpan"}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Nama yang terlihat penerima saat bot kirim pesan.</p>
        </div>

        <div>
          <label className="label">Status / Bio WA</label>
          <div className="flex gap-2">
            <input className="input flex-1" value={status} onChange={e => setStatus(e.target.value)} placeholder="Contoh: Bot Jual Beli USU 🤖" />
            <button onClick={() => save("status", status)} disabled={saving === "status"} className="btn-primary shrink-0">
              {saving === "status" ? "⏳" : "Simpan"}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Kalimat singkat yang muncul di profil WA bot.</p>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Status WA / Story ────────────────────────────────────────────────────
function TabStory() {
  const { data, loading, refetch } = useApi("story");
  const [form, setForm] = useState({ text: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSending(true); setMsg(null);
    try {
      let uploadedUrl;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Upload gambar gagal");
        uploadedUrl = upData.url;
      }
      const r = await apiPost("story", { text: form.text, url: uploadedUrl });
      setMsg(r.ok ? { ok: true, text: "✅ Status WA berhasil dipost!" } : { ok: false, text: `❌ ${r.error}` });
      if (r.ok) { setForm({ text: "" }); setImageFile(null); setImagePreview(""); refetch(); }
    } catch (e) { setMsg({ ok: false, text: `❌ ${e.message}` }); }
    finally { setSending(false); }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-lg font-bold dark:text-white">Post Status WhatsApp</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Status akan tampil di WA semua kontak bot selama 24 jam.</p>
      </div>
      <Alert ok={msg?.ok} msg={msg?.text} />

      <form onSubmit={handleSend} className="card p-5 space-y-4">
        <div>
          <label className="label">Teks Status</label>
          <textarea
            className="input min-h-[100px] resize-y"
            placeholder="Tulis teks status WA di sini..."
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            required
          />
          <p className="mt-1 text-xs text-gray-400">{form.text.length}/700 karakter</p>
        </div>
        <div>
          <label className="label">Gambar (opsional — jadi status foto, otomatis WebP)</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-3 hover:border-blue-400 dark:border-slate-600">
            <span className="text-2xl">🖼️</span>
            <div className="min-w-0">
              <p className="text-sm font-medium dark:text-gray-300">{imageFile ? imageFile.name : "Klik untuk pilih gambar"}</p>
              <p className="text-xs text-gray-400">JPG, PNG, WebP · Maks 5 MB</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
          {imagePreview && (
            <div className="relative mt-2 inline-block">
              <img src={imagePreview} alt="preview" className="h-32 w-auto rounded-lg border object-cover" />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-xs text-white hover:bg-red-600">✕</button>
            </div>
          )}
        </div>
        <button type="submit" disabled={sending || !form.text.trim()} className="btn-primary w-full">
          {sending ? "⏳ Memposting..." : "📱 Post Status WA"}
        </button>
      </form>

      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        💡 Status hanya tampil ke kontak yang sudah pernah chat dengan nomor WA bot, dan yang setting privasi-nya mengizinkan.
      </div>

      <div className="pt-4 border-t dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold dark:text-white">Status Aktif (24 Jam Terakhir)</h3>
          <button type="button" onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
        </div>
        
        {loading && <p className="text-sm text-gray-400">Memuat status...</p>}
        
        {!loading && (!data?.statuses || data.statuses.length === 0) && (
          <p className="text-sm text-gray-500 italic">Belum ada status aktif saat ini.</p>
        )}

        <div className="space-y-3">
          {(data?.statuses || []).map((s, i) => (
            <div key={s.id || i} className="card p-3 flex gap-3 items-start border-l-4 border-green-500">
              {s.type === "image" && s.url && (
                <img src={s.url} alt="status" className="h-16 w-16 object-cover rounded bg-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">{new Date(s.timestamp).toLocaleString("id-ID")}</p>
                <p className="text-sm font-medium dark:text-white whitespace-pre-wrap">{s.text || "[Gambar tanpa caption]"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Kontak & Chat ────────────────────────────────────────────────────────
function TabChat() {
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

// ── Tab: Grup ─────────────────────────────────────────────────────────────────
function TabGrup() {
  const { data, loading, error, refetch } = useApi("groups");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [partForm, setPartForm] = useState({ action: "add", numbers: "" });
  const [partStatus, setPartStatus] = useState(null);
  const [partLoading, setPartLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", numbers: "" });
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const groups = (data?.groups || []).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) || g.jid.includes(search)
  );

  async function getInvite(jid) {
    setInviteLoading(true); setInviteLink(null);
    const r = await fetch(`/api/admin/baileys?endpoint=${encodeURIComponent(`groups/${encodeURIComponent(jid)}/invite`)}`).then(r => r.json());
    setInviteLink(r.link ? r : { error: r.error });
    setInviteLoading(false);
  }

  async function handleParticipants(e) {
    e.preventDefault();
    setPartLoading(true); setPartStatus(null);
    const participants = partForm.numbers.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const r = await fetch(`/api/admin/baileys?endpoint=${encodeURIComponent(`groups/${encodeURIComponent(selected.jid)}/participants`)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: partForm.action, participants }),
    }).then(r => r.json());
    setPartStatus(r.ok ? { ok: true, text: `✅ ${partForm.action} berhasil!` } : { ok: false, text: `❌ ${r.error}` });
    setPartLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true); setCreateStatus(null);
    const participants = createForm.numbers.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const r = await apiPost("groups/create", { name: createForm.name, participants });
    setCreateStatus(r.ok ? { ok: true, text: `✅ Grup "${createForm.name}" berhasil dibuat! JID: ${r.jid}` } : { ok: false, text: `❌ ${r.error}` });
    if (r.ok) { setCreateForm({ name: "", numbers: "" }); refetch(); }
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Grup WhatsApp Bot</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(s => !s)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
            ➕ Buat Grup
          </button>
          <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3 border-2 border-green-200 dark:border-green-800">
          <p className="font-semibold text-sm dark:text-white">Buat Grup Baru</p>
          <input className="input" placeholder="Nama Grup" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
          <div>
            <label className="label">Nomor Anggota (pisah koma atau baris baru)</label>
            <textarea className="input min-h-[80px]" placeholder="08123456789&#10;08987654321" value={createForm.numbers} onChange={e => setCreateForm(f => ({ ...f, numbers: e.target.value }))} required />
          </div>
          <Alert ok={createStatus?.ok} msg={createStatus?.text} />
          <button type="submit" disabled={creating} className="btn-primary">{creating ? "⏳ Membuat..." : "✅ Buat Grup"}</button>
        </form>
      )}

      {loading && <p className="text-sm text-gray-400">Memuat grup...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      <input className="input max-w-sm" placeholder="Cari nama grup / JID..." value={search} onChange={e => setSearch(e.target.value)} />
      <p className="text-xs text-gray-400">{groups.length} grup</p>

      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.jid} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold dark:text-white">{g.name}</p>
                  {g.isAdmin && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">ADMIN</span>}
                </div>
                <p className="font-mono text-xs text-gray-400">{g.jid}</p>
                <p className="text-xs text-gray-400">{g.participants} anggota</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <CopyBtn text={g.jid} />
                <button onClick={() => { setSelected(selected?.jid === g.jid ? null : g); setInviteLink(null); setPartStatus(null); }}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${selected?.jid === g.jid ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300"}`}>
                  ⚙️ Kelola
                </button>
              </div>
            </div>

            {selected?.jid === g.jid && (
              <div className="border-t dark:border-slate-700 pt-3 space-y-4">
                {/* Invite Link */}
                <div>
                  <button onClick={() => getInvite(g.jid)} disabled={inviteLoading} className="rounded bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300">
                    {inviteLoading ? "⏳ Mengambil..." : "🔗 Ambil Invite Link"}
                  </button>
                  {inviteLink?.link && (
                    <div className="mt-2 rounded bg-gray-50 dark:bg-slate-800 p-2 flex items-center gap-2">
                      <p className="font-mono text-xs break-all dark:text-slate-300">{inviteLink.link}</p>
                      <CopyBtn text={inviteLink.link} />
                    </div>
                  )}
                  {inviteLink?.error && <p className="mt-1 text-xs text-red-500">{inviteLink.error}</p>}
                </div>

                {/* Manage Participants */}
                <form onSubmit={handleParticipants} className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Kelola Anggota</p>
                  <select className="input text-sm" value={partForm.action} onChange={e => setPartForm(f => ({ ...f, action: e.target.value }))}>
                    <option value="add">➕ Tambah anggota</option>
                    <option value="remove">➖ Hapus anggota</option>
                    <option value="promote">⬆️ Jadikan admin</option>
                    <option value="demote">⬇️ Turunkan dari admin</option>
                  </select>
                  <textarea className="input min-h-[60px]" placeholder="08123456789, 08987654321" value={partForm.numbers} onChange={e => setPartForm(f => ({ ...f, numbers: e.target.value }))} required />
                  <Alert ok={partStatus?.ok} msg={partStatus?.text} />
                  <button type="submit" disabled={partLoading} className="btn-primary text-sm">{partLoading ? "⏳ Memproses..." : "✅ Jalankan"}</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
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

// ── Tab: Kirim Pesan ──────────────────────────────────────────────────────────
function TabKirim() {
  const [mode, setMode] = useState("pesan");
  const [form, setForm] = useState({ target: "", message: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [poll, setPoll] = useState({ target: "", name: "", options: ["", ""] });
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const { data: groupData } = useApi("groups");
  const groups = groupData?.groups || [];

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSendMsg(e) {
    e.preventDefault();
    setSending(true); setStatus(null);
    try {
      let uploadedUrl;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Upload gambar gagal");
        uploadedUrl = upData.url;
      }
      const r = await apiPost("send", { target: form.target, message: form.message, url: uploadedUrl });
      setStatus(r.status ? { ok: true, text: "✅ Pesan berhasil dikirim!" } : { ok: false, text: `❌ ${r.reason || r.error}` });
      if (r.status) { setForm(f => ({ ...f, message: "" })); setImageFile(null); setImagePreview(""); }
    } catch (e) { setStatus({ ok: false, text: `❌ ${e.message}` }); }
    setSending(false);
  }

  async function handleSendPoll(e) {
    e.preventDefault();
    const opts = poll.options.filter(o => o.trim());
    if (opts.length < 2) { setStatus({ ok: false, text: "❌ Minimal 2 pilihan polling." }); return; }
    setSending(true); setStatus(null);
    const r = await apiPost("send-poll", { target: poll.target, name: poll.name, options: opts });
    setStatus(r.ok ? { ok: true, text: "✅ Polling berhasil dikirim!" } : { ok: false, text: `❌ ${r.error}` });
    if (r.ok) setPoll({ target: "", name: "", options: ["", ""] });
    setSending(false);
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold dark:text-white">Kirim Pesan via Bot</h2>

      <div className="flex gap-1 border-b dark:border-slate-700 pb-2">
        {[["pesan", "💬 Teks/Foto"], ["poll", "📊 Polling"]].map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setStatus(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === k ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
            {l}
          </button>
        ))}
      </div>

      <Alert ok={status?.ok} msg={status?.text} />

      {mode === "pesan" && (
        <form onSubmit={handleSendMsg} className="card space-y-4 p-5">
          <div>
            <label className="label">Tujuan</label>
            <input className="input" placeholder="628xxxxxxxx atau 120363xxx@g.us" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} required />
            {groups.length > 0 && (
              <select className="input mt-1 text-sm" onChange={e => setForm(f => ({ ...f, target: e.target.value }))} defaultValue="">
                <option value="" disabled>— Pilih grup —</option>
                {groups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="label">Isi Pesan</label>
            <textarea className="input min-h-[100px] resize-y" placeholder="Ketik pesan..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Gambar (opsional — otomatis WebP)</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-3 hover:border-blue-400 dark:border-slate-600">
              <span className="text-2xl">🖼️</span>
              <div className="min-w-0">
                <p className="text-sm font-medium dark:text-gray-300">{imageFile ? imageFile.name : "Klik untuk pilih gambar"}</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP · Maks 5 MB</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            {imagePreview && (
              <div className="relative mt-2 inline-block">
                <img src={imagePreview} alt="preview" className="h-32 w-auto rounded-lg border object-cover" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-xs text-white hover:bg-red-600">✕</button>
              </div>
            )}
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? "⏳ Mengirim..." : "🚀 Kirim"}</button>
        </form>
      )}

      {mode === "poll" && (
        <form onSubmit={handleSendPoll} className="card space-y-4 p-5">
          <div>
            <label className="label">Tujuan (nomor/JID grup)</label>
            <input className="input" placeholder="628xxxxxxxx atau @g.us" value={poll.target} onChange={e => setPoll(f => ({ ...f, target: e.target.value }))} required />
            {groups.length > 0 && (
              <select className="input mt-1 text-sm" onChange={e => setPoll(f => ({ ...f, target: e.target.value }))} defaultValue="">
                <option value="" disabled>— Pilih grup —</option>
                {groups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="label">Pertanyaan Polling</label>
            <input className="input" placeholder="Contoh: Iklan mana yang paling menarik?" value={poll.name} onChange={e => setPoll(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Pilihan (min 2, maks 12)</label>
            {poll.options.map((opt, i) => (
              <div key={i} className="flex gap-2 mt-1">
                <input className="input flex-1" placeholder={`Pilihan ${i + 1}`} value={opt} onChange={e => setPoll(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))} />
                {poll.options.length > 2 && (
                  <button type="button" onClick={() => setPoll(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 text-lg">✕</button>
                )}
              </div>
            ))}
            {poll.options.length < 12 && (
              <button type="button" onClick={() => setPoll(f => ({ ...f, options: [...f.options, ""] }))} className="mt-2 text-xs text-blue-500 hover:underline">+ Tambah pilihan</button>
            )}
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full">{sending ? "⏳ Mengirim..." : "📊 Kirim Polling"}</button>
        </form>
      )}
    </div>
  );
}

// ── Tab: Blocklist ────────────────────────────────────────────────────────────
function TabBlocklist() {
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

// ── Tab: LID Map ──────────────────────────────────────────────────────────────
function TabLidMap() {
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

// ── Tab: Sesi Aktif (Conversation Context) ────────────────────────────────────
function TabKonteks() {
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

// ── Tab: Log Pesan ────────────────────────────────────────────────────────────
function TabLog() {
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BaileysDashboard() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-3 dark:border-slate-800">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                       : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "status"    && <TabStatus />}
      {tab === "profil"    && <TabProfil />}
      {tab === "story"     && <TabStory />}
      {tab === "chat"      && <TabChat />}
      {tab === "grup"      && <TabGrup />}
      {tab === "saluran"   && <TabSaluran />}
      {tab === "kirim"     && <TabKirim />}
      {tab === "blocklist" && <TabBlocklist />}
      {tab === "lid"       && <TabLidMap />}
      {tab === "konteks"   && <TabKonteks />}
      {tab === "log"       && <TabLog />}
    </div>
  );
}
