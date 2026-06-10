"use client";

import { useState } from "react";
import { MARKETPLACE_WA } from "@/lib/constants";

// Tombol "Minat": kirim notif ke penjual (Fonnte) + buka WhatsApp penjual.
export default function MinatButton({ listing }) {
  const [busy, setBusy] = useState(false);

  async function handleMinat() {
    setBusy(true);
    try {
      // Notif ke penjual via server (Fonnte)
      await fetch("/api/minat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id }),
      }).catch(() => {});
    } finally {
      setBusy(false);
      const wa = (listing.seller_wa || MARKETPLACE_WA).replace(/\D/g, "");
      const text = encodeURIComponent(
        `Halo, saya minat dengan "${listing.title}" (Rp${Number(
          listing.price
        ).toLocaleString("id-ID")}) di Jual Beli USU Polmed.`
      );
      window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
    }
  }

  return (
    <button onClick={handleMinat} disabled={busy} className="btn-wa w-full">
      {busy ? "Memproses…" : "💬 Minat / Chat Penjual"}
    </button>
  );
}
