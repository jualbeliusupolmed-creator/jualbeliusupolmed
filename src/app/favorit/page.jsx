"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function FavoritPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem("mading_favorites") || "[]");
      if (!saved.length) {
        setFavorites([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("listings")
        .select("*, seller_profiles!inner(name, verified, avatar_url, subscription_tier, trusted_seller)")
        .in("id", saved);
        
      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      toast.error("Gagal memuat favorit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleStorage = (e) => {
      if (e.key === "mading_favorites") load();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleFavorite = (listing) => {
    const saved = JSON.parse(localStorage.getItem("mading_favorites") || "[]");
    const newSaved = saved.filter(id => id !== listing.id);
    localStorage.setItem("mading_favorites", JSON.stringify(newSaved));
    window.dispatchEvent(new Event("storage"));
    toast.success("Dihapus dari favorit");
  };

  const active = favorites.filter(f => f.status === "active");
  const sold = favorites.filter(f => f.status !== "active");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 md:px-6 md:pb-12">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-white sm:text-3xl">
        Favorit Saya
      </h1>
      <p className="mb-8 text-sm text-[#6e6e73] dark:text-slate-400">
        Barang-barang yang kamu simpan untuk dilihat lagi.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" /></div>
      ) : favorites.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><Icon.Heart className="h-6 w-6" /></div>
          <p className="mt-4 font-medium text-[#1d1d1f] dark:text-white">Belum ada barang favorit.</p>
          <p className="mt-1 text-sm">Simpan barang yang ingin kamu lihat lagi nanti.</p>
          <Link href="/" className="btn-primary mt-4">
            Jelajahi barang
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              {sold.length > 0 && (
                <h2 className="mt-8 text-sm font-semibold text-[#6e6e73] dark:text-slate-400">
                  Masih Tersedia ({active.length})
                </h2>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {active.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
            </>
          )}

          {sold.length > 0 && (
            <>
              <h2 className="mt-10 text-sm font-semibold text-[#6e6e73] dark:text-slate-400">
                Sudah Terjual / Tidak Aktif ({sold.length})
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 opacity-50">
                {sold.map((l) => (
                  <div key={l.id} className="relative">
                    <ProductCard listing={l} />
                    <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/30">
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
