"use client";

import { useState } from "react";
import { rupiah } from "@/lib/fees";
import { toast } from "sonner";

export default function OfferButton({ listing }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ buyer_name: "", buyer_wa: "", offer_price: "", message: "" });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.buyer_name || !form.buyer_wa || !form.offer_price) {
      toast.error("Lengkapi nama, WA, dan harga tawaran.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_name: form.buyer_name,
          buyer_wa: form.buyer_wa,
          offer_price: Number(form.offer_price.replace(/\D/g, "")),
          message: form.message || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Tawaran terkirim! Penjual akan menghubungi kamu via WhatsApp.");
      setOpen(false);
      setForm({ buyer_name: "", buyer_wa: "", offer_price: "", message: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-outline w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
      >
        💰 Ajukan Tawaran Harga
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <p className="font-bold text-sm text-gray-900 dark:text-white">💰 Tawaran Harga</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Harga listing: <strong className="text-gray-800 dark:text-white">{rupiah(listing.price)}</strong>
              </p>

              <div>
                <label className="label text-xs">Harga Tawaranmu (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.offer_price ? Number(form.offer_price.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm((f) => ({ ...f, offer_price: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Contoh: 500.000"
                  className="input text-sm"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Namamu</label>
                <input type="text" value={form.buyer_name} onChange={set("buyer_name")} placeholder="Nama Lengkap" className="input text-sm" required />
              </div>
              <div>
                <label className="label text-xs">Nomor WhatsApp</label>
                <input type="tel" value={form.buyer_wa} onChange={set("buyer_wa")} placeholder="08xxxxxxxxxx" className="input text-sm" required />
              </div>
              <div>
                <label className="label text-xs">Pesan (opsional)</label>
                <input type="text" value={form.message} onChange={set("message")} placeholder="Misal: bisa COD hari ini?" className="input text-sm" />
              </div>

              <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                {busy ? "Mengirim…" : "💰 Kirim Tawaran"}
              </button>
              <p className="text-[10px] text-center text-gray-400">Penjual akan membalas via WhatsApp jika tertarik.</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
