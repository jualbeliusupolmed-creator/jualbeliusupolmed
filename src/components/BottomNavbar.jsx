"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

const BOTTOM_TABS = [
  {
    key: "jual-beli",
    label: "Jual Beli",
    href: "/",
    icon: "shopping_bag",
    match: ["/", "/jual-beli", "/produk", "/jasa", "/dicari", "/toko", "/penjual", "/keranjang", "/favorit"],
  },
  {
    key: "open-po",
    label: "Open PO",
    href: "/open-po",
    icon: "receipt_long",
    match: ["/open-po"],
  },
  {
    key: "linusku",
    label: "LINUSKU",
    href: "/linusku",
    icon: "directions_bus",
    match: ["/linusku"],
  },
  {
    key: "berita",
    label: "Berita",
    href: "/mading",
    icon: "newspaper",
    match: ["/mading", "/blog"],
  },
  {
    key: "jelajahi",
    label: "Jelajahi",
    href: "/jelajahi",
    icon: "explore",
    match: ["/jelajahi", "/organisasi", "/oprec", "/faq", "/teman", "/cari-teman", "/sosial", "/panduan-aman"],
  },
];

function isTabActive(tab, pathname) {
  if (!pathname || pathname === "/") return tab.key === "jual-beli";
  if (tab.key === "jual-beli") {
    return tab.match.some((p) => p !== "/" && pathname.startsWith(p));
  }
  return tab.match.some((p) => pathname.startsWith(p));
}

export default function BottomNavbar() {
  const pathname = usePathname();

  // Hide bottom nav on form/chat/admin routes so sticky form footers have full space
  const hiddenRoutes = ["/admin", "/chat", "/jual", "/edit/"];
  if (hiddenRoutes.some((r) => pathname?.startsWith(r))) {
    return null;
  }

  return (
    <aside
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-4 inset-x-0 z-50 pointer-events-none flex justify-center pb-safe"
    >
      <nav className="pointer-events-auto w-[92%] max-w-[360px] bg-[#134e35] rounded-full p-1.5 shadow-[0_10px_30px_rgba(10,46,31,0.4)] border border-emerald-700/30 flex items-center justify-between">
        {BOTTOM_TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          if (active) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                prefetch={true}
                onClick={() => hapticLight()}
                aria-current="page"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#bef264] text-[#134e35] font-bold text-xs shadow-sm transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="tracking-tight whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch={true}
              onClick={() => hapticLight()}
              aria-label={tab.label}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
