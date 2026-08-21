"use client";

import { usePathname, useRouter } from "next/navigation";
import { GROUPS, ICONS } from "./nav";
import { useBasisAdmin } from "./basis";

/*
 * Daftar menu — satu komponen, dua tempat: rel kiri di layar lebar dan laci
 * geser di ponsel. Sebelumnya keduanya ditulis terpisah di dalam AdminSidebar,
 * dan yang di ponsel diam-diam kehilangan pengelompokan serta lencana.
 *
 * Bentuknya mengikuti Gmail: pil yang menempel ke tepi kiri, ikon 20px, teks
 * 14px/500, dan yang aktif memakai biru muda Google (#e8f0fe) alih-alih blok
 * penuh berbayang.
 */

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

  function go(key) {
    router.push(`${basis}/${key}`);
    onNavigate?.();
  }

  return (
    <nav className="g-rail-nav">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="g-nav-section">{group.label}</p>
          {group.items.map((n) => {
            const active = currentTab === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => go(n.key)}
                className={`g-nav-item${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={n.key} />
                <span>{n.label}</span>
                {counts[n.key] ? (
                  <span className={`g-nav-count${active ? "" : " is-alert"}`}>{counts[n.key]}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
