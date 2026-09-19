"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { useSesi } from "./SesiProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import OTPModal from "./OTPModal";

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { nama, wa, segarkan } = useSesi();
  const [unreadChat, setUnreadChat] = useState(0);
  const [showOtp, setShowOtp] = useState(false);

  useEffect(() => {
    function onUnread(e) { setUnreadChat(e.detail?.count ?? 0); }
    window.addEventListener("chat:unread", onUnread);
    const stored = parseInt(localStorage.getItem("chat_unread_count") || "0", 10);
    if (stored > 0) setUnreadChat(stored);
    return () => window.removeEventListener("chat:unread", onUnread);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/chat")) {
      setUnreadChat(0);
      localStorage.setItem("chat_unread_count", "0");
    }
  }, [pathname]);

  const mainLinks = [
    { href: "/", label: "Beranda", icon: Icon.Home },
    { href: "/jual-beli", label: "Marketplace", icon: Icon.ShoppingBag },
    { href: "/mading", label: "Mading", icon: Icon.BookOpen },
    { href: "/chat", label: "Chat", icon: Icon.MessageCircle, badge: unreadChat },
    { href: "/favorit", label: "Favorit", icon: Icon.Heart },
  ];

  const exploreLinks = [
    { href: "/dicari", label: "Dicari", icon: Icon.Search },
    { href: "/teman", label: "Cari Teman", icon: Icon.Users },
    { href: "/organisasi", label: "UKM & Organisasi", icon: Icon.Store },
    { href: "/oprec", label: "Oprec Kampus", icon: Icon.Megaphone },
  ];

  return (
    <div className="hidden md:flex flex-col w-[250px] sticky top-0 h-screen bg-transparent px-4 py-6 overflow-y-auto z-20">
      <Link href="/" className="flex items-center gap-2.5 mb-6 px-2">
        <Icon.Store className="w-8 h-8 text-primary shrink-0" />
        <div className="flex flex-col">
          <span className="font-extrabold text-xl leading-none tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Kampusfess
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Marketplace USU • POLMED
          </span>
        </div>
      </Link>

      <nav className="flex-1 space-y-4">
        <div className="space-y-1">
          {mainLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-2.5 rounded-full transition-all group",
                  isActive 
                    ? "bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
                )}
              >
                <span className="relative shrink-0">
                  <link.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                  {link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow-sm">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </span>
                <span className="text-[15px]">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
          <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Jelajah Kampus
          </p>
          <div className="space-y-1 mt-1">
            {exploreLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-2 rounded-full transition-all group",
                    isActive 
                      ? "bg-black/[0.05] dark:bg-white/[0.08] font-bold text-[#1d1d1f] dark:text-white" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] font-medium"
                  )}
                >
                  <link.icon className={cn("w-4.5 h-4.5 shrink-0", isActive && "text-primary")} />
                  <span className="text-[14px]">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-3">
        {wa ? (
          <Link
            href={`/dashboard?wa=${encodeURIComponent(wa)}`}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]",
              "hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors group"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
              {(nama || wa).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#1d1d1f] dark:text-white truncate">{nama || "Toko Saya"}</p>
              <p className="text-[10px] text-slate-400 truncate">Lihat dashboard</p>
            </div>
            <Icon.ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary shrink-0" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowOtp(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors text-left w-full cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon.User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-primary">Login / Daftar</p>
              <p className="text-[10px] text-slate-400">Jual beli di kampus</p>
            </div>
          </button>
        )}
        <Link 
          href="/jual"
          className="w-full btn-primary text-[17px] py-4 rounded-full shadow-lg flex items-center justify-center gap-2"
        >
          <Icon.Plus className="w-5 h-5" />
          Pasang Iklan
        </Link>
      </div>

      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={() => {
          setShowOtp(false);
          segarkan?.();
          router.refresh();
        }}
      />
    </div>
  );
}
