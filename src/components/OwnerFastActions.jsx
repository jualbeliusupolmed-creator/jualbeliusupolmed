"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatWa } from "@/lib/constants";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { useSesi } from "@/components/SesiProvider";

export default function OwnerFastActions({ listing }) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldPrice, setSoldPrice] = useState(listing?.price || 0);

  // Sesi bersama, bukan panggilan /api/auth/me sendiri. Komponen ini muncul
  // di setiap kartu iklan; satu panggilan per kartu berarti satu halaman
  // daftar bisa menanyakan hal yang sama belasan kali.
  const { wa: sesiWa, siap: sesiSiap } = useSesi();

  useEffect(() => {
    if (!sesiSiap || !sesiWa) return setIsOwner(false);
    const ownerWa = formatWa(listing?.seller_wa);
    const myWa = formatWa(sesiWa);
    setIsOwner(!!(ownerWa && myWa && ownerWa === myWa));
  }, [listing, sesiSiap, sesiWa]);

  if (!isOwner) return null;

  const isSold = listing?.status === "sold";

  const handleMarkSold = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_sold",
          sold_price: Number(soldPrice) || Number(listing.price) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status terjual");

      toast.success("Selamat! Iklan berhasil ditandai Terjual ");
      setShowSoldModal(false);
      router.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBump = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/payments/bump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyundul iklan");

      if (data.freeBumpUsed) {
        toast.success(" Berhasil disundul ke posisi atas menggunakan Free Bump!");
        router.refresh();
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.success(" Iklan berhasil dinaikkan ke atas!");
        router.refresh();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-emerald-500/10 border border-primary/20 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
            <span className="text-sm"><svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg></span>
            <span>Panel Aksi Cepat Pemilik</span>
          </div>
          <span className="text-[10px] bg-primary/20 text-primary dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
            Iklan Milikmu
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Edit Button */}
          <Link
            href={`/dashboard?edit=${listing.id}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            <span> Edit Iklan</span>
          </Link>

          {/* Mark Sold Button */}
          {!isSold ? (
            <button
              onClick={() => setShowSoldModal(true)}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <span> Tandai Terjual</span>
            </button>
          ) : (
            <span className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-200/60 dark:border-slate-700">
              <span> Sudah Laku</span>
            </span>
          )}

          {/* Bump / Sundul Button */}
          <button
            onClick={handleBump}
            disabled={busy || isSold}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <span> Sundul / Bump</span>
          </button>

          {/* Dashboard Link */}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <span> Dashboard</span>
          </Link>
        </div>
      </div>

      {/* MODAL TANDAI TERJUAL */}
      {showSoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span></span> Tandai Iklan Terjual
              </h4>
              <button
                onClick={() => setShowSoldModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <Icon.X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Barang <b>{listing.title}</b> akan ditandai sebagai <b>Terjual</b> dan tidak akan ditawarkan lagi ke pembeli baru.
            </p>

            <form onSubmit={handleMarkSold} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Harga Deal / Terjual (Rp)
                </label>
                <input
                  type="number"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSoldModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Konfirmasi Terjual"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
