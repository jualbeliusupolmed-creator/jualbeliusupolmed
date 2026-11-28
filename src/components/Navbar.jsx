"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSesi } from "@/components/SesiProvider";
import { cn } from "@/lib/utils";
import { getCartItems } from "@/lib/cart";
import { fetchCampusesCached } from "@/lib/cachedKampus";

const OTPModal = dynamic(() => import("@/components/OTPModal"), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/NotificationCenter"), { ssr: false });
const QuickSearchSheet = dynamic(() => import("@/components/QuickSearchSheet"), { ssr: false });

const NAV_ITEMS = [
  {
    key: "jual-beli",
    label: "Jual Beli",
    href: "/",
    icon: "shopping_bag",
    match: ["/", "/jual-beli", "/produk", "/jual", "/jasa", "/dicari", "/toko", "/penjual", "/keranjang", "/favorit", "/edit", "/swap"],
  },
  {
    key: "open-po",
    label: "Open PO",
    href: "/open-po",
    icon: "inventory_2",
    match: ["/open-po"],
  },
  {
    key: "linusku",
    label: "LINUSKU",
    href: "/linusku",
    icon: "directions_bus",
    match: ["/linusku"],
  },
  {
    key: "berita",
    label: "Berita",
    href: "/mading",
    icon: "newspaper",
    match: ["/mading", "/blog"],
  },
  {
    key: "jelajahi",
    label: "Jelajahi",
    href: "/jelajahi",
    icon: "explore",
    match: ["/jelajahi", "/organisasi", "/oprec", "/faq", "/teman", "/cari-teman", "/sosial", "/panduan-aman"],
  },
];

function getActiveNav(pathname) {
  if (!pathname || pathname === "/") return NAV_ITEMS[0];
  for (const item of NAV_ITEMS) {
    if (item.key === "jual-beli") {
      if (item.match.some((p) => p !== "/" && pathname.startsWith(p))) return item;
    } else if (item.match.some((p) => pathname.startsWith(p))) {
      return item;
    }
  }
  return NAV_ITEMS[0];
}

function getMobileHeaderMeta(pathname) {
  if (pathname?.startsWith("/open-po")) return { title: "Open PO", icon: "receipt_long" };
  if (pathname?.startsWith("/linusku")) return { title: "LINUSKU", icon: "directions_bus", subtitle: "Layanan transportasi kampus USU" };
  if (pathname?.startsWith("/mading") || pathname?.startsWith("/blog")) return { title: "Kampus Kita", icon: "newspaper" };
  if (pathname?.startsWith("/jelajahi") || pathname?.startsWith("/organisasi") || pathname?.startsWith("/oprec") || pathname?.startsWith("/faq")) {
    return { title: "Jelajahi", icon: "explore" };
  }
  if (pathname?.startsWith("/dashboard")) return { title: "Dashboard Saya", icon: "person", subtitle: "Kelola aktivitas Kampus Kita" };
  if (pathname?.startsWith("/jual")) return { title: "Jual Barang", icon: "add_box" };
  return { title: "Jual Beli", icon: "school" };
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa, nama: sesiNama, keluar, profil } = useSesi();
  const [selectedCampus, setSelectedCampus] = useState("Universitas Sumatera Utara");
  const [unreadChat, setUnreadChat] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [notifTerbuka, setNotifTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const activeNav = getActiveNav(pathname);
  const mobileMeta = getMobileHeaderMeta(pathname);

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
    fetchCampusesCached()
      .then((data) => {
        if (Array.isArray(data?.campuses)) {
          const saved = localStorage.getItem("preferred_campus");
          if (saved && saved !== "Semua") {
            const matched = data.campuses.find((c) => c.shortName === saved);
            if (matched?.name) setSelectedCampus(matched.name);
            else setSelectedCampus(saved);
          }
        }
      })
      .catch(() => {});

    const onChatUnread = (e) => setUnreadChat(e.detail?.count ?? 0);
    window.addEventListener("chat:unread", onChatUnread);

    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("chat:unread", onChatUnread);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (profil?.campus) {
      setSelectedCampus(profil.campus === "USU" ? "Universitas Sumatera Utara" : profil.campus);
    }
  }, [profil]);

  const handleDesktopSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setCariTerbuka(true);
      return;
    }
    if (pathname?.startsWith("/open-po")) {
      router.push(`/open-po?q=${encodeURIComponent(q)}`);
    } else if (pathname?.startsWith("/mading") || pathname?.startsWith("/blog")) {
      router.push(`/mading?q=${encodeURIComponent(q)}`);
    } else if (pathname?.startsWith("/jelajahi")) {
      router.push(`/jelajahi?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/jual-beli?q=${encodeURIComponent(q)}`);
    }
  };

  // Sub-pages like /jual or /mading/[id] render their own Stitch back header on mobile if desired,
  // while keeping the unified sticky top header on desktop.
  const isCustomMobileHeader = pathname?.startsWith("/jual") || pathname?.startsWith("/edit/");

  return (
    <>
      {/* Desktop Sticky Header (Stitch Design System: h-20, 5-menu pill nav) */}
      <header className="hidden lg:block sticky top-0 left-0 right-0 w-full z-50 bg-white/90 dark:bg-[#112218]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#134e35]/5">
        <div className="h-20 max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 text-[#003622] dark:text-[#ecfeee] group">
              <div className="w-10 h-10 rounded-full bg-[#003622] flex items-center justify-center text-[#ceeb7a] shadow-[0_4px_16px_-2px_rgba(19,78,53,0.15)] transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[22px]">local_library</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[20px] font-bold text-[#003622] dark:text-white leading-tight tracking-tight">
                  Kampus Kita
                </span>
                <span className="text-[10px] font-semibold text-[#404943] dark:text-[#99d3b2] leading-none mt-0.5">
                  {selectedCampus}
                </span>
              </div>
            </Link>

            <nav
              aria-label="Navigasi Utama"
              className="flex items-center gap-1 p-1 bg-[#e6f8e8] dark:bg-[#183022] rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
            >
              {NAV_ITEMS.map((item) => {
                const active = activeNav.key === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-[13px] tracking-[0.01em] transition-all whitespace-nowrap",
                      active
                        ? "bg-[#ceeb7a] text-[#161f00] font-bold shadow-sm"
                        : "text-[#404943] dark:text-[#99d3b2] font-semibold hover:text-[#101f15] hover:bg-[#e0f3e3] dark:hover:bg-[#134e35]/40"
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 justify-end flex-1 max-w-md">
            <form onSubmit={handleDesktopSearch} className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707972] text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang, PO, berita..."
                className="w-full pl-9 pr-4 py-2 bg-[#e6f8e8] hover:bg-[#e0f3e3] focus:bg-white dark:bg-[#183022] dark:focus:bg-[#112218] text-[#101f15] dark:text-white text-[12px] rounded-full outline-none transition-all placeholder:text-[#707972] focus:ring-2 focus:ring-[#134e35]/30"
              />
            </form>

            {cartCount > 0 && (
              <Link
                href="/keranjang"
                aria-label="Keranjang"
                className="relative w-10 h-10 rounded-full bg-[#e6f8e8] text-[#134e35] hover:bg-[#e0f3e3] flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#134e35] text-[#bef264] text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>
            )}

            <Link
              href="/chat"
              aria-label="Pesan Masuk"
              className="relative w-10 h-10 rounded-full bg-[#e6f8e8] dark:bg-[#183022] text-[#404943] dark:text-[#99d3b2] hover:bg-[#e0f3e3] hover:text-[#101f15] flex items-center justify-center transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              {unreadChat > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ceeb7a] ring-2 ring-white" />
              )}
            </Link>

            <button
              type="button"
              onClick={() => setNotifTerbuka(true)}
              aria-label="Notifikasi Kampus"
              className="relative w-10 h-10 rounded-full bg-[#e6f8e8] dark:bg-[#183022] text-[#404943] dark:text-[#99d3b2] hover:bg-[#e0f3e3] hover:text-[#101f15] flex items-center justify-center transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
            </button>

            <div className="relative pl-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (!sesiWa) setShowOtp(true);
                  else setUserMenuOpen((v) => !v);
                }}
                aria-label={sesiWa ? "Menu Akun" : "Masuk Akun"}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#e6f8e8] transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-[#003622] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {sesiNama ? (
                    sesiNama.charAt(0).toUpperCase()
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  )}
                </div>
                <span className="material-symbols-outlined text-[#404943] text-[18px]">expand_more</span>
              </button>

              {userMenuOpen && sesiWa && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#112218] shadow-[0_12px_32px_rgba(19,78,53,0.16)] border border-[#134e35]/10 p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#134e35]/10 mb-1">
                    <p className="text-xs font-bold text-[#101f15] dark:text-white truncate">
                      {sesiNama || "Mahasiswa"}
                    </p>
                    <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] truncate">{sesiWa}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#101f15] dark:text-white hover:bg-[#e6f8e8] dark:hover:bg-[#183022]"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#134e35]">dashboard</span>
                    Dashboard Saya
                  </Link>
                  <Link
                    href="/profil"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#101f15] dark:text-white hover:bg-[#e6f8e8] dark:hover:bg-[#183022]"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#134e35]">manage_accounts</span>
                    Profil &amp; Toko
                  </Link>
                  <Link
                    href="/jual"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#101f15] dark:text-white hover:bg-[#e6f8e8] dark:hover:bg-[#183022]"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#134e35]">add_circle</span>
                    Jual Barang
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      keluar?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#ba1a1a] hover:bg-rose-50 mt-1"
                  >
                    <span className="material-symbols-outlined text-[17px]">logout</span>
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top App Bar (Stitch Design System: h-14, crisp white/mint translucent) */}
      {!isCustomMobileHeader && (
        <header className="lg:hidden sticky top-0 inset-x-0 z-40 bg-[#f4faf5]/90 dark:bg-[#112218]/90 backdrop-blur-md border-b border-emerald-950/5">
          <div className="h-14 px-4 flex items-center justify-between max-w-md mx-auto">
            <Link href={activeNav.href} className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#134e35] flex items-center justify-center text-[#bef264] shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[19px]">{mobileMeta.icon}</span>
              </div>
              <div className="min-w-0">
                <span className="font-bold text-[17px] tracking-tight text-[#134e35] dark:text-[#ecfeee] block leading-tight truncate">
                  {mobileMeta.title}
                </span>
                {mobileMeta.subtitle && (
                  <span className="text-[10.5px] font-medium text-[#404943] dark:text-[#99d3b2] block leading-none truncate">
                    {mobileMeta.subtitle}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              {cartCount > 0 && (
                <Link
                  href="/keranjang"
                  aria-label="Keranjang"
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#134e35] hover:bg-emerald-50 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                  <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#134e35] text-[#bef264] text-[9px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => setNotifTerbuka(true)}
                aria-label="Notifikasi"
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-[#99d3b2] hover:text-[#134e35] hover:bg-emerald-50 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[21px]">notifications</span>
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sesiWa) router.push("/dashboard");
                  else setShowOtp(true);
                }}
                aria-label="Profil"
                className="w-8 h-8 rounded-full bg-[#134e35] text-white flex items-center justify-center active:scale-95 transition-all shadow-xs text-xs font-bold"
              >
                {sesiNama ? (
                  sesiNama.charAt(0).toUpperCase()
                ) : (
                  <span className="material-symbols-outlined text-[18px]">person</span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {notifTerbuka && <NotificationCenter onClose={() => setNotifTerbuka(false)} />}
      {cariTerbuka && <QuickSearchSheet onClose={() => setCariTerbuka(false)} />}
      {showOtp && <OTPModal onClose={() => setShowOtp(false)} />}
    </>
  );
}
