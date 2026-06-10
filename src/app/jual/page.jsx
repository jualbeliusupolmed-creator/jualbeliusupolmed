"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { CATEGORIES, MARKETPLACE_WA } from "@/lib/constants";
import { adFee, rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";

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
  });
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [fileError, setFileError] = useState("");
  
  const [paymentMethod, setPaymentMethod] = useState("otomatis");
  const [createdListing, setCreatedListing] = useState(null);
  const [showQRISModal, setShowQRISModal] = useState(false);

  const [cfg, setCfg] = useState(null);
  useEffect(() => {
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

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!form.seller_name || !form.seller_wa || !form.title || !form.price) {
      setMsg("Lengkapi nama, WA, judul, dan harga.");
      return;
    }
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      const image_url = images[0] || null;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat listing");

      const waParam = encodeURIComponent(form.seller_wa || "");
      localStorage.setItem("seller_wa", form.seller_wa);

      if (paymentMethod === "otomatis") {
        // Buka Midtrans Snap
        if (window.snap && data.snapToken) {
          window.snap.pay(data.snapToken, {
            onSuccess: () => router.push(`/dashboard?paid=1&wa=${waParam}`),
            onPending: () => router.push(`/dashboard?pending=1&wa=${waParam}`),
            onError: () => setMsg("Pembayaran gagal, coba lagi."),
            onClose: () => {
              setMsg("Pembayaran dibatalkan. Iklan tersimpan sebagai pending.");
              router.push(`/dashboard?pending=1&wa=${waParam}`);
            },
          });
        } else {
          setMsg("Metode otomatis gagal (mode sandbox/test). Silakan gunakan QRIS Manual di atas.");
        }
      } else {
        // Metode manual
        setCreatedListing(data.listing);
        setShowQRISModal(true);
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Script src={snapUrl} data-client-key={clientKey} strategy="afterInteractive" />

      <h1 className="text-2xl font-extrabold">Pasang Iklan</h1>
      <p className="mt-1 text-gray-500">
        Isi detail barang, bayar biaya iklan, iklan otomatis tayang setelah
        pembayaran sukses.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
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
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            
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
                type="number" 
                min="0" 
                className="floating-input peer" 
                value={form.price} 
                onChange={set("price")} 
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
              {busy ? "Memproses…" : paymentMethod === "manual" ? `Dapatkan QRIS Manual` : `Bayar ${rupiah(fee)}`}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/qris.png" 
                  alt="QRIS Jual Beli USU Polmed" 
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
                    `Halo Admin, saya sudah membayar biaya pendaftaran iklan manual sebesar ${rupiah(fee)} untuk produk "${createdListing.title}".\n\nDetail Iklan:\n- ID: ${createdListing.id}\n- Penjual: ${createdListing.seller_name}\n- WA: ${createdListing.seller_wa}\n\nMohon bantuannya untuk mengaktifkan iklan saya. Terima kasih!`
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
    </div>
  );
}
