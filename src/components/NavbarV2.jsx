"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Icon } from "@/components/Icons";
import { useSesi } from "@/components/SesiProvider";
import { getCartItems } from "@/lib/cart";

export default function NavbarV2() {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa, nama: sesiNama } = useSesi();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const updateCartCount = () => setCartCount(getCartItems().length);
    updateCartCount();
    window.addEventListener("cart-changed", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("cart-changed", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  const sessionName = sesiNama || "Akun";

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/jual-beli?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-white/[0.06] shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo Kiri */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Icon.GraduationCap className="w-4.5 h-4.5 text-emerald-200" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
              Kampus Kita
            </span>
          </Link>

          {/* Search Tengah (Prominent - Blibli style) */}
          <div className="hidden sm:flex items-center flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearch} className="relative w-full group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <Icon.Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari buku, elektronik, kost, dan lainnya…"
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800 transition-colors"
                aria-label="Cari"
              >
                <Icon.Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          {/* Aksi Kanan */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/keranjang"
              aria-label={`Keranjang${mounted && cartCount ? `, ${cartCount} barang` : ""}`}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon.ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {mounted && cartCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[5px] h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center px-1 shadow">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {mounted && sesiWa ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {sessionName[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline">{sessionName}</span>
              </Link>
            ) : (
              <Link
                href="/jual"
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-sm hover:bg-emerald-800 dark:hover:bg-emerald-600 transition-colors active:scale-95 whitespace-nowrap"
              >
                + Jual Barang
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
