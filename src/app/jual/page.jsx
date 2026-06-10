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

          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label className="label">Tipe Iklan</label>
              <select className="input" value={form.type} onChange={set("type")}>
                <option value="barang">Barang — {rupiah(adFeeFor("barang"))}</option>
                <option value="poster">Poster — {rupiah(adFeeFor("poster"))}</option>
              </select>
            </div>
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
            <div className="sm:col-span-2">
              <label className="label">Judul</label>
              <input className="input" value={form.title} onChange={set("title")} placeholder="MacBook Air M1 2020 Mulus" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Deskripsi</label>
              <textarea className="input min-h-24" value={form.description} onChange={set("description")} placeholder="Kondisi, kelengkapan, lokasi COD…" />
            </div>
            <div>
              <label className="label">Harga (Rp)</label>
              <input type="number" min="0" className="input" value={form.price} onChange={set("price")} placeholder="7500000" />
            </div>
            <div>
              <label className="label">Stok</label>
              <input type="number" min="1" className="input" value={form.stock} onChange={set("stock")} />
            </div>
            <div>
              <label className="label">Nama Penjual</label>
              <input className="input" value={form.seller_name} onChange={set("seller_name")} placeholder="Nama kamu" />
            </div>
            <div>
              <label className="label">No. WhatsApp</label>
              <input className="input" value={form.seller_wa} onChange={set("seller_wa")} placeholder="0812xxxx" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold">Ringkasan</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipe</dt>
                <dd className="font-medium capitalize">{form.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Biaya iklan</dt>
                <dd className="font-medium">{rupiah(fee)}</dd>
              </div>
              <div className="my-2 border-t" />
              <div className="flex justify-between text-base">
                <dt className="font-semibold">Total bayar</dt>
                <dd className="font-extrabold text-primary">{rupiah(fee)}</dd>
              </div>
            </dl>
            <button type="submit" disabled={busy || !!fileError} className="btn-primary mt-4 w-full">
              {busy ? "Memproses…" : `Bayar ${rupiah(fee)}`}
            </button>
            {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          </div>

          <div className="card p-4 text-sm text-gray-500">
            <p className="font-semibold text-gray-700">ℹ️ Fee setelah deal</p>
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
