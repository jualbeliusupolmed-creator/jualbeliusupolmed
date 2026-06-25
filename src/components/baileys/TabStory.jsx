"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabStory() {
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