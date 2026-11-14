"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { useSesi } from "./SesiProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import OTPModal from "./OTPModal";
import { terapkanTema } from "@/lib/tampilan";

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { nama, wa, siap, segarkan } = useSesi();
  const [unreadChat, setUnreadChat] = useState(0);
  const [showOtp, setShowOtp] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const handleThemeChange = (e) => {
      setDark(e.detail?.dark ?? document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("theme:change", handleThemeChange);
    return () => window.removeEventListener("theme:change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

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
    { href: "/open-po", label: "Open PO", icon: Icon.Coffee },
    { href: "/mading", label: "Menfess & Info", icon: Icon.BookOpen },
    { href: "/chat", label: "Obrolan", icon: Icon.MessageCircle, badge: unreadChat },
    { href: "/keranjang", label: "Keranjang", icon: Icon.ShoppingCart },
  ];

  const exploreLinks = [
    { href: "/dicari", label: "Dicari Mahasiswa", icon: Icon.Search },
    { href: "/chat?mode=teman", label: "Cari Teman", icon: Icon.Users },
    { href: "/organisasi", label: "UKM & Organisasi", icon: Icon.Briefcase },
    { href: "/oprec", label: "Oprec Kampus", icon: Icon.Megaphone },
  ];

  return (
    <div className="hidden md:flex flex-col w-[250px] sticky top-0 h-screen bg-transparent px-4 py-6 overflow-y-auto z-20">
      <div className="flex items-center justify-between mb-6 px-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Icon.Store className="w-8 h-8 text-emerald-700 shrink-0 transition-colors group-hover:text-emerald-800" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-none tracking-tight text-slate-900 dark:text-white">
              Kampus Kita
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
              Ekosistem Mahasiswa
            </span>
          </div>
        </Link>

        {/* Theme toggle desktop */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Ganti mode terang/gelap"
          title={dark ? "Mode Terang" : "Mode Gelap"}
          className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <div className="relative h-4.5 w-4.5 overflow-hidden">
            <svg aria-hidden="true" className={`absolute inset-0 h-4.5 w-4.5 transform transition-transform duration-300 motion-reduce:transition-none ${dark ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg aria-hidden="true" className={`absolute inset-0 h-4.5 w-4.5 transform transition-transform duration-300 motion-reduce:transition-none ${dark ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-4">
        <div className="space-y-1">
          {mainLinks.map((link) => {
            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 group text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950 font-bold"
                >
                  <link.icon className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span className="text-[14.5px]">{link.label}</span>
                  <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                    PO
                  </span>
                </a>
              );
            }
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 group",
                  isActive 
                    ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
                )}
              >
                <span className="relative shrink-0">
                  <link.icon className={cn("w-5 h-5", isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400")} aria-hidden="true" />
                  {link.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow-xs">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </span>
                <span className="text-[14.5px]">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <p className="px-4 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Layanan &amp; Komunitas
          </p>
          <div className="space-y-1 mt-1">
            {exploreLinks.map((link) => {
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 px-4 py-2 rounded-full transition-colors active:translate-y-px group text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                  >
                    <link.icon className="w-4 h-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span className="text-[14px]">{link.label}</span>
                  </a>
                );
              }
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-2 rounded-full transition-colors active:translate-y-px group",
                    isActive 
                      ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                  )}
                >
                  <link.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary dark:text-emerald-400" : "text-slate-400")} aria-hidden="true" />
                  <span className="text-[14px]">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-3">

        {!siap ? (
          /* Skeleton netral saat hydration — sama antara server & client */
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] motion-safe:animate-pulse motion-reduce:animate-none">
            <div className="w-8 h-8 rounded-full bg-black/[0.08] dark:bg-white/[0.08] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 rounded-full bg-black/[0.07] dark:bg-white/[0.07]" />
              <div className="h-2.5 w-14 rounded-full bg-black/[0.05] dark:bg-white/[0.05]" />
            </div>
          </div>
        ) : wa ? (
          <Link
            href={`/dashboard?wa=${encodeURIComponent(wa)}`}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]",
              "hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 group"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
              {(nama || wa).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{nama || "Toko Saya"}</p>
              <p className="text-[10px] text-slate-400 truncate">Lihat dashboard</p>
            </div>
            <Icon.ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowOtp(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 text-left w-full cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon.User className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary">Login / Daftar</p>
              <p className="text-[10px] text-slate-400">Jual beli di kampus</p>
            </div>
          </button>
        )}
        <Link 
          href="/jual"
          className="w-full btn-primary text-base py-3.5 rounded-full shadow-md flex items-center justify-center gap-2 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <Icon.Plus className="w-5 h-5" aria-hidden="true" />
          Jual Barang
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
