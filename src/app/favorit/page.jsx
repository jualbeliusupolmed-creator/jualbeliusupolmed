"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getFavorites, toggleFavorite } from "@/lib/favorites";

export default function FavoritPage() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const saved = getFavorites();
    setItems(saved);
    setLoaded(true);

    if (saved.length === 0) return;

    // Re-fetch status terkini dari server (harga, status sold/expired)
    setRefreshing(true);
    try {
      const ids = saved.map((l) => l.id).join(",");
      const res = await fetch(`/api/listings/batch?ids=${ids}`);
      if (!res.ok) return;
      const fresh = await res.json();
      const freshMap = Object.fromEntries(fresh.map((f) => [f.id, f]));

      setItems(saved.map((l) => ({ ...l, ...(freshMap[l.id] || {}) })));
    } catch {
      // Tetap pakai data localStorage kalau fetch gagal
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("favorites-changed", load);
    return () => window.removeEventListener("favorites-changed", load);
  }, []);

  const active = items.filter((l) => l.status === "active");
  const sold = items.filter((l) => l.status !== "active");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold"><span aria-hidden="true">❤️</span> Favorit Saya</h1>
          <p className="mt-1 text-gray-500">
            Barang yang kamu simpan. Tersimpan di perangkat ini, tanpa perlu login.
          </p>
        </div>
        {refreshing && (
          <span className="text-xs text-gray-400 animate-pulse shrink-0">Memperbarui…</span>
        )}
      </div>

      {loaded && items.length === 0 ? (
        <div className="card mt-6 grid place-items-center py-16 text-center text-gray-400">
          <p className="text-4xl" aria-hidden="true">🤍</p>
          <p className="mt-2">Belum ada barang favorit.</p>
          <Link href="/" className="btn-primary mt-4">
            Jelajahi barang
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              {sold.length > 0 && (
                <h2 className="mt-6 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Masih Tersedia ({active.length})
                </h2>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {active.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
            </>
          )}

          {sold.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Sudah Terjual / Tidak Aktif ({sold.length})
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 opacity-50">
                {sold.map((l) => (
                  <div key={l.id} className="relative">
                    <ProductCard listing={l} />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                      <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                        Tidak Aktif
                      </span>
                    </div>
                    <button
                      onClick={() => { toggleFavorite(l); load(); }}
                      className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-xs text-gray-500 shadow hover:bg-red-50 hover:text-red-500"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
