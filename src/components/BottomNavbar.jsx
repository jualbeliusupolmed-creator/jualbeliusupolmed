"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

export default function BottomNavbar() {
  const pathname = usePathname();

  const isSocialContext = ["/sosial", "/mading", "/teman", "/cari-teman", "/swap", "/chat"]
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Di area Sosial, dock berubah menjadi shortcut langsung ke tiga fitur
  // komunitas. Di halaman lain, ia tetap menjadi lima tujuan inti aplikasi.
  const navs = isSocialContext
    ? [
        { name: "Beranda", href: "/", icon: Icon.Home },
        { name: "Marketplace", href: "/jual-beli", match: ["/jual-beli", "/produk", "/jasa", "/favorit"], icon: Icon.ShoppingBag },
        { name: "Social", href: "/mading", match: ["/mading"], icon: Icon.BookOpen },
        { name: "Chat", href: "/chat", icon: Icon.MessageCircle },
        { name: "Swipe", href: "/teman", match: ["/teman", "/cari-teman", "/swap"], icon: Icon.Handshake },
      ]
    : [
        { name: "Social", href: "/mading", match: ["/sosial", "/mading", "/teman", "/cari-teman", "/swap", "/chat"], icon: Icon.BookOpen },
        { name: "Beranda", href: "/", icon: Icon.Home },
        { name: "Marketplace", href: "/jual-beli", match: ["/jual-beli", "/produk", "/jasa", "/dicari", "/favorit", "/jual"], icon: Icon.ShoppingBag },
        { name: "Jual", href: "/jual", icon: Icon.Package },
        { name: "Dicari", href: "/dicari", match: ["/dicari"], icon: Icon.Search },
      ];

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[650px] -translate-x-1/2 rounded-[28px] border border-black/[0.06] bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#111113]/90 select-none no-tap-highlight">
      <div className="flex h-16 items-center justify-around px-2 md:h-14 md:px-4 md:gap-2">
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
