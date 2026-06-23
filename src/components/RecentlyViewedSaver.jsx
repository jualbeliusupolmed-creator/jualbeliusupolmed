"use client";
import { useEffect } from "react";

const MAX_ITEMS = 10;
const KEY = "recently_viewed";

export default function RecentlyViewedSaver({ listing, slug }) {
  useEffect(() => {
    if (!listing?.id || !slug) return;
    try {
      const raw = localStorage.getItem(KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((item) => item.id !== listing.id);
      const entry = {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        image_url: listing.image_url || null,
        slug,
      };
      localStorage.setItem(KEY, JSON.stringify([entry, ...filtered].slice(0, MAX_ITEMS)));
    } catch {
      // localStorage mungkin diblokir
    }
  }, [listing?.id, slug]);

  return null;
}
