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
import { getCartItems } from "@/lib/cart";

export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa, nama: sesiNama, siap, segarkan, keluar } = useSesi();
  const session = { wa: sesiWa, name: sesiNama || sesiWa };
  
  const [selectedCampus, setSelectedCampus] = useState("Semua");
  const [campuses, setCampuses] = useState([]);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(3);
  const [cartCount, setCartCount] = useState(0);
  const [notifTerbuka, setNotifTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  // Load campus preference
  useEffect(() => {
    const updateCartCount = () => setCartCount(getCartItems().length);
    updateCartCount();
    window.addEventListener("cart-changed", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("cart-changed", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    fetch("/api/kampus", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data?.campuses)) {
          setCampuses(data.campuses);
          const saved = localStorage.getItem("preferred_campus");
          const valid = saved === "Semua" || data.campuses.some((campus) => campus.shortName === saved);
          if (valid && saved) setSelectedCampus(saved);
          else if (saved) localStorage.removeItem("preferred_campus");
        }
      })
      .catch(() => {});

    const onChatUnread = (e) => setUnreadChat(e.detail?.count ?? 3);
    window.addEventListener("chat:unread", onChatUnread);

    const handleClickOutside = (e) => {
      if (
        (dropdownRef.current && !dropdownRef.current.contains(e.target)) ||
        (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target))
      ) {
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
    if (pathname === "/jual") return "Jual Barang";
    if (pathname?.startsWith("/edit/")) return "Edit Barang";
    if (pathname?.startsWith("/penjual/")) return "Profil Penjual";
    return "Kampus Kita";
  };

  const navMenus = [
    { name: "Beranda", href: "/", match: pathname === "/" },
    { name: "Marketplace", href: "/jual-beli", match: pathname?.startsWith("/jual-beli") || pathname?.startsWith("/produk/") },
    { name: "Open PO", href: "/open-po", match: pathname?.startsWith("/open-po"), badge: "PO" },
    { name: "Menfess", href: "/mading", match: pathname?.startsWith("/mading") },
    { name: "Obrolan", href: "/chat", match: pathname?.startsWith("/chat"), badgeCount: unreadChat },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-white/[0.08] shadow-xs">
      {/* ── DESKTOP NAVBAR (Tinggi 64px — max-w-[1440px]) ── */}
      <div className="hidden lg:block max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Identity (Kiri) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-900 transition-colors">
                <svg className="w-5 h-5 text-emerald-300 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Kampus Kita
              </span>
            </Link>
          </div>

          {/* Central Navigation Pill (Tengah) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-full border border-slate-200/60 dark:border-white/10 shrink-0 overflow-x-auto">
            {/* Beranda */}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-full transition-colors shrink-0",
                pathname === "/"
                  ? "font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-700 shadow-xs"
                  : "font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              )}
            >
              <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Beranda</span>
            </Link>

            {/* Marketplace */}
            <Link
              href="/jual-beli"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-colors shrink-0",
                pathname?.startsWith("/jual-beli") || pathname?.startsWith("/produk/")
                  ? "font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-700 shadow-xs"
                  : "font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              )}
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Marketplace</span>
            </Link>

            {/* Open PO */}
            <Link
              href="/open-po"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-colors shrink-0",
                pathname?.startsWith("/open-po")
                  ? "font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-700 shadow-xs"
                  : "font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              )}
            >
              <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Open PO</span>
              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full leading-none">
                PO
              </span>
            </Link>

            {/* Menfess */}
            <Link
              href="/mading"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-colors shrink-0",
                pathname?.startsWith("/mading")
                  ? "font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-700 shadow-xs"
                  : "font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              )}
            >
              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Menfess</span>
            </Link>

            {/* Obrolan */}
            <Link
              href="/chat"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-full transition-colors shrink-0 relative",
                pathname?.startsWith("/chat")
                  ? "font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-700 shadow-xs"
                  : "font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              )}
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Obrolan</span>
              <span className="text-[9px] font-bold text-white bg-emerald-700 px-1.5 py-0.5 rounded-full leading-none">
                {unreadChat}
              </span>
            </Link>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            {/* Kampus Switcher Dropdown */}
            <div className="relative group shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-full transition-colors border border-slate-200 dark:border-white/10 shadow-xs whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>
                  Kampus: <strong className="font-bold text-slate-900 dark:text-white">{selectedCampus}</strong>
                </span>
                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>

              {campusDropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-50">
                  {[...campuses.map((camp) => ({ key: camp.shortName, label: `${camp.name} (${camp.shortName})` })), { key: "Semua", label: "Semua Kampus" }].map((camp) => (
                    <button
                      key={camp.key}
                      type="button"
                      onClick={() => changeCampus(camp.key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors text-left",
                        selectedCampus === camp.key
                          ? "font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40"
                          : "font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <span>{camp.label}</span>
                      {selectedCampus === camp.key && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />

            {/* Masuk / Profil */}
            {siap && session.wa ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap text-slate-700 dark:text-slate-200"
                title="Buka Dashboard Akun"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {session.name ? session.name[0].toUpperCase() : "U"}
                </div>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-100">
                  {session.name || "Akun"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowOtp(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/80 dark:border-white/10">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                  Masuk
                </span>
              </button>
            )}

            {/* Primary Action Button: + Jual Barang */}
            <Link
              href="/jual"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-full shadow-xs hover:shadow transition duration-150 shrink-0 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>+ Jual Barang</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP APP BAR (Tinggi 56px — h-14) ── */}
      <div className={cn("lg:hidden px-3 sm:px-4 flex items-center justify-between gap-2.5", isSubPage ? "h-14" : "min-h-14 py-1.5")}>
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
                href="/keranjang"
                aria-label={`Keranjang${cartCount ? `, ${cartCount} barang` : ""}`}
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <Icon.ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
              <Link
                href="/jual"
                aria-label="Jual Barang"
                className="w-8 h-8 rounded-full bg-[#047857] text-white flex items-center justify-center shadow-xs active:scale-90 transition-all"
              >
                <Icon.Plus className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </>
        ) : (
          /* Root Pages: Brand + campus selector + actions */
          <>
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Icon.GraduationCap className="w-4.5 h-4.5 text-emerald-200" />
              </Link>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex flex-col text-sm font-extrabold leading-[0.95] tracking-tight text-[#0F172A] dark:text-white">
                  <span>Kampus</span>
                  <span>Kita</span>
                </span>
                <div className="relative flex items-center" ref={mobileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                    aria-label={`Pilih kampus, saat ini ${selectedCampus === "Semua" ? "Semua kampus" : selectedCampus}`}
                    aria-expanded={campusDropdownOpen}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-600/20 bg-[#ECFDF5] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#047857] dark:bg-emerald-950/80 dark:text-emerald-300"
                  >
                    {selectedCampus === "Semua" ? "Semua" : selectedCampus} ▾
                  </button>
                  {campusDropdownOpen && (
                    <div className="absolute left-0 top-full z-[60] mt-1 w-48 rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl dark:border-white/10 dark:bg-slate-800">
                      {[...campuses.map((camp) => ({ key: camp.shortName, label: `${camp.name} (${camp.shortName})` })), { key: "Semua", label: "Semua Kampus" }].map((camp) => (
                        <button
                          key={camp.key}
                          type="button"
                          onClick={() => changeCampus(camp.key)}
                          className={cn(
                            "flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors",
                            selectedCampus === camp.key
                              ? "bg-emerald-50/80 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                          )}
                        >
                          <span>{camp.label}</span>
                          {selectedCampus === camp.key && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                href="/keranjang"
                aria-label={`Keranjang${cartCount ? `, ${cartCount} barang` : ""}`}
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors active:scale-95"
              >
                <Icon.ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
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
