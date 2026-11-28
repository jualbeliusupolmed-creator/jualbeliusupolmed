"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { hapticLight } from "@/lib/haptics";
import { isPrimaryNavigationActive, PRIMARY_NAV_ITEMS } from "@/lib/siteNavigation";
import { cn } from "@/lib/utils";

const navigationIcons = {
  marketplace: Icon.ShoppingBag,
  "open-po": Icon.Package,
  linusku: Icon.MapPin,
  news: Icon.BookOpen,
  explore: Icon.Compass,
};

export default function PrimaryNavigation({ variant = "desktop" }) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        isMobile
          ? "fixed bottom-0 left-1/2 z-[70] flex w-[calc(100%-1.25rem)] max-w-[34rem] -translate-x-1/2 items-center gap-1 rounded-[1.25rem] border border-white/15 bg-[#0a2e1f]/95 p-1.5 shadow-[0_8px_28px_rgba(10,46,31,0.22)] backdrop-blur-sm xl:hidden"
          : "hidden items-center gap-1 rounded-full border border-[#d9e8dc] bg-white p-1 xl:flex dark:border-white/10 dark:bg-slate-900"
      )}
      style={isMobile ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" } : undefined}
    >
      {PRIMARY_NAV_ITEMS.map((item) => {
        const active = isPrimaryNavigationActive(pathname, item);
        const ItemIcon = navigationIcons[item.id];

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            onClick={isMobile ? hapticLight : undefined}
            className={cn(
              "group flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bef264] active:translate-y-px",
              isMobile
                ? active
                  ? "flex-[1.7] px-2 text-[#0a2e1f]"
                  : "flex-[0.8] px-1 text-white"
                : "px-3 py-2 text-xs font-semibold",
              active
                ? isMobile
                  ? "bg-[#bef264]"
                  : "bg-[#bef264] text-[#0a2e1f]"
                : isMobile
                  ? "text-white/85 hover:bg-white/10 hover:text-white"
                  : "text-[#0a2e1f] hover:bg-[#f1f8f2] dark:text-slate-200 dark:hover:bg-slate-800"
            )}
          >
            <ItemIcon
              aria-hidden="true"
              className={cn(
                "h-5 w-5 shrink-0",
                isMobile && active && "h-[18px] w-[18px]"
              )}
            />
            {(!isMobile || active) && (
              <span className={cn("truncate", isMobile ? "text-[10px] font-bold" : "text-xs")}>
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
