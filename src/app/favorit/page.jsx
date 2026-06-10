"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getFavorites } from "@/lib/favorites";

export default function FavoritPage() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => setItems(getFavorites());
    load();
    setLoaded(true);
    window.addEventListener("favorites-changed", load);
    return () => window.removeEventListener("favorites-changed", load);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">❤️ Favorit Saya</h1>
      <p className="mt-1 text-gray-500">
        Barang yang kamu simpan. Tersimpan di perangkat ini.
      </p>

      {loaded && items.length === 0 ? (
        <div className="card mt-6 grid place-items-center py-16 text-center text-gray-400">
          <p className="text-4xl">🤍</p>
          <p className="mt-2">Belum ada barang favorit.</p>
          <Link href="/" className="btn-primary mt-4">
            Jelajahi barang
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
