"use client";

import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function NativeShareButton({ listing }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Cek ${listing.title} di Kampus Kita`,
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Browser tanpa Web Share API (mis. desktop Firefox): salin link saja
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link disalin ke clipboard");
      } catch {
        toast.error("Gagal menyalin link. Salin manual dari address bar ya.");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors"
      aria-label="Bagikan informasi barang ini"
    >
      <Icon.Share className="h-4 w-4" aria-hidden="true" />
      <span>Bagikan</span>
    </button>
  );
}
