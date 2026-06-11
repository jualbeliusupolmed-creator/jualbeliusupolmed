"use client";

import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function NativeShareButton({ listing }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Cek ${listing.title} di Jual Beli USU Polmed`,
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      toast.error("Browser Anda tidak mendukung fitur Share ini.");
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
