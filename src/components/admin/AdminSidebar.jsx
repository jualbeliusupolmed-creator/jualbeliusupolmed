"use client";

import Link from "next/link";
import AdminNav from "./AdminNav";
import { NAV } from "./nav";
import { useBasisAdmin } from "./basis";

export { NAV };

/**
 * Sidebar Panel Admin Utama (Desktop Rail).
 */
export default function AdminSidebar({ counts = {} }) {
  const basis = useBasisAdmin();
  return (
    <aside className="g-rail hidden lg:flex font-sans">
      {/* Brand Header */}
      <div className="g-rail-brand justify-between">
        <Link href={`${basis}/overview`} className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight">
              Kampusfess Admin
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
              USU • POLMED
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <AdminNav counts={counts} />

      {/* Sidebar Footer Info */}
      <div className="flex-shrink-0 border-t border-slate-100 p-3.5 dark:border-slate-850">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">Sistem Online</span>
          </div>
          <Link
            href="/"
            target="_blank"
            className="text-[10px] font-bold text-primary dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            Lihat Web ↗
          </Link>
        </div>
      </div>
    </aside>
  );
}
