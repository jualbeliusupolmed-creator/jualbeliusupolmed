"use client";

import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";

// Bagikan produk via WhatsApp (atau native share di HP). Cocok untuk
// menyebarkan ke teman/grup — kanal utama audiens kampus.
export default function ShareWAButton({ listing }) {
  function shareUrl() {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/produk/${buildSlug(listing.title, listing.id)}`;
  }

  function shareText() {
    return (
      `*${listing.title}* — ${rupiah(listing.price)}\n` +
      `Lihat di Jual Beli USU Polmed:\n${shareUrl()}`
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
