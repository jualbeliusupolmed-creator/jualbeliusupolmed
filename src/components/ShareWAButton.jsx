"use client";

import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { buildListingShortPath } from "@/lib/listingCode";

export default function ShareWAButton({ listing }) {
  function shareUrl() {
    const base = typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id");
    const shortPath = buildListingShortPath(listing.listing_code);
    return shortPath ? `${base}${shortPath}` : `${base}/produk/${buildSlug(listing.title, listing.id)}`;
  }

  function shareText() {
    const cond = listing.condition === "new" ? " · Baru" : listing.condition === "used" ? " · Bekas" : "";
    const isRental = listing.type === "sewa";
    const priceStr = isRental && listing.rental_period
      ? `${rupiah(listing.price)}/${listing.rental_period}`
      : rupiah(listing.price);
    return (
      ` *${listing.title}*\n` +
      (listing.listing_code ? `#⃣ Kode: ${listing.listing_code}\n` : "") +
      ` ${priceStr}${cond}\n` +
      (listing.category ? ` ${listing.category}\n` : "") +
      `\n ${shareUrl()}\n` +
      `_Kampus Kita — komunitas mahasiswa lintas kampus_`
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
    <button onClick={handleShare} className="btn-outline flex items-center justify-center gap-1.5" title="Bagikan tautan barang ini">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      <span>Bagikan Tautan</span>
    </button>
  );
}
