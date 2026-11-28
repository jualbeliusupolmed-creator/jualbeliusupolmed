"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";
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
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [configError, setConfigError] = useState("");
  const [configAttempt, setConfigAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchConfig() {
      try {
        const res = await fetch("/api/config", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat kategori.");
        if (data?.categories?.length) setCats(data.categories);
        setConfigError("");
      } catch {
        if (!controller.signal.aborted) {
          setConfigError("Daftar kategori belum berhasil dimuat. Kategori tidak dapat diubah sampai daftar dari server termuat.");
        }
      }
    }

    void fetchConfig();
    return () => controller.abort();
  }, [configAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setForm(null);

    async function fetchListing() {
      try {
        const res = await fetch(`/api/listings/${id}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.listing) {
          throw new Error(data.error || "Barang tidak ditemukan.");
        }
        const listing = data.listing;
        setOriginal(listing);
        setForm({
          seller_name: listing.seller_name || "",
          title: listing.title || "",
          description: listing.description || "",
          price: listing.price || "",
          stock: listing.stock ?? 1,
          category: listing.category || CATEGORIES[0].name,
          area: listing.area || "",
        });
        const existing = listing.images?.length
          ? listing.images
          : listing.image_url
          ? [listing.image_url]
          : [];
        setMedia(existing.map((url) => ({ url, preview: url })));
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat data barang.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (id) {
      void fetchListing();
    } else {
      setLoadError("ID barang tidak tersedia.");
      setLoading(false);
    }

    return () => controller.abort();
  }, [id, loadAttempt]);

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
      <div className="mx-auto max-w-6xl px-4 py-10 pb-28">
        <div role="status" aria-live="polite" className="card flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
          <span aria-hidden="true" className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Memuat barang untuk diedit…</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 pb-28">
        <section role="alert" className="card space-y-4 p-6 text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Barang tidak dapat dimuat</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{loadError || "Periksa akses dan koneksi, lalu coba lagi."}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="btn-primary min-h-11">
              Coba lagi
            </button>
            <button type="button" onClick={() => router.push("/dashboard")} className="btn-outline min-h-11">
              Kembali ke Dashboard
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Edit Barang</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Perbarui detail barang <strong>{original?.title}</strong>.
        </p>
      </header>

      <form onSubmit={submit} aria-busy={busy} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <h2 className="label">Foto Barang</h2>
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
              <label htmlFor="edit-category" className="label">Kategori</label>
              <select id="edit-category" disabled={original?.status === "active" || Boolean(configError)} className="input focus:ring-4 focus:ring-accent/10 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800" value={form.category} onChange={set("category")}>
                {!cats.some((category) => category.name === form.category) && (
                  <option value={form.category}>{form.category} (saat ini)</option>
                )}
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {configError && (
                <div role="alert" className="mt-2 space-y-2 text-xs text-rose-700 dark:text-rose-300">
                  <p>{configError}</p>
                  <button type="button" onClick={() => setConfigAttempt((attempt) => attempt + 1)} className="font-semibold underline underline-offset-2">
                    Muat ulang kategori
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              Jangkauan jual mengikuti provinsi kampus pada profilmu.
            </div>
            <div>
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
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">Nama dan kategori dikunci selama barang aktif untuk mencegah daur ulang.</p>
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
                inputMode="numeric"
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

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <h2 className="font-bold text-slate-900 dark:text-white">Ringkasan Perubahan</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-300">Harga baru</dt>
                <dd className="font-semibold text-primary dark:text-white">{rupiah(form.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-300">Stok baru</dt>
                <dd className="font-semibold dark:text-white">{form.stock}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={busy || !!fileError}
              className="btn-primary mt-4 min-h-12 w-full disabled:cursor-not-allowed"
            >
              {busy ? "Menyimpan…" : " Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline mt-2 min-h-12 w-full"
            >
              Batal
            </button>
            {msg && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{msg}</p>}
          </div>

          <div className="card p-4 text-sm text-slate-600 dark:text-slate-300">
            <h2 className="font-semibold text-slate-900 dark:text-white">Informasi perubahan</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Edit tidak dikenai biaya tambahan.</li>
              <li>Perubahan judul atau kategori tertentu dapat memerlukan peninjauan ulang.</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
