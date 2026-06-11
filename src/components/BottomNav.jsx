"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";

export default function BottomNav() {
  const pathname = usePathname();

  // Daftar menu utama yang akan muncul di Bottom Bar
  const navs = [
    { href: "/", label: "Beranda", icon: Icon.Home },
    { href: "/favorit", label: "Favorit", icon: Icon.Heart },
    { href: "/jual", label: "Jual", icon: Icon.PlusCircle, primary: true },
    { href: "/dicari", label: "Dicari", icon: Icon.Grid },
    { href: "/dashboard", label: "Profil", icon: Icon.User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-100 pb-safe md:hidden dark:bg-slate-950/90 dark:border-slate-900 pb-2">
      <nav className="flex items-center justify-around px-2 h-16">
        {navs.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
          const IconComp = n.icon;

          if (n.primary) {
            return (
              <Link key={n.href} href={n.href} className="flex flex-col items-center justify-center w-14 -mt-6">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/40 ring-4 ring-white dark:ring-slate-950 transition-transform active:scale-95">
                  <IconComp className="h-7 w-7" />
                </div>
                <span className="text-[10px] mt-1 font-semibold text-gray-600 dark:text-slate-400">{n.label}</span>
              </Link>
            );
          }

          return (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center justify-center w-14 gap-1 transition-colors ${active ? "text-primary dark:text-white" : "text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"}`}>
              {active ? <Icon.CheckCircle className="h-6 w-6 absolute opacity-0" /> /* Just to trick compiler if Icon mismatch */ : null}
              {active && n.href === "/favorit" ? <Icon.HeartFilled className="h-6 w-6" /> : <IconComp className="h-6 w-6" />}
              <span className="text-[10px] font-medium">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
