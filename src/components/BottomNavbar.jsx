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

// Lima tujuan utama navigasi bawah yang stabil dan mudah dihafal jempol.
const BERANDA = { name: "Beranda", href: "/", icon: Icon.Home };
const CHAT = { name: "Chat", href: "/chat", icon: Icon.MessageCircle };

const MARKET = {
  name: "Market",
  href: "/jual-beli",
  match: ["/jual-beli", "/produk", "/jasa", "/favorit", "/dicari", "/toko", "/penjual", "/distributor"],
  icon: Icon.ShoppingBag,
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
          isActive ? "bg-primary/10 dark:bg-violet-400/15" : "bg-transparent"
        )}
      >
        <IconComp
          className={cn(
            "h-[18px] w-[18px] transition-transform duration-200",
            isActive ? "scale-105 stroke-[2.4px]" : "scale-100 stroke-[1.8px]"
          )}
        />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 shadow">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[10.5px] min-[360px]:text-[11px] leading-tight transition-all duration-200 truncate max-w-full tracking-tight mt-0.5",
          isActive ? "font-bold text-primary dark:text-violet-400" : "font-semibold text-slate-600 dark:text-slate-300"
        )}
      >
        {n.name}
      </span>
    </>
  );

  const buttonClasses = cn(
    "group relative flex w-12 xs:w-14 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-[0.92] touch-manipulation",
    isActive
      ? "text-primary dark:text-violet-400 font-bold"
      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white font-semibold"
  );

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

  // Sembunyikan/minimalkan BottomNavbar jika sedang di dalam room chat aktif atau halaman detail produk
  const isChatRoom =
    pathname === "/chat" && searchParams && (searchParams.has("anon") || searchParams.has("room"));
  const isProductPage = pathname?.startsWith("/produk/");
  const hideFloating = isChatRoom || isProductPage;
  const navKiri = [BERANDA, MARKET];
  // Saat belum siap (server/hydration), selalu pakai tombol Masuk
  // supaya server HTML dan client HTML sama persis — tidak ada Link vs button mismatch.
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

  const navKanan = [CHAT, AKUN];
  // Sheet atau drawer yang terbuka menahan dock supaya tidak menyingkir di belakangnya.
  const menyingkir = tersembunyi && !bukaCari && !bukaBuat && !bukaOtp && !bukaSidebar && !isChatRoom;

  return (
    <>

      {/* Tombol Menu Burger: Nempel di Kiri Agak Bawah Dikit (Khusus Mobile) */}
      {!hideFloating && (
        <div
          className={cn(
            "fixed bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.5rem)] left-4 z-40 md:hidden transition-all duration-300",
            menyingkir ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}
        >
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setBukaSidebar(true);
            }}
            aria-label="Buka Menu Kampus (Sidebar)"
            title="Menu Kampus"
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-white/95 dark:bg-[#1c1c1e]/95 text-slate-700 dark:text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-black/[0.08] dark:border-white/[0.12] backdrop-blur-xl active:scale-90 transition-all duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="h-5 w-5 transition-transform duration-200 group-hover:scale-105"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      )}

      {/* Tombol Buat Baru: Ikon Plus Melayang di Kiri Bawah (Khusus Mobile) */}
      {!hideFloating && (
        <div
          className={cn(
            "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 md:hidden transition-all duration-300",
            menyingkir ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          )}
        >
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setBukaBuat(true);
            }}
            aria-label="Buat postingan atau iklan baru"
            title="Buat Baru"
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-primary hover:bg-primary-hover text-white shadow-[0_10px_25px_rgba(124,58,237,0.45)] ring-4 ring-white/90 dark:ring-[#111113]/90 active:scale-90 transition-all duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
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
