"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabGrup() {
  const { data, loading, error, refetch } = useApi("groups");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [partForm, setPartForm] = useState({ action: "add", numbers: "" });
  const [partStatus, setPartStatus] = useState(null);
  const [partLoading, setPartLoading] = useState(false);
  
  // Japri states
  const [japriMsg, setJapriMsg] = useState("");
  const [japriStatus, setJapriStatus] = useState(null);
  const [japriLoading, setJapriLoading] = useState(false);

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

  async function handleJapri(e) {
    e.preventDefault();
    if (!confirm(`Yakin ingin japri ${selected?.participants} anggota grup ini? Aksi ini butuh waktu dan bisa beresiko banned jika terlalu sering.`)) return;
    
    setJapriLoading(true); setJapriStatus(null);
    try {
      const res = await fetch("/api/admin/broadcast/group-japri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: selected.jid, message: japriMsg }),
      });
      const r = await res.json();
      if (res.ok && r.ok) {
        setJapriStatus({ ok: true, text: `✅ Berhasil mengirim japri ke ${r.successCount} anggota. Gagal: ${r.failCount}` });
        setJapriMsg("");
      } else {
        setJapriStatus({ ok: false, text: `❌ Gagal: ${r.error || "Terjadi kesalahan"}` });
      }
    } catch (err) {
      setJapriStatus({ ok: false, text: `❌ Error: ${err.message}` });
    }
    setJapriLoading(false);
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
                <button onClick={() => { setSelected(selected?.jid === g.jid ? null : g); setInviteLink(null); setPartStatus(null); setJapriStatus(null); }}
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

                {/* Broadcast Japri */}
                <form onSubmit={handleJapri} className="space-y-2 pt-2 border-t dark:border-slate-700">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Broadcast Japri</p>
                  <p className="text-xs text-gray-500 mb-1">Kirim pesan personal (japri) ke semua peserta grup secara bertahap.</p>
                  <textarea className="input min-h-[80px]" placeholder="Pesan untuk semua anggota grup..." value={japriMsg} onChange={e => setJapriMsg(e.target.value)} required />
                  <Alert ok={japriStatus?.ok} msg={japriStatus?.text} />
                  <button type="submit" disabled={japriLoading || !japriMsg.trim()} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm">{japriLoading ? "⏳ Mengirim..." : `⚡ Kirim ke ${g.participants} anggota`}</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}