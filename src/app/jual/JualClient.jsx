"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { adFee, rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";
import { CATEGORIES, MARKETPLACE_WA, POPULAR_AREAS, formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import { toast } from "sonner";
export default function JualPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    seller_name: "",
    seller_wa: "",
    title: "",
    description: "",
    price: "",
    stock: 1,
    category: CATEGORIES[0].name,
    type: "barang",
    campus: "Semua",
    area: "",
  });
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const [msg, setMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [createdListing, setCreatedListing] = useState(null);
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [areaOption, setAreaOption] = useState("");

  const [cfg, setCfg] = useState(null);
  
  // Auto-fill from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWa = localStorage.getItem("seller_wa") || "";
      const savedName = localStorage.getItem("seller_name") || "";
      if (savedWa || savedName) {
        setForm((f) => ({
          ...f,
          seller_wa: savedWa || f.seller_wa,
          seller_name: savedName || f.seller_name,
        }));
      }
    }
    
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});
  }, []);

  const cats = cfg?.categories?.length ? cfg.categories : CATEGORIES;
  const adFeeFor = (type) =>
    cfg?.pricing
      ? type === "poster"
        ? cfg.pricing.adPoster
        : cfg.pricing.adBarang
      : adFee(type);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fee = adFeeFor(form.type);

  const handleAreaOptionChange = (e) => {
    const val = e.target.value;
    setAreaOption(val);
    if (val !== "Lainnya") {
      setForm((f) => ({ ...f, area: val }));
    }
  };

  function handlePreviewClick(e) {
    e.preventDefault();
    const formattedWa = formatWa(form.seller_wa);
    if (!form.seller_name || !formattedWa || !form.title || !form.price) {
      toast.error("Lengkapi nama, WA, judul, dan harga.");
      return;
    }
    setShowPreviewModal(true);
  }

  async function submit() {
    const formattedWa = formatWa(form.seller_wa);
    if (!form.seller_name || !formattedWa || !form.title || !form.price) {
      toast.error("Lengkapi nama, WA, judul, dan harga.");
      return;
    }
    setShowPreviewModal(false);
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      const image_url = images[0] || null;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seller_wa: formattedWa, image_url, images }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal membuat listing");

      localStorage.setItem("seller_wa", formattedWa);
      localStorage.setItem("seller_name", form.seller_name);

      if (data.isPro) {
        toast.success("Iklan berhasil ditayangkan! (Gratis via Paket Pro)");
        const waParam = encodeURIComponent(formattedWa);
        router.push(`/dashboard?wa=${waParam}`);
        return;
      }

      if (paymentMethod === "otomatis") {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          toast.error("Metode otomatis gagal membuat link iPaymu. Silakan gunakan metode manual.");
        }
      } else {
        // Metode manual
        setCreatedListing(data.listing);
        setShowQRISModal(true);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">


      <h1 className="text-2xl font-extrabold">Pasang Iklan</h1>
      <p className="mt-1 text-gray-500">
        Isi detail barang, bayar biaya iklan, iklan otomatis tayang setelah
        pembayaran sukses.
      </p>

      <form onSubmit={handlePreviewClick} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Upload */}
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
              <label className="label">Tipe Iklan</label>
              <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.type} onChange={set("type")}>
                <option value="barang">Barang — {rupiah(adFeeFor("barang"))}</option>
                <option value="poster">Poster — {rupiah(adFeeFor("poster"))}</option>
              </select>
            </div>
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
                  id="form-area"
                  className="floating-input peer" 
                  value={form.area} 
                  onChange={set("area")} 
                  placeholder=" "
                  required
                />
                <label htmlFor="form-area" className="floating-label">Ketik Manual Lokasi COD (misal: Fasilkom, Gedung C)</label>
              </div>
            )}
            
            {/* Floating Input Groups */}
            <div className="sm:col-span-2 floating-group">
              <input 
                id="form-title"
                className="floating-input peer" 
                value={form.title} 
                onChange={set("title")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-title" className="floating-label">Judul Iklan</label>
            </div>
            
            <div className="sm:col-span-2 floating-group">
              <textarea 
                id="form-description"
                className="floating-input peer min-h-24" 
                value={form.description} 
                onChange={set("description")} 
                placeholder=" " 
              />
              <label htmlFor="form-description" className="floating-label">Deskripsi Lengkap (kondisi, minus, dll)</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-price"
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
              <label htmlFor="form-price" className="floating-label">Harga (Rp)</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-stock"
                type="number" 
                min="1" 
                className="floating-input peer" 
                value={form.stock} 
                onChange={set("stock")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-stock" className="floating-label">Stok Barang</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-seller-name"
                className="floating-input peer" 
                value={form.seller_name} 
                onChange={set("seller_name")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-seller-name" className="floating-label">Nama Penjual</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-seller-wa"
                className="floating-input peer" 
                value={form.seller_wa} 
                onChange={set("seller_wa")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-seller-wa" className="floating-label">Nomor WhatsApp</label>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Pilih Metode Pembayaran</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("manual")}
                className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all active:scale-[0.99] ${
                  paymentMethod === "manual"
                    ? "border-primary bg-primary/5 dark:border-white dark:bg-white/5"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900/10 dark:hover:border-slate-700"
                }`}
              >
                <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  📸 QRIS Manual (Scan)
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Scan QRIS manual & kirim bukti transfer ke WhatsApp.
                </span>
                <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold mt-2.5 bg-green-50 dark:bg-green-950/40 px-2 py-1 rounded-md">
                  ✅ QRIS manual aktif siap pakai
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("otomatis")}
                className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all active:scale-[0.99] ${
                  paymentMethod === "otomatis"
                    ? "border-primary bg-primary/5 dark:border-white dark:bg-white/5"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900/10 dark:hover:border-slate-700"
                }`}
              >
                <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  ⚡ Pembayaran Otomatis
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  QRIS Instan, Virtual Account, & E-wallet.
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                  ⚠️ Belum lengkap (Sandbox/Test)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold dark:text-white">Ringkasan</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Tipe</dt>
                <dd className="font-medium capitalize dark:text-white">{form.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Metode</dt>
                <dd className="font-medium capitalize dark:text-white">{paymentMethod}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Biaya iklan</dt>
                <dd className="font-medium dark:text-white">{rupiah(fee)}</dd>
              </div>
              <div className="my-2 border-t dark:border-slate-800" />
              <div className="flex justify-between text-base">
                <dt className="font-semibold dark:text-white">Total bayar</dt>
                <dd className="font-extrabold text-primary dark:text-white">{rupiah(fee)}</dd>
              </div>
            </dl>
            <button type="submit" disabled={busy || !!fileError} className="btn-primary mt-4 w-full">
              Preview Iklan
            </button>
            {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          </div>

          <div className="card p-4 text-sm text-gray-500 dark:text-slate-400">
            <p className="font-semibold text-gray-700 dark:text-slate-300">ℹ️ Fee setelah deal</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>&lt; Rp50.000 → Rp2.000</li>
              <li>&lt; Rp100.000 → 10%</li>
              <li>≥ Rp100.000 → 5%</li>
            </ul>
          </div>
        </div>
      </form>

      {/* Modal QRIS Manual */}
      {showQRISModal && createdListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 animate-fade-in">
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                📸 QRIS Pembayaran Manual
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Lakukan pembayaran manual dengan scan QRIS berikut:
              </p>
              
              <div className="mt-4 bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm mx-auto">
                <Image 
                  src="/qris.png" 
                  alt="QRIS Jual Beli USU Polmed" 
                  width={400}
                  height={400}
                  className="max-h-[260px] object-contain"
                />
              </div>

              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-150/40 dark:border-slate-850">
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Nominal Transfer</p>
                <p className="text-2xl font-black text-primary dark:text-white mt-0.5">{rupiah(fee)}</p>
              </div>

              <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 text-left leading-relaxed bg-accent/5 p-3 rounded-xl border border-accent/20">
                👉 <strong>Langkah selanjutnya:</strong> Setelah scan dan bayar, klik tombol <strong>Konfirmasi via WhatsApp</strong> di bawah untuk mengirimkan bukti transfer ke admin agar iklan Anda langsung tayang.
              </p>

              <div className="mt-5 space-y-2.5">
                <a
                  href={`https://wa.me/${cfg?.contact?.marketplaceWa || MARKETPLACE_WA}?text=${encodeURIComponent(
                    `Halo Admin, saya sudah membayar biaya pendaftaran iklan manual sebesar ${rupiah(fee)} untuk produk "${createdListing.title}".\n\n🔗 *Cek langsung iklannya di sini:*\nhttps://www.jualbeliusupolmed.web.id/admin/listings/${buildSlug(createdListing.title, createdListing.id)}\n\nDetail Iklan:\n- Penjual: ${createdListing.seller_name}\n- WA: ${createdListing.seller_wa}\n\nMohon bantuannya untuk mengaktifkan iklan saya. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-wa w-full text-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  💬 Konfirmasi via WhatsApp
                </a>
                
                <button
                  type="button"
                  onClick={() => {
                    const waParam = encodeURIComponent(form.seller_wa || "");
                    router.push(`/dashboard?pending=1&wa=${waParam}`);
                  }}
                  className="btn-outline w-full text-center py-2.5 text-xs text-gray-600 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Buka Dashboard Saya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl bg-white p-6 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Preview Iklan
              </h2>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden mb-6">
              {media.length > 0 ? (
                <div className="aspect-video w-full bg-gray-100 dark:bg-slate-800 relative">
                  {/* For preview, we use objectURL of the first file if available */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={media[0].preview || media[0].url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="text-gray-400">Tidak ada foto</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-lg dark:text-white line-clamp-2">{form.title}</h3>
                  <div className="text-xl font-black text-primary flex-shrink-0">{rupiah(form.price)}</div>
                </div>
                <div className="mt-2 text-sm text-gray-500 line-clamp-3">
                  {form.description || "Tidak ada deskripsi"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge badge-primary">{form.category}</span>
                  <span className="badge badge-outline">{form.campus}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="btn-outline flex-1"
                disabled={busy}
              >
                Edit Kembali
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="btn-primary flex-1"
              >
                {busy ? "Memproses…" : `Konfirmasi & ${paymentMethod === "manual" ? 'Dapatkan QRIS' : 'Bayar ' + rupiah(fee)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
