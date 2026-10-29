"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";
import CampusSelect from "@/components/CampusSelect";
import { useSesi } from "@/components/SesiProvider";

export default function EditPage() {
  const { wa: sesiWa } = useSesi();
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
          setMsg("Barang tidak ditemukan.");
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
          campus: l.campus || "Semua",
          area: l.area || "",
        });
        const existing = l.images?.length
          ? l.images
          : l.image_url
          ? [l.image_url]
          : [];
        setMedia(existing.map((url) => ({ url, preview: url })));
      } catch {
        setMsg("Gagal memuat data barang.");
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
          // Dari sesi, bukan localStorage: cermin yang kosong dulu mengirim
          // seller_wa: null dan server menolak suntingan milik sendiri.
          seller_wa: sesiWa || null,
          seller_name: form.seller_name,
          title: form.title,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          category: form.category,
          campus: form.campus,
          area: form.area,
          image_url,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui barang");
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
        <p className="mt-3">Memuat data barang…</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center text-gray-500">
        <p className="text-4xl text-amber-500">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </p>
        <p className="mt-3">{msg || "Barang tidak ditemukan."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Edit Barang</h1>
      <p className="mt-1 text-gray-500">
        Perbarui detail barang <strong>{original?.title}</strong>.
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

          <div className="card grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <label className="label">Kategori</label>
              <select disabled={original?.status === "active"} className="input focus:ring-4 focus:ring-accent/10 focus:border-accent disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800" value={form.category} onChange={set("category")}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target Area</label>
              <CampusSelect className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.campus} onChange={(value) => setForm((current) => ({ ...current, campus: value }))} />
            </div>
            <div>
              <label className="label">Lokasi COD</label>
              <div className="floating-group">
                <input
                  id="edit-area"
                  className="floating-input peer"
                  value={form.area}
                  onChange={set("area")}
                  placeholder=" "
                  required
                />
                <label htmlFor="edit-area" className="floating-label">Lokasi COD (kota, area, atau titik temu)</label>
              </div>
            </div>
            
            <div className="floating-group">
              <input
                id="edit-seller-name"
                className="floating-input peer"
                value={form.seller_name}
                onChange={set("seller_name")}
                placeholder=" "
                required
              />
              <label htmlFor="edit-seller-name" className="floating-label">Nama Penjual</label>
            </div>
            
            <div className="sm:col-span-2 floating-group">
              <input
                id="edit-title"
                className="floating-input peer disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800"
                value={form.title}
                onChange={set("title")}
                placeholder=" "
                required
                disabled={original?.status === "active"}
              />
              <label htmlFor="edit-title" className="floating-label">Nama / Judul Barang</label>
              {original?.status === "active" && (
                <p className="mt-1 text-[10px] text-rose-500">Nama & kategori dikunci setelah barang ditampilkan untuk mencegah daur ulang.</p>
              )}
            </div>
            
            <div className="sm:col-span-2 floating-group">
              <textarea
                id="edit-description"
                className="floating-input peer min-h-24"
                value={form.description}
                onChange={set("description")}
                placeholder=" "
              />
              <label htmlFor="edit-description" className="floating-label">Deskripsi Lengkap</label>
            </div>
            
            <div className="floating-group">
              <input
                id="edit-price"
                type="text"
                className="floating-input peer"
                value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setForm((f) => ({ ...f, price: cleaned }));
                }}
                placeholder=" "
                required
              />
              <label htmlFor="edit-price" className="floating-label">Harga (Rp)</label>
            </div>
            
            <div className="floating-group">
              <input
                id="edit-stock"
                type="number"
                min="0"
                className="floating-input peer"
                value={form.stock}
                onChange={set("stock")}
                placeholder=" "
                required
              />
              <label htmlFor="edit-stock" className="floating-label">Stok Barang</label>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold dark:text-white">Simpan Perubahan</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Harga baru</dt>
                <dd className="font-semibold text-primary dark:text-white">{rupiah(form.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Stok baru</dt>
                <dd className="font-semibold dark:text-white">{form.stock}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={busy || !!fileError}
              className="btn-primary mt-4 w-full"
            >
              {busy ? "Menyimpan…" : " Simpan Perubahan"}
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

          <div className="card p-4 text-xs text-gray-500 dark:text-slate-400">
            <p className="font-semibold text-gray-700 dark:text-slate-300">ℹ Info</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Edit gratis, tidak ada biaya tambahan.</li>
              <li>Status barang tidak berubah.</li>
              <li>Perubahan langsung tayang.</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
