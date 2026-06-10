"use client";

import { useEffect } from "react";

// Menambah 1 view saat halaman produk dibuka. Hanya sekali per sesi browser
// per listing (sessionStorage) supaya refresh tidak menggelembungkan angka.
export default function ViewTracker({ listingId }) {
  useEffect(() => {
    if (!listingId) return;
    const key = `viewed:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage bisa diblokir — tetap lanjut hitung
    }
    fetch(`/api/listings/${listingId}/view`, { method: "POST" }).catch(() => {});
  }, [listingId]);

  return null;
}
