"use client";

import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";

export default function ShareWAButton({ listing }) {
  function shareUrl() {
    const base = typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id");
    return `${base}/produk/${buildSlug(listing.title, listing.id)}`;
  }

  function shareText() {
    const cond = listing.condition === "new" ? " · Baru" : listing.condition === "used" ? " · Bekas" : "";
    const isRental = listing.type === "sewa";
    const priceStr = isRental && listing.rental_period
      ? `${rupiah(listing.price)}/${listing.rental_period}`
      : rupiah(listing.price);
    return (
      `📦 *${listing.title}*\n` +
      `💰 ${priceStr}${cond}\n` +
      (listing.category ? `🏷️ ${listing.category}\n` : "") +
      `\n👉 ${shareUrl()}\n` +
      `_Jual Beli USU Polmed — COD area kampus_`
    );
  }

  async function handleShare() {
    const text = shareText();
    // Pakai native share sheet bila tersedia (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: listing.title, text, url: shareUrl() });
        return;
      } catch {
        // user batal / tidak didukung -> fallback ke WA
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener"
    );
  }

  return (
    <button onClick={handleShare} className="btn-outline">
      🟢 Bagikan ke WhatsApp
    </button>
  );
}
