"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasisAdmin } from "@/components/admin/basis";

export default function AdminSellerDetail({ profile, listings, stats, wa }) {
  const basis = useBasisAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    name: profile?.name || listings?.[0]?.seller_name || wa,
    bio: profile?.bio || "",
  });

  // Badge penulis blog. Ditaruh di halaman penjual, bukan di tab Artikel:
  // ia sifat orangnya, bukan sifat satu tulisan — dan tempat orang mencarinya
  // adalah halaman orang itu.
  async function ubahBadge(beri) {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_blog_badge", wa, value: beri }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengubah badge");
      setToast({ type: "ok", msg: beri ? "Badge penulis diberikan." : "Badge penulis dicabut." });
      router.refresh();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: "err", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

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
              onClick={() => router.push(`${basis}/penjual`)}
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
        <h2 className="text-xl font-bold">Badge penulis blog</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
          Tanpa badge, setiap artikel yang ditulis penjual ini masuk antrean review dulu.
          Dengan badge, tulisannya <b>langsung terbit</b> di halaman blog tanpa dibaca siapa pun
          lebih dahulu — jadi memberikannya berarti mempercayakan nama situs ini kepadanya.
          Artikel yang sudah tayang tidak ikut turun saat badge dicabut.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`badge ${profile?.blog_badge
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}
          >
            {profile?.blog_badge ? "✍️ Berbadge" : "Tanpa badge"}
          </span>
          {profile?.blog_badge_at && (
            <span className="text-xs text-gray-400">
              sejak {new Date(profile.blog_badge_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          {profile?.blog_badge ? (
            <button onClick={() => ubahBadge(false)} disabled={busy} className="btn-outline border-rose-300 text-rose-600 dark:border-rose-800">
              Cabut badge
            </button>
          ) : (
            <button onClick={() => ubahBadge(true)} disabled={busy} className="btn-primary">
              Beri badge penulis
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Penjual ini dikabari lewat WhatsApp setiap kali badge-nya berubah — supaya tidak ada
          yang punya hak terbit-langsung tanpa tahu ia memilikinya.
        </p>
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
                      <a href={`${basis}/listings/${l.id}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">Detail</a>
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
