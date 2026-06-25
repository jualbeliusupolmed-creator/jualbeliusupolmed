"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabKirim() {
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