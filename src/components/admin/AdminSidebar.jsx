"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminProvider";
import { GROUPS, NAV, ICONS } from "./nav";

// Daftar menunya tinggal di ./nav.js — dipakai bareng judul halaman, supaya
// menu dan judul tidak pernah menyebut halaman yang sama dengan dua nama.
export { NAV };

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

  const currentTab = pathname.split("/").filter(Boolean)[1] || "overview";
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
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
                          ? "bg-primary text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                    >
                      <NavIcon name={n.key} />
                      <span className="flex-1 text-left leading-none">{n.label}</span>
                      {counts[n.key] ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                            active
                              ? "bg-white/25 text-white"
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
                  ? "bg-primary text-white shadow-sm"
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
