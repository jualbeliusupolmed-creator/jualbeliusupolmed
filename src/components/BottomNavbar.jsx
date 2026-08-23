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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-gray-200/80 pb-safe shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:bg-slate-900/95 dark:border-slate-800/80 select-none no-tap-highlight md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto md:min-w-[420px] md:max-w-md md:rounded-3xl md:border md:border-gray-200/90 md:dark:border-slate-800/90 md:shadow-2xl md:pb-0">
      <div className="flex h-16 md:h-14 items-center justify-around px-1.5 xs:px-2 md:px-4 md:gap-2">
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
                className="relative -top-5 md:-top-4 flex flex-col items-center group touch-manipulation"
              >
                <div className={cn(
                  "relative flex h-14 w-14 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-active:scale-90 group-active:translate-y-0",
                  isActive ? "bg-primary shadow-primary/35" : "bg-gradient-to-tr from-polmed to-polmed-light shadow-polmed/30"
                )}>
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-20" />
                  <IconComp className="h-6 w-6 md:h-5 md:w-5 relative z-10" strokeWidth="2.5" />
                </div>
                <span className="mt-1 text-[10px] md:text-[9px] font-bold tracking-tight whitespace-nowrap text-gray-700 dark:text-slate-200 transition-colors group-hover:text-primary">{n.name}</span>
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
                "group relative flex w-14 xs:w-16 md:w-16 flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 touch-manipulation",
                isActive ? "text-primary dark:text-emerald-400" : "text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-xl p-1.5 md:p-1 transition-all duration-300",
                isActive ? "bg-primary/10 dark:bg-emerald-400/10 shadow-inner" : "bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-slate-800"
              )}>
                <IconComp className={cn("h-5 w-5 md:h-4 md:w-4 transition-transform duration-300", isActive ? "scale-110 stroke-[2.5px]" : "scale-100 stroke-[2px] group-hover:scale-105")} />
              </div>
              <span className={cn("text-[9px] md:text-[8.5px] transition-all duration-300 truncate max-w-full", isActive ? "font-extrabold tracking-tight" : "font-semibold")}>
                {n.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
