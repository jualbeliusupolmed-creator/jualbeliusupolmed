"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

// Tombol hati untuk menyimpan/melepas favorit. Sinkron antar-instance via event.
export default function FavoriteButton({ listing, className = "", size = "md" }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    const sync = () => setFav(isFavorite(listing.id));
    sync();
    window.addEventListener("favorites-changed", sync);
    return () => window.removeEventListener("favorites-changed", sync);
  }, [listing.id]);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(listing);
  }

  return (
    <button
      onClick={onClick}
      aria-label={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
      title={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
      className={`grid place-items-center rounded-full bg-white/90 shadow transition hover:scale-110 ${
        size === "lg" ? "h-10 w-10 text-xl" : "h-8 w-8 text-base"
      } ${className}`}
    >
      <span>{fav ? "❤️" : "🤍"}</span>
    </button>
  );
}
