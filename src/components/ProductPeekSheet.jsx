"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BottomSheet from "./BottomSheet";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { useTransactionMode } from "@/lib/useTransactionMode";
import { hapticLight } from "@/lib/haptics";

// Pratinjau produk yang muncul dari bawah saat tag produk di feed diketuk.
// Tujuannya satu: pengguna tidak kehilangan posisi gulirannya di feed sosial,
// jadi seluruh keputusan awal ("ini apa, berapa, masih ada?") selesai di sini.
export default function ProductPeekSheet({ listing, isOpen, onClose }) {
  const router = useRouter();
  const { isWaMode } = useTransactionMode();
  const [busy, setBusy] = useState(false);

  if (!listing) return null;

  const gambar =
    listing.image_url ||
    (Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : null);
  const terjual = listing.status && listing.status !== "active";
  const tautan = `/produk/${buildSlug(listing.title, listing.id)}`;

  const bukaDetail = () => {
    hapticLight();
    onClose();
    router.push(tautan);
  };

  // Mode WA butuh nomor penjual, dan nomor itu memang tidak pernah dikirim ke
  // feed publik — jadi di mode itu pembeli diantar ke halaman produk yang
  // mengambilnya dari server. Mode DM cukup dengan id iklan.
  const minat = async () => {
    if (terjual) return;
    hapticLight();
    if (isWaMode) {
      bukaDetail();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/chat/marketplace/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          message: `Halo, apakah "${listing.title}" masih tersedia?`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Masuk dulu untuk chat penjual.");
          onClose();
          router.push("/dashboard/login");
          return;
        }
        throw new Error(data.error || "Gagal memulai chat");
      }
      onClose();
      router.push(`/chat?room=${data.roomId}`);
    } catch (e) {
      toast.error(e.message || "Gagal memulai chat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Produk di postingan ini">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-black/[0.05] dark:bg-white/[0.06]">
          {gambar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gambar}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold text-[#1d1d1f] dark:text-white">
            {listing.title}
          </p>
          <p className="mt-1 text-lg font-extrabold tracking-tight text-primary dark:text-violet-400">
            {rupiah(listing.price)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {listing.condition && (
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-slate-300">
                {listing.condition === "new" ? "Baru" : "Bekas"}
              </span>
            )}
            {listing.category && (
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-slate-300">
                {listing.category}
              </span>
            )}
            {listing.campus && (
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-slate-300">
                📍 {listing.campus}
              </span>
            )}
          </div>
        </div>
      </div>

      {terjual && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          Iklan ini sudah tidak aktif lagi.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={bukaDetail}
          className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-xs font-bold text-[#1d1d1f] transition-all active:scale-[0.97] dark:border-white/[0.1] dark:bg-white/[0.08] dark:text-white"
        >
          Lihat detail
        </button>
        <button
          type="button"
          onClick={minat}
          disabled={busy || terjual}
          className="rounded-xl bg-wa px-4 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Memproses…" : "Minat / Chat"}
        </button>
      </div>
    </BottomSheet>
  );
}
