"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
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

      // Buka Midtrans Snap
      if (window.snap && data.snapToken) {
        const waParam = encodeURIComponent(form.seller_wa || "");
        localStorage.setItem("seller_wa", form.seller_wa);
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
        setMsg("Listing dibuat. Snap tidak tersedia — cek konfigurasi Midtrans.");
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
              {busy ? "Memproses…" : `Bayar ${rupiah(fee)}`}
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
    </div>
  );
}
