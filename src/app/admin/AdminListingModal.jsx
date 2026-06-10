"use client";

import { useState } from "react";

const STATUSES = ["pending", "active", "expired", "sold", "suspended"];

// Modal edit penuh sebuah listing dari admin.
export default function AdminListingModal({ listing, categories, onSave, onClose }) {
  const [f, setF] = useState({
    title: listing.title || "",
    seller_name: listing.seller_name || "",
    seller_wa: listing.seller_wa || "",
    price: listing.price ?? 0,
    stock: listing.stock ?? 0,
    category: listing.category || "",
    type: listing.type || "barang",
    status: listing.status || "pending",
    featured: !!listing.featured,
    views: listing.views ?? 0,
    description: listing.description || "",
    image_url: listing.image_url || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) =>
    setF((s) => ({
      ...s,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  async function save() {
    setBusy(true);
    try {
      await onSave({ action: "update_listing", id: listing.id, ...f });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const catNames = categories?.length
    ? categories.map((c) => c.name)
    : [f.category].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Listing</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Judul</label>
            <input className="input" value={f.title} onChange={set("title")} />
          </div>

          <div>
            <label className="label">Nama Penjual</label>
            <input className="input" value={f.seller_name} onChange={set("seller_name")} />
          </div>
          <div>
            <label className="label">No. WhatsApp</label>
            <input className="input" value={f.seller_wa} onChange={set("seller_wa")} />
          </div>

          <div>
            <label className="label">Harga (Rp)</label>
            <input type="number" min="0" className="input" value={f.price} onChange={set("price")} />
          </div>
          <div>
            <label className="label">Stok</label>
            <input type="number" min="0" className="input" value={f.stock} onChange={set("stock")} />
          </div>

          <div>
            <label className="label">Kategori</label>
            <select className="input" value={f.category} onChange={set("category")}>
              {!catNames.includes(f.category) && f.category && (
                <option value={f.category}>{f.category}</option>
              )}
              {catNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipe</label>
            <select className="input" value={f.type} onChange={set("type")}>
              <option value="barang">barang</option>
              <option value="poster">poster</option>
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={f.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Views</label>
            <input type="number" min="0" className="input" value={f.views} onChange={set("views")} />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.featured} onChange={set("featured")} />
            <span className="text-sm font-medium">⭐ Featured (tampil di banner)</span>
          </label>

          <div className="sm:col-span-2">
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-24"
              value={f.description}
              onChange={set("description")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">URL Gambar</label>
            <input className="input" value={f.image_url} onChange={set("image_url")} />
            {f.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.image_url}
                alt=""
                className="mt-2 h-32 w-32 rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={save} disabled={busy} className="btn-primary flex-1">
            {busy ? "Menyimpan…" : "💾 Simpan"}
          </button>
          <button onClick={onClose} className="btn-outline">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
