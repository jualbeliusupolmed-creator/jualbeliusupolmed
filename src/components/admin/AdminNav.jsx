"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GROUPS, ICONS } from "./nav";
import { useBasisAdmin } from "./basis";

const ALERT_KEYS = new Set(["moderasi", "reports", "profil_request", "toko", "antrean"]);

function NavIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] || ICONS.overview} />
    </svg>
  );
}

export default function AdminNav({ counts = {}, onNavigate }) {
  const router = useRouter();
  const pathname = usePathname();
  const basis = useBasisAdmin();
  const currentTab = pathname.split("/").filter(Boolean)[1] || "overview";

  const [search, setSearch] = useState("");
  
  // State accordion: default BUKA SEMUA GRUP agar admin langsung melihat seluruh menu
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    GROUPS.forEach((g) => {
      initial[g.label] = true;
    });
    return initial;
  });

  // Saat tab berpindah, pastikan grup yang berisi tab baru terbuka otomatis
  useEffect(() => {
    GROUPS.forEach((g) => {
      if (g.items.some((item) => item.key === currentTab)) {
        setOpenGroups((prev) => ({ ...prev, [g.label]: true }));
      }
    });
  }, [currentTab]);

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function go(key) {
    router.push(`${basis}/${key}`);
    onNavigate?.();
  }

  // Filter menu berdasarkan input pencarian
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return GROUPS;
    const q = search.toLowerCase();
    return GROUPS.map((g) => {
      const matchingItems = g.items.filter(
        (item) => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q)
      );
      return { ...g, items: matchingItems };
    }).filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <nav className="g-rail-nav flex flex-col font-sans">
      {/* Quick Search Input */}
      <div className="px-1 mb-2">
        <div className="relative flex items-center">
          <svg
            className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d={ICONS.search} />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu..."
            className="w-full pl-8 pr-6 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-slate-300 dark:focus:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Group List (Collapsible Accordion) */}
      <div className="space-y-1">
        {filteredGroups.map((group) => {
          const isOpen = search.trim() ? true : !!openGroups[group.label];
          
          // Hitung total alert / badge di dalam grup ini
          const groupAlertCount = group.items.reduce((sum, item) => {
            return sum + (ALERT_KEYS.has(item.key) && counts[item.key] ? counts[item.key] : 0);
          }, 0);

          return (
            <div key={group.label} className="g-nav-group">
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="g-nav-section-btn flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{group.label}</span>
                  {!isOpen && groupAlertCount > 0 && (
                    <span className="g-nav-count is-alert shrink-0">{groupAlertCount}</span>
                  )}
                </div>
                <svg
                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Items List */}
              {isOpen && (
                <div className="mt-0.5 space-y-0.5 pl-1">
                  {group.items.map((n) => {
                    const active = currentTab === n.key;
                    const count = counts[n.key];
                    const isUrgent = ALERT_KEYS.has(n.key);

                    return (
                      <button
                        key={n.key}
                        type="button"
                        onClick={() => go(n.key)}
                        className={`g-nav-item${active ? " is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        <NavIcon name={n.key} />
                        <span className="truncate">{n.label}</span>
                        {count ? (
                          <span
                            className={`g-nav-count ${
                              active ? "" : isUrgent ? "is-alert" : "is-neutral"
                            }`}
                          >
                            {count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400">
            Tidak ada menu yang cocok &quot;{search}&quot;
          </div>
        )}
      </div>
    </nav>
  );
}
