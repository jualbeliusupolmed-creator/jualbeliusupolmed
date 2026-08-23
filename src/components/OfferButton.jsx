"use client";

import { useState } from "react";
import { rupiah } from "@/lib/fees";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function OfferButton({ listing }) {
  const [open, setOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    if (!offerPrice) {
      toast.error("Masukkan harga tawaran.");
      return;
    }
    setBusy(true);
    try {
      const priceNum = Number(offerPrice.replace(/\D/g, ""));
      const finalMessage = `Halo, saya ingin mengajukan tawaran sebesar ${rupiah(priceNum)} untuk barang ini.${message ? ' ' + message : ''}`;
      
      const res = await fetch("/api/chat/marketplace/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          message: finalMessage,
          offerPrice: priceNum
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Silakan masuk/login terlebih dahulu untuk menawar harga.");
          router.push("/dashboard/login");
          return;
        }
        throw new Error(data.error || "Gagal memulai chat");
      }
      
      toast.success("Tawaran terkirim!");
      setOpen(false);
      router.push(`/chat?room=${data.roomId}`);
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
                  value={offerPrice ? Number(offerPrice.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setOfferPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 500.000"
                  className="input text-sm"
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Pesan (opsional)</label>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Misal: bisa COD hari ini?" className="input text-sm" />
              </div>

              <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                {busy ? "Memproses…" : "💰 Chat Penjual & Ajukan Tawaran"}
              </button>
              <p className="text-[10px] text-center text-gray-400">Kamu akan diarahkan ke Obrolan Transaksi.</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
