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

// Lima tujuan utama navigasi bawah yang stabil dan mudah dihafal jempol.
const BERANDA = { name: "Beranda", href: "/", icon: Icon.Home };
const CHAT = { name: "Chat", href: "/chat", icon: Icon.MessageCircle };

const MARKET = {
  name: "Market",
  href: "/jual-beli",
  match: ["/jual-beli", "/produk", "/jasa", "/favorit", "/dicari", "/toko", "/penjual", "/distributor"],
  icon: Icon.ShoppingBag,
};

// Halaman yang memang untuk menelusuri barang — di sinilah kolom cari
// pantas menempel di bawah, dalam jangkauan ibu jari.
const RUTE_PENCARIAN = ["/", "/jual-beli", "/jasa", "/dicari", "/favorit"];

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
          "text-[9px] transition-all duration-200 truncate max-w-full tracking-tight",
          isActive ? "font-bold" : "font-semibold"
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
      : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
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
  const { sesiWa, segarkan } = useSesi();
  const [bukaCari, setBukaCari] = useState(false);
  const [bukaBuat, setBukaBuat] = useState(false);
  const [bukaOtp, setBukaOtp] = useState(false);
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

  // Sembunyikan/minimalkan BottomNavbar jika sedang di dalam room chat aktif
  const isChatRoom =
    pathname === "/chat" && searchParams && (searchParams.has("anon") || searchParams.has("room"));

  const adaPencarian = RUTE_PENCARIAN.includes(pathname || "");
  const navKiri = [BERANDA, MARKET];

  const AKUN = sesiWa
    ? {
        name: "Akun",
        href: "/dashboard",
        match: ["/profil", "/dashboard", "/pengaturan"],
        icon: Icon.User,
      }
    : {
        name: "Masuk",
        href: "#",
        icon: Icon.User,
        onClick: () => setBukaOtp(true),
      };

  const navKanan = [CHAT, AKUN];
  // Sheet yang terbuka menahan dock supaya tidak menyingkir di belakangnya.
  const menyingkir = tersembunyi && !bukaCari && !bukaBuat && !bukaOtp && !isChatRoom;

  return (
    <>
      {/* Kolom cari yang menempel di bawah — pengganti address bar dalam
          jangkauan ibu jari, ikut menyingkir saat halaman digulir. */}
      {adaPencarian && !isChatRoom && (
        <div
          data-bottom-search
          className={cn(
            "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-[650px] -translate-x-1/2 transition-all duration-300 md:hidden",
            menyingkir
              ? "translate-y-[220%] opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100"
          )}
        >
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setBukaCari(true);
            }}
            aria-label="Buka pencarian barang, jasa, dan kos"
            className="flex w-full items-center gap-2.5 rounded-full border border-black/[0.06] bg-white/92 px-4 py-2.5 text-left shadow-[0_8px_26px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#111113]/92"
          >
            <Icon.Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="truncate text-[13px] font-medium text-slate-600 dark:text-slate-300">
              Cari barang, jasa, kos…
            </span>
          </button>
        </div>
      )}

      <div
        className={cn(
          "fixed left-1/2 z-40 -translate-x-1/2 select-none no-tap-highlight transition-all duration-300 md:hidden",
          menyingkir
            ? "translate-y-[160%] opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100",
          isChatRoom
            ? "bottom-0 w-full max-w-md bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] pb-[env(safe-area-inset-bottom)] shadow-none"
            : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-[380px] rounded-[22px] border border-black/[0.06] bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#0f172a]/90"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-around px-2",
            isChatRoom ? "h-12" : "h-[56px] px-1"
          )}
        >
          {navKiri.map((n) => (
            <ItemNav key={n.name} n={n} pathname={pathname} />
          ))}

          {/* Tombol buat */}
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setBukaBuat(true);
            }}
            aria-label="Buat postingan atau iklan baru"
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.9] touch-manipulation",
              isChatRoom ? "w-10" : "w-10 xs:w-12 -mt-5"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-[16px] bg-primary text-white shadow-[0_8px_20px_rgba(124,58,237,0.4)] ring-4 ring-white/90 dark:ring-[#111113]/90",
                isChatRoom ? "h-8 w-8 rounded-full" : "h-11 w-11 md:h-10 md:w-10"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                className={isChatRoom ? "h-4 w-4" : "h-[18px] w-[18px]"}
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            {!isChatRoom && (
              <span className="mt-0.5 text-[9px] font-bold tracking-tight text-primary dark:text-primary">
                Buat
              </span>
            )}
          </button>

          {navKanan.map((n) => (
            <ItemNav key={n.name} n={n} pathname={pathname} badge={n.name === "Chat" ? unreadChat : 0} />
          ))}
        </div>
      </div>

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
