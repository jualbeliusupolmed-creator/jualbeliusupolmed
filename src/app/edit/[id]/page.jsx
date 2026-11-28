"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
      <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] flex flex-col items-center justify-center px-4 py-20 text-[#404943] dark:text-slate-400">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#134e35] border-t-transparent" />
        <p className="mt-3 text-sm font-semibold">Memuat data barang…</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h1 className="text-lg font-extrabold text-[#101f15] dark:text-white">{msg || "Barang tidak ditemukan."}</h1>
        <Link href="/dashboard" className="mt-4 px-5 py-2.5 rounded-full bg-[#003622] text-white text-xs font-extrabold">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const descLen = (form.description || "").length;
  const previewImg = media[0]?.preview || media[0]?.url || null;

  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-14 font-sans text-[#101f15] dark:text-[#ecfeee]">
      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0f1e15]/95 backdrop-blur-md border-b border-[#e2f0e6] dark:border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-[#e6f8e8] dark:hover:bg-white/10"
              aria-label="Kembali"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-[#003622] dark:text-white leading-tight">Edit Barang</h1>
              <p className="text-[11px] text-[#707972] truncate max-w-[220px]">{original?.title}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#e6f8e8] text-[#134e35] text-[10px] font-extrabold">
            Gratis
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#134e35] dark:text-[#bef264] hover:underline mb-2">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Kembali ke Dashboard
            </Link>
            <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">Edit Barang Jualan</h1>
            <p className="text-sm text-[#404943] dark:text-slate-400">
              Perbarui detail barang <span className="font-bold text-[#101f15] dark:text-white">{original?.title}</span>.
            </p>
          </div>
        </div>

        <form id="edit-listing-form" onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Left Tips */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">tips_and_updates</span>
              </div>
              <h2 className="text-sm font-extrabold text-[#003622] dark:text-white">Info Pembaruan</h2>
              <ul className="space-y-2 text-xs text-[#404943] dark:text-slate-300 leading-relaxed">
                <li className="flex gap-2"><span className="text-[#134e35] font-bold">✓</span> Edit detail barang 100% gratis tanpa biaya tambahan.</li>
                <li className="flex gap-2"><span className="text-[#134e35] font-bold">✓</span> Status tayang &amp; riwayat dilihat tetap terjaga.</li>
                <li className="flex gap-2"><span className="text-[#134e35] font-bold">✓</span> Perubahan harga atau stok langsung tampil di marketplace.</li>
              </ul>
            </div>
          </aside>

          {/* Center Form */}
          <div className="lg:col-span-6 space-y-5">
            {/* Upload Foto */}
            <section className="bg-white dark:bg-[#112218] rounded-3xl p-5 border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[#003622] dark:text-white">Foto Produk (Maks. 5)</h2>
                <span className="text-[11px] font-semibold text-[#707972]">{media.length}/5 foto</span>
              </div>
              <MediaUploader
                media={media}
                setMedia={setMedia}
                max={5}
                error={fileError}
                setError={setFileError}
              />
            </section>

            {/* Detail Barang */}
            <section className="bg-white dark:bg-[#112218] rounded-3xl p-5 border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <h2 className="text-sm font-extrabold text-[#003622] dark:text-white">Informasi Produk</h2>

              <div>
                <label htmlFor="edit-title" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Nama / Judul Barang
                </label>
                <input
                  id="edit-title"
                  className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-4 py-3 text-sm font-semibold text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35] disabled:opacity-50"
                  value={form.title}
                  onChange={set("title")}
                  required
                  disabled={original?.status === "active"}
                />
                {original?.status === "active" && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    Nama &amp; kategori dikunci setelah barang aktif untuk mencegah penyalahgunaan.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">Kategori</label>
                  <select
                    disabled={original?.status === "active"}
                    className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-4 py-3 text-sm font-semibold text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35] disabled:opacity-50"
                    value={form.category}
                    onChange={set("category")}
                  >
                    {cats.map((c) => (
                      <option key={c.slug} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-seller-name" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                    Nama Penjual
                  </label>
                  <input
                    id="edit-seller-name"
                    className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-4 py-3 text-sm text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                    value={form.seller_name}
                    onChange={set("seller_name")}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-price" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                    Harga (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#707972]">Rp</span>
                    <input
                      id="edit-price"
                      type="text"
                      className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 pl-10 pr-4 py-3 text-sm font-bold text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                      value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        setForm((f) => ({ ...f, price: cleaned }));
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-stock" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                    Stok Barang
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, stock: Math.max(0, Number(f.stock || 0) - 1) }))}
                      className="w-11 h-11 rounded-2xl bg-[#e6f8e8] dark:bg-white/10 text-[#003622] dark:text-white font-extrabold flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      id="edit-stock"
                      type="number"
                      min="0"
                      className="flex-1 text-center rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 py-3 text-sm font-bold text-[#101f15] dark:text-white focus:outline-none"
                      value={form.stock}
                      onChange={set("stock")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, stock: Number(f.stock || 0) + 1 }))}
                      className="w-11 h-11 rounded-2xl bg-[#e6f8e8] dark:bg-white/10 text-[#003622] dark:text-white font-extrabold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-area" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Lokasi COD Kampus
                </label>
                <input
                  id="edit-area"
                  className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-4 py-3 text-sm text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                  value={form.area}
                  onChange={set("area")}
                  placeholder="Mis. Pendopo USU, Pintu 1, Kantin Polmed"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="edit-description" className="block text-xs font-bold text-[#101f15] dark:text-white">
                    Deskripsi Lengkap
                  </label>
                  <span className="text-[11px] text-[#707972]">{descLen}/500</span>
                </div>
                <textarea
                  id="edit-description"
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-2xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 p-4 text-sm text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
                  value={form.description}
                  onChange={set("description")}
                />
              </div>
            </section>
          </div>

          {/* Right Live Preview & Actions */}
          <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#707972]">Pratinjau &amp; Simpan</h3>

              <div className="rounded-2xl overflow-hidden border border-[#e2f0e6] dark:border-white/10 bg-[#f4faf5] dark:bg-white/5">
                <div className="aspect-[4/3] bg-[#e6f8e8] dark:bg-[#134e35]/30 flex items-center justify-center overflow-hidden">
                  {previewImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImg} alt={form.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[40px] text-[#134e35]/40">image</span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-bold text-[#101f15] dark:text-white line-clamp-1">{form.title || "Judul Barang"}</p>
                  <p className="text-sm font-extrabold text-[#003622] dark:text-[#bef264]">{rupiah(form.price || 0)}</p>
                  <p className="text-[11px] text-[#707972]">Stok: {form.stock} • {form.area || "Kampus"}</p>
                </div>
              </div>

              {msg && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {msg}
                </div>
              )}

              <div className="hidden lg:flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={busy || !!fileError}
                  className="w-full py-3 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-extrabold transition disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full py-2.5 rounded-full border border-[#e2f0e6] dark:border-white/15 text-xs font-bold text-[#404943] dark:text-slate-300 hover:bg-[#f4faf5] dark:hover:bg-white/5"
                >
                  Batal
                </button>
              </div>
            </div>
          </aside>
        </form>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1e15]/95 backdrop-blur-md border-t border-[#e2f0e6] dark:border-white/10 px-4 py-3 flex gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 rounded-full border border-[#e2f0e6] dark:border-white/15 text-xs font-bold text-[#404943] dark:text-slate-300"
        >
          Batal
        </button>
        <button
          type="submit"
          form="edit-listing-form"
          disabled={busy || !!fileError}
          className="flex-1 py-3 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-extrabold disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
