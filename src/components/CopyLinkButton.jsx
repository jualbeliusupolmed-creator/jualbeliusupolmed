"use client";

import { useState } from "react";

export default function CopyLinkButton({ listing }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `${process.env.NEXT_PUBLIC_BASE_URL || ""}/produk/${listing.id}`;

  async function handleCopy() {
    try {
      if (navigator.share) {
        // Native share (mobile)
        await navigator.share({
          title: listing.title,
          text: `Cek barang ini di Jual Beli USU Polmed: ${listing.title} — ${
            listing.price
              ? `Rp${Number(listing.price).toLocaleString("id-ID")}`
              : ""
          }`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // fallback: copy saja
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-outline flex items-center justify-center gap-1.5 text-xs font-medium"
    >
      {copied ? (
        <>✅ Tersalin!</>
      ) : (
        <>🔗 Salin Link</>
      )}
    </button>
  );
}
