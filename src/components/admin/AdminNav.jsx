"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ICONS, grupUntuk } from "./nav";
import { useBasisAdmin, useModeDemo } from "./basis";

const ALERT_KEYS = new Set(["moderasi", "reports", "profil_request", "toko", "transaksi", "antrean"]);

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
  const demo = useModeDemo();
  const grup = useMemo(() => grupUntuk(demo), [demo]);
  const currentTab = pathname.split("/").filter(Boolean)[1] || "overview";
  
  // State accordion: buka grup aktif atau grup pertama agar sidebar rapi dan efisien
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    let matched = false;
    grup.forEach((g) => {
      if (g.items.some((item) => item.key === currentTab)) {
        initial[g.label] = true;
        matched = true;
      }
    });
    // Fallback bila tidak ada tab yang cocok: buka grup pertama
    if (!matched && grup[0]) {
      initial[grup[0].label] = true;
    }
    return initial;
  });

  // Saat tab berpindah, pastikan grup yang berisi tab baru terbuka otomatis
  useEffect(() => {
    grup.forEach((g) => {
      if (g.items.some((item) => item.key === currentTab)) {
        setOpenGroups((prev) => ({ ...prev, [g.label]: true }));
      }
    });
  }, [currentTab, grup]);

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function go(key) {
    router.push(`${basis}/${key}`);
    onNavigate?.();
  }

  return (
    <nav className="g-rail-nav flex flex-col font-sans">
      {/* Group List (Collapsible Accordion) */}
      <div className="space-y-1">
        {grup.map((group) => {
          const isOpen = !!openGroups[group.label];
          
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
      </div>
    </nav>
  );
}
