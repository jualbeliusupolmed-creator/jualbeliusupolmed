"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Pemindah mode: Iklan & Jualan ⟷ Toko Saya.
 *
 * Dulu keduanya halaman terpisah dan tombol ini membandingkan `pathname`.
 * Sejak penyuntingan toko pindah ke Profil Satu Pintu, "Toko Saya" bukan lagi
 * alamat lain melainkan tab profil — jadi yang dibandingkan sekarang `?tab=`.
 * Tanpa perubahan ini tombolnya tetap berpindah (pengalihan menangkapnya), tapi
 * tidak pernah tampak aktif, dan tombol yang tidak menunjukkan di mana kita
 * berada terasa rusak meski berfungsi.
 */
export default function DashboardModeToggle({ storeStatus, activeCount }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isToko = pathname?.startsWith("/dashboard/toko") || params.get("tab") === "profil";

  return (
    <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner w-full sm:w-auto">
      <Link
        href="/dashboard"
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 ${
          !isToko
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <span> Iklan &amp; Jualan</span>
        {activeCount !== undefined && activeCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
            {activeCount}
          </span>
        )}
      </Link>

      <Link
        href="/dashboard?tab=profil"
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 ${
          isToko
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <span> Toko Saya</span>
        {storeStatus === "aktif" && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="Toko Aktif" />
        )}
        {storeStatus === "menunggu" && (
          <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20" title="Menunggu Persetujuan" />
        )}
      </Link>
    </div>
  );
}
