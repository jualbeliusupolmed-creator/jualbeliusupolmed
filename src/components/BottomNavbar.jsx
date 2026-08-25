"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

function BottomNavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sembunyikan/minimalkan BottomNavbar jika sedang di dalam room chat aktif
  const isChatRoom = pathname === "/chat" && searchParams && (searchParams.has("anon") || searchParams.has("room"));

  const isSocialContext = ["/sosial", "/mading", "/organisasi", "/oprec", "/teman", "/cari-teman", "/swap", "/chat"]
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Di area Sosial, dock berubah menjadi shortcut langsung ke tiga fitur
  // komunitas. Di halaman lain, ia tetap menjadi lima tujuan inti aplikasi.
  const navs = isSocialContext
    ? [
        { name: "Beranda", href: "/", icon: Icon.Home },
        { name: "Marketplace", href: "/jual-beli", match: ["/jual-beli", "/produk", "/jasa", "/favorit"], icon: Icon.ShoppingBag },
        { name: "Social", href: "/mading", match: ["/mading", "/organisasi", "/oprec"], icon: Icon.BookOpen },
        { name: "Chat", href: "/chat", icon: Icon.MessageCircle },
        { name: "Swipe", href: "/teman", match: ["/teman", "/cari-teman", "/swap"], icon: Icon.Handshake },
      ]
    : [
        { name: "Social", href: "/mading", match: ["/sosial", "/mading", "/organisasi", "/oprec", "/teman", "/cari-teman", "/swap", "/chat"], icon: Icon.BookOpen },
        { name: "Beranda", href: "/", icon: Icon.Home },
        { name: "Market", href: "/jual-beli", match: ["/jual-beli", "/produk", "/jasa", "/favorit"], icon: Icon.ShoppingBag },
        { name: "Jual", href: "/jual", icon: Icon.Package },
        { name: "Dicari", href: "/dicari", match: ["/dicari"], icon: Icon.Search },
      ];

  return (
    <div className={cn(
      "fixed left-1/2 z-40 -translate-x-1/2 select-none no-tap-highlight transition-all duration-300",
      isChatRoom 
        ? "bottom-0 w-full max-w-2xl bg-white/90 dark:bg-[#000000]/90 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] pb-[env(safe-area-inset-bottom)] shadow-none" 
        : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-[650px] rounded-[28px] border border-black/[0.06] bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#111113]/90"
    )}>
      <div className={cn("flex items-center justify-around px-2", isChatRoom ? "h-12 md:h-10" : "h-16 md:h-14 md:px-4 md:gap-2")}>
        {navs.map((n) => {
          const cakupan = n.match || [n.href];
          const isActive = pathname === n.href
            || cakupan.some((c) => c !== "/" && pathname?.startsWith(c));
          const IconComp = n.icon;

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

export default function BottomNavbar() {
  return (
    <Suspense fallback={null}>
      <BottomNavbarInner />
    </Suspense>
  );
}
