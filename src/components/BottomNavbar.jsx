"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./Icons";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { useHideOnScroll } from "@/lib/useHideOnScroll";
import QuickSearchSheet from "./QuickSearchSheet";
import CreateSheet from "./CreateSheet";

// Dua slot terluar (Beranda dan Chat) tidak pernah pindah tempat, begitu
// juga tombol buat di tengah. Yang berganti cuma sepasang slot di dalam:
// biasanya Market + Sosial, tetapi begitu pengguna masuk area sosial,
// pasangan itu jadi Sosial + Swipe — seperti dock lama, cuma tanpa
// menggeser tujuan yang sudah dihafal jempol.
const BERANDA = { name: "Beranda", href: "/", icon: Icon.Home };
const CHAT = { name: "Chat", href: "/chat", icon: Icon.MessageCircle };

const MARKET = {
  name: "Market",
  href: "/jual-beli",
  match: ["/jual-beli", "/produk", "/jasa", "/favorit", "/dicari", "/toko", "/penjual", "/distributor"],
  icon: Icon.ShoppingBag,
};

const SOSIAL = {
  name: "Sosial",
  href: "/mading",
  match: ["/sosial", "/mading", "/organisasi", "/oprec"],
  icon: Icon.BookOpen,
};

const SWIPE = {
  name: "Teman",
  href: "/teman",
  match: ["/teman", "/cari-teman", "/swap"],
  icon: Icon.Users,
};

// Chat sengaja tidak dihitung sebagai area sosial: ia dibuka dari mana saja,
// jadi dock tidak perlu ikut berubah tiap kali orang membalas pesan.
const RUTE_SOSIAL = ["/sosial", "/mading", "/organisasi", "/oprec", "/teman", "/cari-teman", "/swap"];

// Halaman yang memang untuk menelusuri barang — di sinilah kolom cari
// pantas menempel di bawah, dalam jangkauan ibu jari.
const RUTE_PENCARIAN = ["/", "/jual-beli", "/jasa", "/dicari", "/favorit"];

function ItemNav({ n, pathname }) {
  const cakupan = n.match || [n.href];
  const isActive =
    pathname === n.href || cakupan.some((c) => c !== "/" && pathname?.startsWith(c));
  const IconComp = n.icon;

  return (
    <Link
      href={n.href}
      onClick={() => hapticLight()}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-14 xs:w-16 md:w-16 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-[0.92] touch-manipulation",
        isActive
          ? "text-primary dark:text-violet-400 font-bold"
          : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full p-1 transition-all duration-200",
          isActive ? "bg-primary/10 dark:bg-violet-400/15" : "bg-transparent"
        )}
      >
        <IconComp
          className={cn(
            "h-5 w-5 md:h-4.5 md:w-4.5 transition-transform duration-200",
            isActive ? "scale-105 stroke-[2.4px]" : "scale-100 stroke-[1.8px]"
          )}
        />
      </div>
      <span
        className={cn(
          "text-[10px] md:text-[9px] transition-all duration-200 truncate max-w-full tracking-tight",
          isActive ? "font-bold" : "font-semibold"
        )}
      >
        {n.name}
      </span>
    </Link>
  );
}

function BottomNavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bukaCari, setBukaCari] = useState(false);
  const [bukaBuat, setBukaBuat] = useState(false);
  const tersembunyi = useHideOnScroll();

  // Sembunyikan/minimalkan BottomNavbar jika sedang di dalam room chat aktif
  const isChatRoom =
    pathname === "/chat" && searchParams && (searchParams.has("anon") || searchParams.has("room"));

  const adaPencarian = RUTE_PENCARIAN.includes(pathname || "");
  // Di area sosial, Market mundur satu langkah (masih sekali ketuk lewat
  // Beranda) supaya Swipe bisa berdiri di sebelah Sosial.
  const diAreaSosial = RUTE_SOSIAL.some(
    (r) => pathname === r || pathname?.startsWith(`${r}/`)
  );
  const navKiri = [BERANDA, diAreaSosial ? SOSIAL : MARKET];
  const navKanan = [diAreaSosial ? SWIPE : SOSIAL, CHAT];
  // Sheet yang terbuka menahan dock supaya tidak menyingkir di belakangnya.
  const menyingkir = tersembunyi && !bukaCari && !bukaBuat && !isChatRoom;

  return (
    <>
      {/* Kolom cari yang menempel di bawah — pengganti address bar dalam
          jangkauan ibu jari, ikut menyingkir saat halaman digulir. */}
      {adaPencarian && !isChatRoom && (
        <div
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
          "fixed left-1/2 z-40 -translate-x-1/2 select-none no-tap-highlight transition-all duration-300",
          menyingkir
            ? "translate-y-[160%] opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto"
            : "translate-y-0 opacity-100",
          isChatRoom
            ? "bottom-0 w-full max-w-2xl bg-white/90 dark:bg-[#000000]/90 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] pb-[env(safe-area-inset-bottom)] shadow-none"
            : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-[650px] rounded-[28px] border border-black/[0.06] bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#111113]/90"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-around px-2",
            isChatRoom ? "h-12 md:h-10" : "h-16 md:h-14 md:px-4 md:gap-2"
          )}
        >
          {navKiri.map((n) => (
            <ItemNav key={n.name} n={n} pathname={pathname} />
          ))}

          {/* Tombol buat — satu-satunya tombol berisi warna penuh di dock,
              jadi tidak mungkin tertukar dengan tombol suka atau favorit. */}
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              setBukaBuat(true);
            }}
            aria-label="Buat postingan atau iklan baru"
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.9] touch-manipulation",
              isChatRoom ? "w-12" : "w-14 xs:w-16 md:w-16 -mt-5 md:-mt-4"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgba(83,43,152,0.4)] ring-4 ring-white/90 dark:ring-[#111113]/90",
                isChatRoom ? "h-8 w-8" : "h-12 w-12 md:h-11 md:w-11"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                className={isChatRoom ? "h-4 w-4" : "h-5 w-5"}
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            {!isChatRoom && (
              <span className="mt-0.5 text-[10px] md:text-[9px] font-bold tracking-tight text-primary dark:text-violet-400">
                Buat
              </span>
            )}
          </button>

          {navKanan.map((n) => (
            <ItemNav key={n.name} n={n} pathname={pathname} />
          ))}
        </div>
      </div>

      <QuickSearchSheet isOpen={bukaCari} onClose={() => setBukaCari(false)} />
      <CreateSheet isOpen={bukaBuat} onClose={() => setBukaBuat(false)} />
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
