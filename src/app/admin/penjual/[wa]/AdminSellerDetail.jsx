"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSellerDetail({ profile, listings, stats, wa }) {
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500">Revenue (Terjual)</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            Rp {stats.totalRevenue.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500">Total Views</p>
          <p className="mt-1 text-xl font-bold text-blue-600">{stats.totalViews}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500">Iklan Aktif</p>
          <p className="mt-1 text-xl font-bold text-primary">{stats.activeCount}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{stats.pendingCount}</p>
        </div>
      </div>

      <div className="card p-6 relative">
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

      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">Daftar Iklan Penjual Ini</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
              <tr>
                <th className="p-3">Judul Iklan</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="dark:text-slate-300">
              {listings.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-gray-400">Belum ada iklan.</td></tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="border-t dark:border-slate-800">
                    <td className="p-3">{l.title}</td>
                    <td className="p-3">{l.category}</td>
                    <td className="p-3">Rp {l.price?.toLocaleString("id-ID")}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        l.status === 'active' ? 'bg-green-100 text-green-700' :
                        l.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                        l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <a href={`/admin/listings/${l.id}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">Detail</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
