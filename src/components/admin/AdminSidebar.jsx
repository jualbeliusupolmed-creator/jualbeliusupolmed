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
    <aside className="g-rail hidden lg:flex">
      {/* Brand Header */}
      <div className="g-rail-brand justify-between">
        <Link href={`${basis}/overview`} className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <span className="g-rail-brand-mark">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
          </span>
          <span className="g-rail-brand-text">
            <b>Admin</b> USU-POLMED
          </span>
        </Link>
      </div>

      {/* Navigation List */}
      <AdminNav counts={counts} />

      {/* Sidebar Footer Info */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-300">Sistem Normal</span>
          </div>
          <Link
            href={`${basis}/audit`}
            className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:underline dark:text-blue-400"
          >
            Audit
          </Link>
        </div>
      </div>
    </aside>
  );
}

