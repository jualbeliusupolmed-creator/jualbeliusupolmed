"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/Icons";
import OTPModal from "@/components/OTPModal";
import { useSesi } from "@/components/SesiProvider";
import NotificationCenter from "@/components/NotificationCenter";
import QuickSearchSheet from "@/components/QuickSearchSheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa, nama: sesiNama, siap, segarkan, keluar } = useSesi();
  const session = { wa: sesiWa, name: sesiNama || sesiWa };
  
  const [selectedCampus, setSelectedCampus] = useState("USU");
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(3);
  const [notifTerbuka, setNotifTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const dropdownRef = useRef(null);

  // Load campus preference
  useEffect(() => {
    const saved = localStorage.getItem("preferred_campus");
    if (saved) setSelectedCampus(saved);

    const onChatUnread = (e) => setUnreadChat(e.detail?.count ?? 3);
    window.addEventListener("chat:unread", onChatUnread);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCampusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("chat:unread", onChatUnread);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const changeCampus = (camp) => {
    setSelectedCampus(camp);
    localStorage.setItem("preferred_campus", camp);
    setCampusDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("campus:change", { detail: { campus: camp } }));
    toast.success(`Kampus aktif: ${camp}`);
  };

  const isSubPage = pathname?.startsWith("/produk/") || pathname === "/jual" || pathname?.startsWith("/edit/") || pathname?.startsWith("/penjual/");
  
  const getSubPageTitle = () => {
    if (pathname?.startsWith("/produk/")) return "Detail Produk";
    if (pathname === "/jual") return "Pasang Iklan";
    if (pathname?.startsWith("/edit/")) return "Edit Iklan";
    if (pathname?.startsWith("/penjual/")) return "Profil Penjual";
    return "Kampus Kita";
  };

  const navMenus = [
    { name: "Beranda", href: "/", match: pathname === "/" },
    { name: "Marketplace", href: "/jual-beli", match: pathname?.startsWith("/jual-beli") || pathname?.startsWith("/produk/") },
    { name: "Open PO", href: "https://open-po.vercel.app", match: pathname?.startsWith("/open-po"), badge: "PO", external: true },
    { name: "Menfess", href: "/mading", match: pathname?.startsWith("/mading") },
    { name: "Obrolan", href: "/chat", match: pathname?.startsWith("/chat"), badgeCount: unreadChat },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
      {/* ── DESKTOP NAVBAR (Tinggi 64px — h-16) ── */}
      <div className="hidden lg:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Identity (Kiri) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-sm group-hover:bg-[#065F46] transition-colors">
                <Icon.GraduationCap className="w-5 h-5 text-emerald-200" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[18px] text-[#0F172A] dark:text-white tracking-tight leading-none">
                  Kampus Kita
                </span>
                <span className="text-[11px] font-semibold text-[#047857] dark:text-emerald-400 tracking-wider uppercase leading-tight mt-0.5">
                  USU • POLMED
                </span>
              </div>
            </Link>

            {/* Selector Kampus Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-[#E2E8F0] dark:border-white/[0.08]"
                aria-label="Pilih Kampus"
              >
                <span>🎓</span>
                <span>Kampus: <strong>{selectedCampus}</strong></span>
                <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {campusDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-white/[0.1] shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Kampus
                  </div>
                  {["USU", "POLMED", "Semua"].map((camp) => (
                    <button
                      key={camp}
                      type="button"
                      onClick={() => changeCampus(camp)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors",
                        selectedCampus === camp ? "text-[#047857] dark:text-emerald-400 font-bold bg-[#ECFDF5] dark:bg-emerald-950/40" : "text-slate-700 dark:text-slate-300 font-medium"
                      )}
                    >
                      <span>{camp === "Semua" ? "Semua Kampus" : `Kampus ${camp}`}</span>
                      {selectedCampus === camp && <span className="text-[#047857] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigasi Utama (Tengah — 5 Menu Resmi) */}
          <nav className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/60 rounded-full border border-[#E2E8F0] dark:border-white/[0.06]">
            {navMenus.map((m) => {
              const active = m.match;
              const linkClasses = cn(
                "relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-full transition-all duration-150",
                active
                  ? "text-[#047857] dark:text-emerald-300 bg-[#ECFDF5] dark:bg-emerald-950/70 font-semibold shadow-xs"
                  : "text-[#64748B] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 font-medium"
              );

              if (m.external) {
                return (
                  <a
                    key={m.name}
                    href={m.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    <span>{m.name}</span>
                    {m.badge && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold uppercase leading-tight shadow-xs">
                        {m.badge}
                      </span>
                    )}
                  </a>
                );
              }

              return (
                <Link key={m.name} href={m.href} className={linkClasses}>
                  <span>{m.name}</span>
                  {m.badgeCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#047857] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {m.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Aksi & Profil (Kanan) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setCariTerbuka(true)}
              aria-label="Cari barang atau jasa"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon.Search className="w-4 h-4" />
            </button>

            {/* Icon Notifikasi Lonceng */}
            <div className="relative">
              <NotificationCenter onOpenChange={setNotifTerbuka} />
            </div>

            {/* Primary Action Button: + Pasang Iklan */}
            <Link
              href="/jual"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all"
            >
              <Icon.Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Pasang Iklan</span>
            </Link>

            {/* User Profile Chip */}
            {siap && session.wa ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-white/[0.08] transition-colors group"
                title="Buka Dashboard Akun"
              >
                <div className="w-7 h-7 rounded-full bg-[#047857] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {session.name ? session.name[0].toUpperCase() : "U"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-emerald-400 transition-colors leading-none truncate max-w-[80px]">
                    {session.name || "Mahasiswa"}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight">
                    KTM Aktif ✓
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-white/[0.08] transition-colors group"
                  title="Demo Profil Mahasiswa"
                >
                  <div className="w-7 h-7 rounded-full bg-[#047857] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                    F
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white leading-none">
                      Faris
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                      FK '22
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowOtp(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#047857] hover:underline"
                >
                  Masuk
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP APP BAR (Tinggi 56px — h-14) ── */}
      <div className="lg:hidden h-14 px-3 sm:px-4 flex items-center justify-between gap-2.5">
        {isSubPage ? (
          /* Sub/Detail Pages: Back + Centered Title + Share/Action */
          <>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Kembali"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0"
            >
              <Icon.ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-[#0F172A] dark:text-white truncate flex-1 text-center">
              {getSubPageTitle()}
            </h1>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCariTerbuka(true)}
                aria-label="Cari"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon.Search className="w-4 h-4" />
              </button>
              <Link
                href="/jual"
                aria-label="Pasang Iklan"
                className="w-8 h-8 rounded-full bg-[#047857] text-white flex items-center justify-center shadow-xs active:scale-90 transition-all"
              >
                <Icon.Plus className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </>
        ) : (
          /* Root Pages: Logo + USU • POLMED + Actions */
          <>
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Icon.GraduationCap className="w-4.5 h-4.5 text-emerald-200" />
              </Link>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A] dark:text-white tracking-tight truncate">
                    Kampus Kita
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedCampus === "USU" ? "POLMED" : selectedCampus === "POLMED" ? "Semua" : "USU";
                      changeCampus(next);
                    }}
                    className="px-1.5 py-0.2 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/80 text-[#047857] dark:text-emerald-300 text-[9px] uppercase font-bold tracking-wide shrink-0 border border-emerald-600/20"
                  >
                    {selectedCampus === "Semua" ? "USU • POLMED" : selectedCampus} ▾
                  </button>
                </div>
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 truncate font-medium">
                  Ekosistem Kampus Terpadu
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCariTerbuka(true)}
                aria-label="Cari"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
              >
                <Icon.Search className="w-4 h-4" />
              </button>
              <Link
                href="/chat"
                aria-label="Pesan & Obrolan"
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
              >
                <Icon.MessageCircle className="w-4 h-4" />
                {unreadChat > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#047857] ring-2 ring-white dark:ring-[#0f172a]" />
                )}
              </Link>
              {siap && session.wa ? (
                <Link
                  href="/dashboard"
                  className="w-7 h-7 rounded-full bg-[#047857] text-white flex items-center justify-center text-xs font-bold shadow-xs active:scale-95"
                >
                  {session.name ? session.name[0].toUpperCase() : "U"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOtp(true)}
                  aria-label="Masuk Akun"
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-center active:scale-95"
                >
                  <Icon.User className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <QuickSearchSheet isOpen={cariTerbuka} onClose={() => setCariTerbuka(false)} />
      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={() => {
          setShowOtp(false);
          segarkan();
          router.refresh();
        }}
      />
    </header>
  );
}
