"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { useSesi } from "./SesiProvider";
import { cn } from "@/lib/utils";
import { terapkanTema } from "@/lib/tampilan";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import OTPModal from "./OTPModal";

export default function MobileSidebarDrawer({ isOpen, onClose }) {
  const pathname = usePathname();
  const { nama, wa, siap } = useSesi();
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
    hapticLight();
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

  useEffect(() => {
    function onUnread(e) {
      setUnreadChat(e.detail?.count ?? 0);
    }
    window.addEventListener("chat:unread", onUnread);
    const stored = parseInt(localStorage.getItem("chat_unread_count") || "0", 10);
    if (stored > 0) setUnreadChat(stored);
    return () => window.removeEventListener("chat:unread", onUnread);
  }, []);

  // Kunci scroll halaman saat drawer terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const mainLinks = [
    { href: "/", label: "Beranda Utama", icon: Icon.Home },
    { href: "/jual-beli", label: "Marketplace Kampus", icon: Icon.ShoppingBag },
    { href: "/mading", label: "Mading & Menfess", icon: Icon.BookOpen },
    { href: "/chat", label: "Chat & Pesan", icon: Icon.MessageCircle, badge: unreadChat },
    { href: "/favorit", label: "Barang Favorit", icon: Icon.Heart },
  ];

  const exploreLinks = [
    {
      href: "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed",
      label: "Open PO Kampus",
      badge: "LIVE 🍵",
      icon: Icon.Store,
      external: true,
      highlight: true,
    },
    { href: "/dicari", label: "Dicari Mahasiswa (WTS/WTB)", icon: Icon.Search },
    { href: "/teman", label: "Cari Teman Kampus (Swipe)", icon: Icon.Users },
    { href: "/organisasi", label: "UKM & Organisasi", icon: Icon.Briefcase },
    { href: "/oprec", label: "Oprec & Kepanitiaan", icon: Icon.Megaphone },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex select-none">
      {/* Backdrop Gelap Halus */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel Slide-over dari Sisi Kiri */}
      <div className="relative w-[310px] max-w-[85vw] h-full bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col z-10 overflow-hidden animate-in slide-in-from-left duration-300 border-r border-black/[0.08] dark:border-white/[0.08]">
        
        {/* Header Drawer */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#18181b]/50">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 active:scale-95 transition-transform"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-primary to-violet-500 text-white flex items-center justify-center font-black shadow-xs">
              <Icon.ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm leading-none tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Kampusfess
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[8.5px] px-1.5 py-0.2 border border-emerald-500/20">
                  COD
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                USU • POLMED Community
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] active:scale-90 transition-all"
            aria-label="Tutup Menu Sidebar"
          >
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Navigation Scrollable */}
        <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Menu Utama */}
          <div className="space-y-1">
            <p className="px-2.5 pb-1 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigasi Utama
            </p>
            {mainLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              const IconComp = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-white stroke-[2.2]" : "text-slate-400 dark:text-slate-500")} />
                    <span className="text-[11.5px] truncate">{link.label}</span>
                  </div>
                  {link.badge > 0 && (
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0",
                      isActive ? "bg-white text-primary" : "bg-rose-500 text-white"
                    )}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Jelajah Kampus & PO */}
          <div className="space-y-1 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
            <p className="px-2.5 pb-1 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ekosistem Kampus
            </p>
            {exploreLinks.map((link) => {
              const IconComp = link.icon;
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11.5px] transition-all duration-150 active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                      <span>{link.badge}</span>
                      <Icon.ExternalLink className="w-2.5 h-2.5 opacity-90" />
                    </span>
                  </a>
                );
              }

              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-[11.5px] transition-all duration-150 active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-white font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                    <span className="truncate">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions (Kirim Menfess & Pasang Dicari) */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] grid grid-cols-2 gap-2">
            <Link
              href="/mading?tulis=1"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-[11px] font-bold active:scale-95 transition-all"
            >
              <Icon.Heart className="w-3.5 h-3.5 text-violet-500 fill-current" />
              <span>Curhat Menfess</span>
            </Link>
            <Link
              href="/dicari?tulis=1"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-bold active:scale-95 transition-all"
            >
              <Icon.Search className="w-3.5 h-3.5 text-amber-500" />
              <span>Cari Barang</span>
            </Link>
          </div>
        </div>

        {/* Footer Drawer: Theme Toggle & Status Akun */}
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2 bg-slate-50/70 dark:bg-[#18181b]/70 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {dark ? <Icon.Moon className="w-3.5 h-3.5 text-violet-400" /> : <Icon.Sun className="w-3.5 h-3.5 text-amber-500" />}
              <span>{dark ? "Mode Gelap (Dark)" : "Mode Terang (Light)"}</span>
            </div>
            <div className={cn(
              "w-7.5 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
              dark ? "bg-primary justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
            )}>
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
            </div>
          </button>

          {/* User Account / Login */}
          {!siap ? (
            <div className="h-9 w-full rounded-xl bg-black/[0.05] dark:bg-white/[0.08] animate-pulse" />
          ) : wa ? (
            <Link
              href="/dashboard"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  {(nama || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold truncate leading-tight">{nama || wa}</p>
                  <p className="text-[9.5px] text-primary/70 leading-tight">Dashboard Mahasiswa</p>
                </div>
              </div>
              <Icon.ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                hapticMedium();
                onClose();
                setShowOtp(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <Icon.User className="w-3.5 h-3.5" />
              <span>Masuk via WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={() => {
          setShowOtp(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
