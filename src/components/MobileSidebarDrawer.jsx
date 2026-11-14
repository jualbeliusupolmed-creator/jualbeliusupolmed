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
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex select-none">
      {/* Backdrop Gelap Halus */}
      <div
        className="fixed inset-0 bg-slate-950/70 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel Slide-over dari Sisi Kiri */}
      <div className="relative w-[310px] max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-xl flex flex-col z-10 overflow-hidden transform-gpu motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-300 motion-reduce:animate-none border-r border-slate-200 dark:border-slate-800">
        
        {/* Header Drawer */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
              <Icon.ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm leading-none tracking-tight text-slate-900 dark:text-white">
                  Kampus Kita
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[8.5px] px-1.5 py-0.2 border border-emerald-500/20">
                  COD
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                Komunitas Mahasiswa
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            aria-label="Tutup Menu Sidebar"
          >
            <Icon.X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Navigation Scrollable */}
        <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Menu Utama */}
          <div className="space-y-1">
            <p className="px-2.5 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
              Navigasi Utama
            </p>
            {mainLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              const IconComp = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600",
                    isActive
                      ? "bg-emerald-800 text-white font-bold shadow-xs"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-white stroke-[2.2]" : "text-slate-400 dark:text-slate-500")} aria-hidden="true" />
                    <span className="text-[11.5px] truncate">{link.label}</span>
                  </div>
                  {link.badge > 0 && (
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0",
                      isActive ? "bg-white text-emerald-800" : "bg-rose-500 text-white"
                    )}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Jelajah Kampus & PO */}
          <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <p className="px-2.5 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
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
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11.5px] transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                      <span>{link.badge}</span>
                      <Icon.ExternalLink className="w-2.5 h-2.5 opacity-90" aria-hidden="true" />
                    </span>
                  </a>
                );
              }

              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-[11.5px] transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600",
                    isActive
                      ? "bg-emerald-800 text-white font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} aria-hidden="true" />
                    <span className="truncate">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

        {/* Footer Drawer: Status Akun, Jual Barang & Theme Toggle */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/90 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {/* User Account / Login */}
          {!siap ? (
            <div className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800 motion-safe:animate-pulse motion-reduce:animate-none" />
          ) : wa ? (
            <Link
              href="/dashboard"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {(nama || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{nama || wa}</p>
                  <p className="text-[9.5px] text-slate-400 leading-tight">Dashboard Mahasiswa</p>
                </div>
              </div>
              <Icon.ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                hapticMedium();
                onClose();
                setShowOtp(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              <Icon.User className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Masuk via WhatsApp</span>
            </button>
          )}

          {/* Primary CTA: Jual Barang */}
          <Link
            href="/jual"
            onClick={() => {
              hapticMedium();
              onClose();
            }}
            className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 text-white"
          >
            <Icon.Plus className="w-4 h-4" aria-hidden="true" />
            <span>Jual Barang</span>
          </Link>

          {/* Theme Toggle Compact */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 text-slate-600 dark:text-slate-400"
          >
            <div className="flex items-center gap-2 text-[10.5px] font-semibold">
              {dark ? <Icon.Moon className="w-3 h-3 text-violet-400" aria-hidden="true" /> : <Icon.Sun className="w-3 h-3 text-amber-500" aria-hidden="true" />}
              <span>{dark ? "Mode Gelap" : "Mode Terang"}</span>
            </div>
            <div className={cn(
              "w-6 h-3.5 rounded-full p-0.5 transition-colors flex items-center",
              dark ? "bg-emerald-700 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
            )}>
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
            </div>
          </button>
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
