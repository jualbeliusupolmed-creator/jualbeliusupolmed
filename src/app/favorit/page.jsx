"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { getFavorites, toggleFavorite } from "@/lib/favorites";

export default function FavoritPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const localFavs = getFavorites();
      if (!localFavs.length) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Render data lokal terlebih dahulu agar instan (Zero Layout Shift)
      setFavorites(localFavs);

      // Sinkronkan status terkini dari server endpoint /api/listings/batch
      const ids = localFavs.map((f) => f.id).filter(Boolean);
      if (ids.length > 0) {
        const res = await fetch(`/api/listings/batch?ids=${encodeURIComponent(ids.join(","))}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Pertahankan urutan favorit lokal, perbarui data produk terbaru
            const map = new Map(data.map((item) => [item.id, item]));
            const refreshed = localFavs
              .map((f) => {
                const live = map.get(f.id);
                return live ? { ...f, ...live } : f;
              })
              .filter(Boolean);
            setFavorites(refreshed);
          }
        }
      }
    } catch {
      // Jika offline atau jaringan lambat, snapshot data lokal tetap tampil
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handleSync = () => load();
    window.addEventListener("favorites-changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("favorites-changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [load]);

  const handleRemove = (listing) => {
    toggleFavorite(listing);
    toast.success("Dihapus dari favorit");
  };

  const active = favorites.filter((f) => !f.status || f.status === "active");
  const inactive = favorites.filter((f) => f.status && f.status !== "active");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 md:px-6 md:pb-12">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1d1d1f] dark:text-white sm:text-3xl">
          Favorit Saya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Daftar barang dan jasa yang kamu simpan untuk dilihat kembali.
        </p>
      </div>

      {loading && favorites.length === 0 ? (
        <div className="flex justify-center py-24">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary dark:border-slate-700" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex min-h-[45vh] flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-3xl border border-black/[0.05] dark:border-white/[0.06] shadow-xs">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-500 mb-4">
            <Icon.Heart className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white">
            Belum ada barang favorit
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            Ketuk ikon hati pada iklan apa pun di marketplace untuk menyimpannya di sini.
          </p>
          <Link
            href="/jual-beli"
            className="btn-primary mt-5 px-5 py-2.5 text-xs font-bold shadow-md inline-flex items-center gap-2"
          >
            <Icon.ShoppingBag className="w-4 h-4" />
            <span>Jelajahi Marketplace</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              {inactive.length > 0 && (
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Masih Tersedia ({active.length})
                </h2>
              )}
              <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {active.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sudah Terjual / Tidak Aktif ({inactive.length})
              </h2>
              <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 opacity-60">
                {inactive.map((l) => (
                  <div key={l.id} className="relative group">
                    <ProductCard listing={l} />
                    <button
                      onClick={() => handleRemove(l)}
                      aria-label="Hapus dari favorit"
                      className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full bg-black/75 text-white text-[10px] font-bold backdrop-blur-sm hover:bg-rose-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
