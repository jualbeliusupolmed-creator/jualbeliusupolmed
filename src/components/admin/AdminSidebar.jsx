"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminProvider";

const ICONS = {
  overview: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  listings: "M4 6h16M4 12h16M4 18h16",
  transaksi: "M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  rating: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  reports: "M12 9v4m0 4h.01M10.3 3.3l-8 14A2 2 0 004 20h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z",
  dicari: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  kategori: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  pengaturan: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.18-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-2.18 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 002.18.33h.08A1.65 1.65 0 009 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 2.18v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  blacklist: "M18.36 6.64A9 9 0 105.64 18.36 9 9 0 0018.36 6.64zM5.64 5.64l12.72 12.72",
  penjual: "M17 20h5V4H2v16h5m10 0v2m-10-2v2M8 9h8",
  blogs: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2zM14 4v6h6M9 13h6M9 17h6",
  wabot: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  ai: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  broadcast: "M3 3h18v4H3zM3 17h18v4H3zM7 8h10v8H7z",
  referral: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10 0l2 2-2 2m4-2H15",
  tawaran: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H7l4-8 4 6-2-2-2 4z",
  grouppost: "M17 3a2 2 0 012 2v6a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12z",
  notifikasi: "M15 17h5l-1.41-1.41A1 1 0 0118 15V10a6 6 0 00-5-5.92V4a1 1 0 00-2 0v.08A6 6 0 006 10v5a1 1 0 01-.59.89L4 17h5m6 0a3 3 0 01-6 0",
  profil_request: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM9 12h6M12 9v6",
};

export const NAV = [
  { key: "overview", label: "Ringkasan" },
  { key: "listings", label: "Listing" },
  { key: "transaksi", label: "Transaksi" },
  { key: "rating", label: "Rating" },
  { key: "reports", label: "Laporan" },
  { key: "dicari", label: "Dicari" },
  { key: "kategori", label: "Kategori" },
  { key: "pengaturan", label: "Pengaturan" },
  { key: "blacklist", label: "Blacklist" },
  { key: "penjual", label: "Penjual" },
  { key: "profil_request", label: "Ubah Profil" },
  { key: "blogs", label: "Artikel Blog" },
  { key: "wabot", label: "WhatsApp Bot" },
  { key: "broadcast", label: "Broadcast" },
  { key: "ai", label: "AI & Memori" },
  { key: "referral", label: "Referral" },
  { key: "tawaran", label: "Tawaran Harga" },
  { key: "grouppost", label: "Post Grup" },
  { key: "notifikasi", label: "Notifikasi" },
];

function NavIcon({ name }) {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] || ICONS.overview} />
    </svg>
  );
}

export default function AdminSidebar({ counts = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAdmin();

  // Ambil tab dari URL (e.g. /admin/listings -> "listings")
  const currentTab = pathname.split("/").pop() || "overview";
  const activeLabel = NAV.find((n) => n.key === currentTab)?.label || "Admin";

  return (
    <>
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20">
          <div className="mb-4 px-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Panel</p>
            <p className="text-lg font-extrabold tracking-tight dark:text-white">Admin</p>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => router.push(`/admin/${n.key}`)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentTab === n.key
                    ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-900"
                }`}
              >
                <NavIcon name={n.key} />
                <span className="flex-1 text-left">{n.label}</span>
                {counts[n.key] ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      currentTab === n.key
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {counts[n.key]}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <button onClick={logout} className="btn-outline mt-4 w-full text-sm">Keluar</button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <h1 className="text-xl font-extrabold dark:text-white">{activeLabel}</h1>
        <button onClick={logout} className="btn-outline text-xs">Keluar</button>
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => router.push(`/admin/${n.key}`)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
              currentTab === n.key
                ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-gray-100 text-gray-600 dark:bg-slate-900 dark:text-slate-400"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </>
  );
}
