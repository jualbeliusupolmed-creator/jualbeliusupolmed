"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { useSesi } from "./SesiProvider";
import { cn } from "@/lib/utils";

export default function LeftSidebar() {
  const pathname = usePathname();
  const { nama, wa } = useSesi();

  const links = [
    { href: "/", label: "Beranda", icon: Icon.Home },
    { href: "/dicari", label: "Dicari", icon: Icon.Search },
    { href: "/chat", label: "Chat", icon: Icon.MessageCircle },
    { href: "/jual", label: "Jual Barang", icon: Icon.Plus },
    { href: "/teman", label: "Cari Teman", icon: Icon.Users },
    { href: "/?modal=menfess", label: "Buat Menfess", icon: Icon.Edit },
  ];

  return (
    <div className="hidden md:flex flex-col w-[250px] sticky top-0 h-screen bg-transparent px-4 py-6 overflow-y-auto">
      <Link href="/" className="flex items-center gap-2 mb-8 px-2">
        <Icon.Store className="w-8 h-8 text-primary" />
        <span className="font-bold text-xl tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">JualBeli</span>
      </Link>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
                isActive 
                  ? "bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
              )}
            >
              <link.icon className={cn("w-6 h-6", isActive && "text-primary")} />
              <span className="text-[17px]">{link.label}</span>
            </Link>
          );
        })}

        <Link
          href={wa ? `/dashboard?wa=${encodeURIComponent(wa)}` : "/profil"}
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
            pathname?.startsWith("/dashboard") || pathname?.startsWith("/profil")
              ? "bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white" 
              : "text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
          )}
        >
          <Icon.User className={cn("w-6 h-6", (pathname?.startsWith("/dashboard") || pathname?.startsWith("/profil")) && "text-primary")} />
          <span className="text-[17px]">Profil</span>
        </Link>
      </nav>

      <div className="mt-auto">
        <Link 
          href="/jual"
          className="w-full btn-primary text-[17px] py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
        >
          <Icon.Plus className="w-5 h-5" />
          Pasang Iklan
        </Link>
      </div>
    </div>
  );
}
