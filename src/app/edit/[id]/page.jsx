"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORIES, POPULAR_AREAS } from "@/lib/constants";
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
  const [areaOption, setAreaOption] = useState("");
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
          campus: l.campus || "Semua",
          area: l.area || "",
        });
        if (l.area) {
          if (POPULAR_AREAS.includes(l.area)) {
            setAreaOption(l.area);
          } else {
            setAreaOption("Lainnya");
          }
        } else {
          setAreaOption("");
        }
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

  const handleAreaOptionChange = (e) => {
    const val = e.target.value;
    setAreaOption(val);
    if (val !== "Lainnya") {
      setForm((f) => ({ ...f, area: val }));
    }
  };

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
          campus: form.campus,
          area: form.area,
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

          <div className="card grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <label className="label">Kategori</label>
              <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.category} onChange={set("category")}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target Kampus</label>
              <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.campus} onChange={set("campus")}>
                <option value="Semua">Semua (USU &amp; POLMED)</option>
                <option value="USU">USU</option>
                <option value="POLMED">POLMED</option>
              </select>
            </div>
            <div>
              <label className="label">Lokasi COD Kampus</label>
              <select
                className="input focus:ring-4 focus:ring-accent/10 focus:border-accent"
                value={areaOption}
                onChange={handleAreaOptionChange}
              >
                <option value="">Pilih Lokasi COD</option>
                {POPULAR_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="Lainnya">Lainnya (Ketik Manual)</option>
              </select>
            </div>
            {areaOption === "Lainnya" && (
              <div className="floating-group mt-5">
                <input
                  id="edit-area"
                  className="floating-input peer"
                  value={form.area}
                  onChange={set("area")}
                  placeholder=" "
                  required
                />
                <label htmlFor="edit-area" className="floating-label">Ketik Manual Lokasi COD (misal: Fasilkom, Gedung C)</label>
              </div>
            )}
            
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
                className="floating-input peer"
                value={form.title}
                onChange={set("title")}
                placeholder=" "
                required
              />
              <label htmlFor="edit-title" className="floating-label">Judul Iklan</label>
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

          <div className="card p-4 text-xs text-gray-500 dark:text-slate-400">
            <p className="font-semibold text-gray-700 dark:text-slate-350">ℹ️ Info</p>
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
