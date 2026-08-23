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
    { name: "Menfess & Info", href: "/mading", icon: Icon.BookOpen, special: true },
    { name: "Obrolan", href: "/chat", icon: Icon.MessageCircle },
    // Satu pintu: /profil memeriksa sesi di server lalu mengarahkan ke
    // /dashboard (sudah masuk) atau /dashboard/login (belum). `match` membuat
    // tab ini tetap menyala setelah pengalihan mendarat di /dashboard.
    { name: "Profil", href: "/profil", icon: Icon.User, match: ["/profil", "/dashboard"] },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] dark:bg-slate-900 dark:border-slate-800 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navs.map((n) => {
          const cakupan = n.match || [n.href];
          const isActive = pathname === n.href
            || cakupan.some((c) => c !== "/" && pathname?.startsWith(c));
          const IconComp = n.icon;

          if (n.special) {
            return (
              <Link key={n.name} href={n.href} className="relative -top-5 flex flex-col items-center group">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-glow transition-all duration-300 group-hover:-translate-y-1 group-active:scale-95 group-active:translate-y-0">
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-20" />
                  <IconComp className="h-6 w-6 relative z-10" strokeWidth="2.5" />
                </div>
                <span className="mt-1 text-[10px] font-bold tracking-tight whitespace-nowrap text-gray-600 dark:text-slate-300 transition-colors group-hover:text-primary">{n.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={n.name}
              href={n.href}
              className={cn(
                "group relative flex w-16 flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95",
                isActive ? "text-primary dark:text-emerald-400" : "text-gray-400 hover:text-gray-900 dark:text-slate-500 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-xl p-1.5 transition-all duration-300",
                isActive ? "bg-primary/10 dark:bg-emerald-400/10" : "bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-slate-800"
              )}>
                <IconComp className={cn("h-5 w-5 transition-transform duration-300", isActive ? "scale-110 stroke-[2.5px]" : "scale-100 stroke-[2px] group-hover:scale-105")} />
              </div>
              <span className={cn("text-[9px] transition-all duration-300", isActive ? "font-bold tracking-tight" : "font-semibold")}>
                {n.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
