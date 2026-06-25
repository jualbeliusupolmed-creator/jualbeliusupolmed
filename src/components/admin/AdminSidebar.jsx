"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminProvider";

const ICONS = {
  overview:       "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  listings:       "M4 6h16M4 12h16M4 18h16",
  transaksi:      "M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  rating:         "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  reports:        "M12 9v4m0 4h.01M10.3 3.3l-8 14A2 2 0 004 20h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z",
  dicari:         "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  kategori:       "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  pengaturan:     "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.18-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-2.18 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 002.18.33h.08A1.65 1.65 0 009 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 2.18v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  blacklist:      "M18.36 6.64A9 9 0 105.64 18.36 9 9 0 0018.36 6.64zM5.64 5.64l12.72 12.72",
  penjual:        "M17 20h5V4H2v16h5m10 0v2m-10-2v2M8 9h8",
  blogs:          "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2zM14 4v6h6M9 13h6M9 17h6",
  wabot:          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  ai:             "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  broadcast:      "M3 3h18v4H3zM3 17h18v4H3zM7 8h10v8H7z",
  referral:       "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10 0l2 2-2 2m4-2H15",
  tawaran:        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H7l4-8 4 6-2-2-2 4z",
  grouppost:      "M17 3a2 2 0 012 2v6a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12z",
  notifikasi:     "M15 17h5l-1.41-1.41A1 1 0 0118 15V10a6 6 0 00-5-5.92V4a1 1 0 00-2 0v.08A6 6 0 006 10v5a1 1 0 01-.59.89L4 17h5m6 0a3 3 0 01-6 0",
  profil_request: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM9 12h6M12 9v6",
  moderasi:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  keuangan:       "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  tren:           "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14zM21 3l-5 5m0-5l5 5",
  audit:          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  search:         "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  logout:         "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

const GROUPS = [
  {
    label: "Utama",
    items: [
      { key: "overview",       label: "Ringkasan" },
      { key: "moderasi",       label: "Moderasi" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { key: "listings",       label: "Listing" },
      { key: "penjual",        label: "Penjual" },
      { key: "transaksi",      label: "Transaksi" },
      { key: "tawaran",        label: "Tawaran Harga" },
      { key: "dicari",         label: "Dicari" },
      { key: "rating",         label: "Rating" },
    ],
  },
  {
    label: "Konten",
    items: [
      { key: "blogs",          label: "Artikel Blog" },
      { key: "kategori",       label: "Kategori" },
      { key: "grouppost",      label: "Post Grup" },
    ],
  },
  {
    label: "Analitik",
    items: [
      { key: "keuangan",       label: "Keuangan" },
      { key: "tren",           label: "Tren Pencarian" },
      { key: "audit",          label: "Audit Trail" },
    ],
  },
  {
    label: "Bot & Komunikasi",
    items: [
      { key: "wabot",          label: "WhatsApp Bot" },
      { key: "broadcast",      label: "Broadcast" },
      { key: "notifikasi",     label: "Notifikasi" },
      { key: "ai",             label: "AI & Memori" },
      { key: "referral",       label: "Referral" },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { key: "pengaturan",     label: "Pengaturan" },
      { key: "profil_request", label: "Ubah Profil" },
      { key: "reports",        label: "Laporan" },
      { key: "blacklist",      label: "Blacklist" },
    ],
  },
];

// flat list for mobile nav
export const NAV = GROUPS.flatMap((g) => g.items);

function NavIcon({ name }) {
  return (
    <svg
      className="h-[17px] w-[17px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name] || ICONS.overview} />
    </svg>
  );
}

export default function AdminSidebar({ counts = {} }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { logout } = useAdmin();
  const [search, setSearch] = useState("");

  const currentTab = pathname.split("/").filter(Boolean).pop() || "overview";
  const activeLabel = NAV.find((n) => n.key === currentTab)?.label || "Admin";

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return GROUPS;
    const q = search.toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((n) => n.label.toLowerCase().includes(q) || n.key.includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  function go(key) {
    router.push(`/admin/${key}`);
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-56 shrink-0 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 h-screen overflow-hidden">

        {/* Brand header */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-4 dark:border-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 dark:bg-slate-100">
            <svg className="h-4 w-4 text-white dark:text-slate-900" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 leading-none">Panel</p>
            <p className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white leading-snug">Admin</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="border-b border-gray-100 px-3 py-2.5 dark:border-slate-800">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d={ICONS.search} />
            </svg>
            <input
              type="text"
              placeholder="Cari menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-7 pr-3 text-xs text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Nav groups — independently scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent] dark:[scrollbar-color:theme(colors.slate.700)_transparent]">
          {filteredGroups.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-gray-400">Tidak ada menu ditemukan</p>
          )}
          {filteredGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
              {!search && (
                <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((n) => {
                  const active = currentTab === n.key;
                  return (
                    <button
                      key={n.key}
                      onClick={() => go(n.key)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      <NavIcon name={n.key} />
                      <span className="flex-1 text-left leading-none">{n.label}</span>
                      {counts[n.key] ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                            active
                              ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                              : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                          }`}
                        >
                          {counts[n.key]}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3 dark:border-slate-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS.logout} />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold dark:text-white">{activeLabel}</h1>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Keluar
          </button>
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              className={`relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentTab === n.key
                  ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {n.label}
              {counts[n.key] ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
