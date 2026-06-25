"use client";

import { useState } from "react";
import MediaUploader from "@/components/MediaUploader";
import { uploadMedia } from "@/lib/upload";

const STATUSES = ["pending", "active", "expired", "sold", "suspended"];
const CAMPUS = ["Semua", "USU", "POLMED"];

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
    campus: listing.campus || "Semua",
    area: listing.area || "",
    featured: !!listing.featured,
    views: listing.views ?? 0,
    description: listing.description || "",
  });
  const initialImages = listing.images?.length
    ? listing.images
    : listing.image_url
    ? [listing.image_url]
    : [];
  const [media, setMedia] = useState(initialImages.map((url) => ({ url, preview: url })));
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) =>
    setF((s) => ({
      ...s,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  async function save() {
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      await onSave(
        {
          action: "update_listing",
          id: listing.id,
          ...f,
          image_url: images[0] || null,
          images,
        },
        "Listing diperbarui"
      );
      onClose();
    } catch (e) {
      setFileError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function postMeta() {
    setBusy(true);
    try {
      await onSave({ action: "post_meta", listing: { ...listing, ...f } }, "Memproses upload ke Meta (IG & FB)...");
    } catch (e) {
      setFileError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const catNames = categories?.length
    ? categories.map((c) => c.name)
    : [f.category].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold dark:text-white">Edit Listing</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Galeri */}
        <div className="mt-4">
          <label className="label">Foto (galeri)</label>
          <MediaUploader
            media={media}
            setMedia={setMedia}
            max={5}
            error={fileError}
            setError={setFileError}
          />
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

          <div>
            <label className="label">Kampus</label>
            <select className="input" value={f.campus} onChange={set("campus")}>
              {CAMPUS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Area</label>
            <input className="input" value={f.area} onChange={set("area")} placeholder="Sekitar Kampus" />
          </div>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.featured} onChange={set("featured")} />
            <span className="text-sm font-medium dark:text-slate-200">Featured (tampil di banner)</span>
          </label>

          <div className="sm:col-span-2">
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-24"
              value={f.description}
              onChange={set("description")}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={save} disabled={busy} className="btn-primary flex-1">
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
          <button onClick={postMeta} disabled={busy || f.status !== "active"} className="btn-outline flex-1 bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
            Post ke IG/FB
          </button>
          <button onClick={onClose} className="btn-outline">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
