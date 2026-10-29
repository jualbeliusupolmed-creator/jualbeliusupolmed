"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { useHideOnScroll } from "@/lib/useHideOnScroll";
import { useSesi } from "./SesiProvider";
import QuickSearchSheet from "./QuickSearchSheet";
import CreateSheet from "./CreateSheet";
import OTPModal from "./OTPModal";
import MobileSidebarDrawer from "./MobileSidebarDrawer";

const BERANDA = { name: "Beranda", href: "/", icon: Icon.Home };
const MARKET = {
  name: "Marketplace",
  href: "/jual-beli",
  match: ["/jual-beli", "/produk", "/jasa", "/favorit", "/dicari", "/toko", "/penjual", "/distributor"],
  icon: Icon.ShoppingBag,
};
const OPEN_PO = {
  name: "Open PO",
  href: "/open-po",
  match: ["/open-po"],
  icon: Icon.Coffee,
  badgeText: "PO",
};
const MENFESS = {
  name: "Menfess",
  href: "/mading",
  match: ["/mading", "/organisasi", "/oprec"],
  icon: Icon.Heart,
};

function ItemNav({ n, pathname, badge = 0 }) {
  const cakupan = n.match || [n.href];
  const isActive =
    n.href !== "#" &&
    (pathname === n.href || cakupan.some((c) => c !== "/" && pathname?.startsWith(c)));
  const IconComp = n.icon;

  const content = (
    <>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full p-1 transition-all duration-200",
          isActive ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#126B49] dark:text-emerald-400" : "bg-transparent text-slate-500 dark:text-slate-400"
        )}
      >
        <IconComp
          className={cn(
            "h-[19px] w-[19px] transition-transform duration-200",
            isActive ? "scale-105 stroke-[2.3px]" : "scale-100 stroke-[1.8px]"
          )}
        />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {n.badgeText && (
          <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-amber-500 text-white font-extrabold text-[8px] rounded-full leading-none shadow-xs">
            {n.badgeText}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] leading-tight transition-all duration-200 truncate max-w-full tracking-tight",
          isActive ? "font-extrabold text-[#126B49] dark:text-emerald-400" : "font-semibold text-slate-500 dark:text-slate-400"
        )}
      >
        {n.name}
      </span>
    </>
  );

  const buttonClasses = cn(
    "group relative flex w-12 xs:w-14 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-[0.92] touch-manipulation",
    isActive
      ? "text-[#126B49] dark:text-emerald-400 font-bold"
      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold"
  );

  if (n.external) {
    return (
      <a
        href={n.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => hapticLight()}
        aria-label={n.name}
        className={buttonClasses}
      >
        {content}
      </a>
    );
  }

  if (n.onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          hapticLight();
          n.onClick();
        }}
        aria-label={n.name}
        className={buttonClasses}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={n.href}
      onClick={() => hapticLight()}
      aria-current={isActive ? "page" : undefined}
      className={buttonClasses}
    >
      {content}
    </Link>
  );
}

function BottomNavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wa: sesiWa, siap, segarkan } = useSesi();
  const [bukaCari, setBukaCari] = useState(false);
  const [bukaBuat, setBukaBuat] = useState(false);
  const [bukaOtp, setBukaOtp] = useState(false);
  const [bukaSidebar, setBukaSidebar] = useState(false);
  const tersembunyi = useHideOnScroll();
  const [unreadChat, setUnreadChat] = useState(0);

  // Listen for unread chat badge events
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

  // Listen for drawer:open event from header hamburger button
  useEffect(() => {
    function onOpenDrawer() { setBukaSidebar(true); }
    window.addEventListener("drawer:open", onOpenDrawer);
    return () => window.removeEventListener("drawer:open", onOpenDrawer);
  }, []);

  // Sembunyikan/minimalkan BottomNavbar jika sedang di dalam room chat aktif atau halaman detail produk
  const isChatRoom =
    pathname === "/chat" && searchParams && (searchParams.has("anon") || searchParams.has("room"));
  const isProductPage = pathname?.startsWith("/produk/");
  const hideFloating = isChatRoom || isProductPage;

  const AKUN = siap && sesiWa
    ? {
        name: "Akun",
        href: "/dashboard",
        match: ["/profil", "/dashboard", "/pengaturan"],
        icon: Icon.User,
      }
    : {
        name: siap ? "Masuk" : "Akun",
        href: "#",
        icon: Icon.User,
        onClick: siap ? () => setBukaOtp(true) : undefined,
      };

  // Sheet atau drawer yang terbuka menahan dock supaya tidak menyingkir di belakangnya.
  const menyingkir = tersembunyi && !bukaCari && !bukaBuat && !bukaOtp && !bukaSidebar && !isChatRoom;

  return (
    <>
      {/* ── MOBILE BOTTOM NAVIGATION DOCK (5 DESTINATIONS) ── */}
      {!hideFloating && (
        <nav
          aria-label="Navigasi bawah mobile"
          className={cn(
            "fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-white/[0.08] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] transition-all duration-300",
            menyingkir ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}
          style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center justify-around h-14 px-1 max-w-md mx-auto">
            <ItemNav n={BERANDA} pathname={pathname} />
            <ItemNav n={MARKET} pathname={pathname} />
            <ItemNav n={OPEN_PO} pathname={pathname} />
            <ItemNav n={MENFESS} pathname={pathname} />
            <ItemNav n={AKUN} pathname={pathname} />
          </div>
        </nav>
      )}

      <MobileSidebarDrawer isOpen={bukaSidebar} onClose={() => setBukaSidebar(false)} />
      <QuickSearchSheet isOpen={bukaCari} onClose={() => setBukaCari(false)} />
      <CreateSheet isOpen={bukaBuat} onClose={() => setBukaBuat(false)} />
      <OTPModal
        isOpen={bukaOtp}
        onClose={() => setBukaOtp(false)}
        onSuccess={() => {
          setBukaOtp(false);
          segarkan?.();
          router.refresh();
        }}
      />
    </>
  );
}

export default function BottomNavbar() {
  return (
    <Suspense fallback={null}>
      <BottomNavbarInner />
    </Suspense>
  );
}
