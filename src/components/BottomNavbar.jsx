"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

export default function BottomNavbar() {
  const pathname = usePathname();

  const navs = [
    { name: "Beranda", href: "/", icon: Icon.Home },
    { name: "Marketplace", href: "/jual-beli", icon: Icon.ShoppingBag },
    { name: "Jual", href: "/jual", icon: Icon.Package, special: true },
    { name: "Menfess", href: "/mading", icon: Icon.BookOpen },
    { name: "Obrolan", href: "/chat", icon: Icon.MessageCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.06] bg-white/80 pb-safe shadow-[0_-1px_12px_rgba(0,0,0,0.03)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#000000]/80 select-none no-tap-highlight md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:min-w-[420px] md:max-w-md md:-translate-x-1/2 md:rounded-full md:border md:shadow-[0_12px_36px_rgba(0,0,0,0.18)] md:pb-0">
      <div className="flex h-16 md:h-14 items-center justify-around px-2 md:px-4 md:gap-2">
        {navs.map((n) => {
          const cakupan = n.match || [n.href];
          const isActive = pathname === n.href
            || cakupan.some((c) => c !== "/" && pathname?.startsWith(c));
          const IconComp = n.icon;

          if (n.special) {
            return (
              <Link 
                key={n.name} 
                href={n.href} 
                onClick={() => hapticLight()}
                aria-current={isActive ? "page" : undefined}
                className="relative -top-4 md:-top-3 flex flex-col items-center group touch-manipulation"
              >
                <div className={cn(
                  "relative flex h-13 w-13 md:h-11 md:w-11 items-center justify-center rounded-full text-white shadow-[0_4px_16px_rgba(83,43,152,0.35)] transition-all duration-200 group-hover:scale-105 active:scale-90",
                  "bg-primary"
                )}>
                  <IconComp className="h-6 w-6 md:h-5 md:w-5 relative z-10" strokeWidth="2.5" />
                </div>
                <span className="mt-0.5 text-[10px] md:text-[9px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{n.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={n.name}
              href={n.href}
              onClick={() => hapticLight()}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex w-14 xs:w-16 md:w-16 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-[0.92] touch-manipulation",
                isActive ? "text-primary dark:text-violet-400" : "text-gray-400 hover:text-[#1d1d1f] dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-full p-1 transition-all duration-200",
                isActive ? "bg-primary/10 dark:bg-violet-400/15" : "bg-transparent"
              )}>
                <IconComp className={cn("h-5 w-5 md:h-4.5 md:w-4.5 transition-transform duration-200", isActive ? "scale-105 stroke-[2.4px]" : "scale-100 stroke-[1.8px]")} />
              </div>
              <span className={cn("text-[10px] md:text-[9px] transition-all duration-200 truncate max-w-full tracking-tight", isActive ? "font-bold" : "font-medium")}>
                {n.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
