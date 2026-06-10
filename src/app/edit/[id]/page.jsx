"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";

export default function EditPage() {
  const router = useRouter();
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState("");
  const [cats, setCats] = useState(CATEGORIES);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        if (d?.categories?.length) setCats(d.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await fetch(`/api/listings/${id}`);
        const data = await res.json();
        if (!res.ok || !data.listing) {
          setMsg("Iklan tidak ditemukan.");
          setLoading(false);
          return;
        }
        const l = data.listing;
        setOriginal(l);
        setForm({
          seller_name: l.seller_name || "",
          title: l.title || "",
          description: l.description || "",
          price: l.price || "",
          stock: l.stock || 1,
          category: l.category || CATEGORIES[0].name,
        });
        const existing = l.images?.length
          ? l.images
          : l.image_url
          ? [l.image_url]
          : [];
        setMedia(existing.map((url) => ({ url, preview: url })));
      } catch {
        setMsg("Gagal memuat data iklan.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchListing();
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!form.title || !form.price) {
      setMsg("Judul dan harga wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      const image_url = images[0] || null;
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          seller_name: form.seller_name,
          title: form.title,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          category: form.category,
          image_url,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update iklan");
      router.push("/dashboard?edited=1");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-gray-400">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3">Memuat data iklan…</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-gray-500">
        <p className="text-4xl">😕</p>
        <p className="mt-3">{msg || "Iklan tidak ditemukan."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Edit Iklan</h1>
      <p className="mt-1 text-gray-500">
        Perbarui detail iklan <strong>{original?.title}</strong>.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Upload foto */}
          <div className="card p-4">
            <label className="label">Foto Barang</label>
            <MediaUploader
              media={media}
              setMedia={setMedia}
              max={5}
              error={fileError}
              setError={setFileError}
            />
          </div>

          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label className="label">Kategori</label>
              <select className="input" value={form.category} onChange={set("category")}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nama Penjual</label>
              <input
                className="input"
                value={form.seller_name}
                onChange={set("seller_name")}
                placeholder="Nama kamu"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Judul</label>
              <input
                className="input"
                value={form.title}
                onChange={set("title")}
                placeholder="Judul iklan"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Deskripsi</label>
              <textarea
                className="input min-h-24"
                value={form.description}
                onChange={set("description")}
                placeholder="Kondisi, kelengkapan, lokasi COD…"
              />
            </div>
            <div>
              <label className="label">Harga (Rp)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.price}
                onChange={set("price")}
                required
              />
            </div>
            <div>
              <label className="label">Stok</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.stock}
                onChange={set("stock")}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold">Simpan Perubahan</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Harga baru</dt>
                <dd className="font-semibold text-primary">{rupiah(form.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Stok baru</dt>
                <dd className="font-semibold">{form.stock}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={busy || !!fileError}
              className="btn-primary mt-4 w-full"
            >
              {busy ? "Menyimpan…" : "💾 Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline mt-2 w-full"
            >
              Batal
            </button>
            {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          </div>

          <div className="card p-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-700">ℹ️ Info</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Edit gratis, tidak ada biaya tambahan.</li>
              <li>Status iklan tidak berubah.</li>
              <li>Perubahan langsung tayang.</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
