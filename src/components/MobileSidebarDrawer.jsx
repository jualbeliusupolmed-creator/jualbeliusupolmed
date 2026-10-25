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
    { href: "/", label: "Beranda", icon: Icon.Home },
    { href: "/jual-beli", label: "Marketplace", icon: Icon.ShoppingBag },
    { href: "/mading", label: "Mading & Menfess", icon: Icon.BookOpen },
    { href: "/chat", label: "Chat", icon: Icon.MessageCircle, badge: unreadChat },
    { href: "/favorit", label: "Favorit Saya", icon: Icon.Heart },
  ];

  const exploreLinks = [
    { href: "https://open-po.vercel.app?utm_source=jualbeliusupolmed&ref=jualbeliusupolmed", label: "PO Kampus 🍵", icon: Icon.Store, external: true },
    { href: "/dicari", label: "Dicari Mahasiswa", icon: Icon.Search },
    { href: "/teman", label: "Cari Teman (Swipe)", icon: Icon.Users },
    { href: "/organisasi", label: "UKM & Organisasi", icon: Icon.Store },
    { href: "/oprec", label: "Oprec Kampus", icon: Icon.Megaphone },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel (Slide from Left) */}
      <div className="relative w-[300px] max-w-[85vw] h-full bg-[#f8f9fa] dark:bg-[#121214] shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-300 border-r border-black/[0.08] dark:border-white/[0.08]">
        {/* Header Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-black/[0.05] dark:border-white/[0.06]">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              <Icon.Store className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base leading-none tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Kampusfess
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                USU • POLMED
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] active:scale-90 transition-all"
            aria-label="Tutup Menu"
          >
            <Icon.X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* Main Links */}
          <div className="space-y-1">
            {mainLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all",
                    isActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-slate-700 dark:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-semibold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className={cn("w-4.5 h-4.5", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                    <span className="text-xs">{link.label}</span>
                  </div>
                  {link.badge > 0 && (
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                      isActive ? "bg-white text-primary" : "bg-rose-500 text-white"
                    )}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Jelajah Kampus */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
            <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Jelajah Kampus
            </p>
            <div className="space-y-1">
              {exploreLinks.map((link) => {
                if (link.external) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <link.icon className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{link.label}</span>
                      </div>
                      <Icon.ExternalLink className="w-3 h-3 opacity-80" />
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
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition-all",
                      isActive
                        ? "bg-primary text-white font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-semibold"
                    )}
                  >
                    <link.icon className={cn("w-4.5 h-4.5", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] flex gap-2">
            <Link
              href="/mading?tulis=1"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[11px] font-bold active:scale-95 transition-all"
            >
              <Icon.Mail className="w-3.5 h-3.5" />
              <span>Menfess</span>
            </Link>
            <Link
              href="/dicari?tulis=1"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold active:scale-95 transition-all"
            >
              <Icon.MapPin className="w-3.5 h-3.5" />
              <span>Dicari</span>
            </Link>
          </div>
        </div>

        {/* Footer Drawer: Theme Toggle & User Info */}
        <div className="p-3.5 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2.5 bg-white/50 dark:bg-black/30">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {dark ? <Icon.Moon className="w-4 h-4 text-violet-400" /> : <Icon.Sun className="w-4 h-4 text-amber-500" />}
              <span>{dark ? "Mode Gelap" : "Mode Terang"}</span>
            </div>
            <div className={cn(
              "w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
              dark ? "bg-primary justify-end" : "bg-slate-300 justify-start"
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
              onClick={onClose}
              className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon.User className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold truncate">{nama || wa}</p>
                  <p className="text-[10px] text-primary/70">Buka Dashboard Akun</p>
                </div>
              </div>
              <Icon.ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                setShowOtp(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
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
