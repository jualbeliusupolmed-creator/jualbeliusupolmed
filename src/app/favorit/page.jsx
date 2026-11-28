"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";

export default function FavoritPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const raw = JSON.parse(localStorage.getItem("kk_favorites") || "{}");
        const ids = Object.keys(raw).filter((k) => raw[k]);
        if (!ids.length) {
          setItems([]);
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/listings/batch?ids=${encodeURIComponent(ids.join(","))}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setItems(data);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, []);

  const removeFavorite = (id) => {
    try {
      const raw = JSON.parse(localStorage.getItem("kk_favorites") || "{}");
      delete raw[id];
      localStorage.setItem("kk_favorites", JSON.stringify(raw));
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Dihapus dari favorit");
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-14 font-sans text-[#101f15] dark:text-[#ecfeee]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-fill text-[24px]">favorite</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#003622] dark:text-white">Barang Favorit</h1>
              <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-400">
                Daftar produk yang kamu sukai di Kampus Kita.
              </p>
            </div>
          </div>
          <Link
            href="/keranjang"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white dark:bg-white/10 border border-[#e2f0e6] dark:border-white/10 text-xs font-bold text-[#101f15] dark:text-white hover:bg-[#e6f8e8] w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            Buka Keranjang
          </Link>
        </header>

        {loading ? (
          <div className="flex justify-center py-24">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2f0e6] border-t-[#134e35]" />
          </div>
        ) : items.length === 0 ? (
          <section className="flex min-h-[42dvh] flex-col items-center justify-center rounded-3xl border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-[#112218] p-8 text-center shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500">
              <span className="material-symbols-outlined text-[32px]">favorite_border</span>
            </div>
            <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Belum ada barang favorit</h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#707972] dark:text-slate-400">
              Ketuk ikon hati pada kartu produk di halaman Jual Beli untuk menyimpannya di sini.
            </p>
            <Link
              href="/jual-beli"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#003622] hover:bg-[#134e35] px-6 py-3 text-xs font-extrabold text-white shadow-sm transition"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              Jelajahi Marketplace
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <ProductCard listing={item} />
                <button
                  type="button"
                  onClick={() => removeFavorite(item.id)}
                  aria-label="Hapus dari favorit"
                  className="absolute right-2 top-2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-[#0a1710]/90 text-rose-500 shadow-xs flex items-center justify-center hover:bg-rose-500 hover:text-white transition"
                >
                  <span className="material-symbols-fill text-[16px]">favorite</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
