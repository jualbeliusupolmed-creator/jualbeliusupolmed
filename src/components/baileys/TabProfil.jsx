"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useApi, apiPost, apiDelete, normalizeJid } from "./api";
import { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";

export function TabProfil() {
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