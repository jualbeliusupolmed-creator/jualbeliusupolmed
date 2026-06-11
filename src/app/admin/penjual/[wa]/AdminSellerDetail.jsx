"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSellerDetail({ profile, listings, wa }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    name: profile?.name || listings?.[0]?.seller_name || wa,
    bio: profile?.bio || "",
  });

  async function handleSave() {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_seller_profile",
          wa,
          name: form.name,
          bio: form.bio,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setToast({ type: "ok", msg: "Profil Penjual disimpan!" });
      router.refresh();
      // Optional: hide toast after 3s
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: "err", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 mt-4 relative">
      <h2 className="text-xl font-bold mb-4">Edit Profil Penjual</h2>

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm font-medium ${toast.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-4 max-w-md">
        <div>
          <label className="label">Nomor WhatsApp</label>
          <input className="input bg-gray-100 dark:bg-slate-800" value={wa} disabled />
        </div>
        <div>
          <label className="label">Nama Penjual</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama Toko / Penjual"
          />
          <p className="mt-1 text-xs text-gray-400">
            Mengubah ini akan merubah nama di semua iklan miliknya.
          </p>
        </div>
        <div>
          <label className="label">Bio / Deskripsi</label>
          <textarea
            className="input min-h-24"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Melayani COD di Pintu 1..."
          />
        </div>
        
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => router.push("/admin/penjual")}
            className="btn-outline"
          >
            Kembali
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="btn-primary"
          >
            {busy ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
