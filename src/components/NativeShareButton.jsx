"use client";

import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function NativeShareButton({ listing }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Cek ${listing.title} di Jual Beli Medan`,
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
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <Icon.Share className="h-4 w-4" />
      Bagikan
    </button>
  );
}
