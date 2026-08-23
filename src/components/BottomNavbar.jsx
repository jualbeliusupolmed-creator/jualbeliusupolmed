"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";

export default function BottomNavbar() {
  const pathname = usePathname();

  const navs = [
    { name: "Beranda", href: "/", icon: Icon.Home },
    { name: "Jual Beli", href: "/jual-beli", icon: Icon.Package },
    { name: "Mading", href: "/mading", icon: Icon.BookOpen, special: true },
    { name: "Obrolan", href: "/chat", icon: Icon.MessageCircle },
    { name: "Profil", href: "/penjual/login", icon: Icon.User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] dark:bg-slate-900 dark:border-slate-800 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navs.map((n) => {
          const isActive = pathname === n.href || (n.href !== "/" && pathname?.startsWith(n.href));
          const IconComp = n.icon;

          if (n.special) {
            return (
              <Link key={n.name} href={n.href} className="relative -top-5 flex flex-col items-center group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 group-active:scale-95 transition-transform">
                  <IconComp className="h-6 w-6" strokeWidth="2.5" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-gray-500 dark:text-slate-400">{n.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={n.name}
              href={n.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 gap-1",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <IconComp className={cn("h-6 w-6 transition-all", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
              <span className={cn("text-[10px] transition-all", isActive ? "font-bold" : "font-medium")}>
                {n.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
