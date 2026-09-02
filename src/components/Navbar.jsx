"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";
import OTPModal from "@/components/OTPModal";
import { useSesi } from "@/components/SesiProvider";
import NotificationCenter from "@/components/NotificationCenter";
import { toast } from "sonner";
import { useHideOnScroll } from "@/lib/useHideOnScroll";
import { bacaTema, terapkanTema } from "@/lib/tampilan";
import QuickSearchSheet from "@/components/QuickSearchSheet";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/jual-beli", label: "Marketplace" },
  { href: "/mading", label: "Menfess" },
  { href: "/organisasi", label: "UKM" },
  { href: "/oprec", label: "Oprec" },
  { href: "/dicari", label: "Dicari" },
  { href: "/teman", label: "Cari Teman", icon: "Fire" },
  { href: "/chat", label: "Obrolan" },
];
export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  // Sesi tidak lagi diambil sendiri di sini. Dulu Navbar memanggil
  // /api/auth/me pada SETIAP pindah alamat, dan hasilnya berhenti di
  // komponen ini — nomor yang sudah diketahuinya tidak pernah dikembalikan
  // ke localStorage, padahal delapan berkas lain membacanya dari sana.
  const { wa: sesiWa, nama: sesiNama, segarkan, keluar } = useSesi();
  const session = { wa: sesiWa, name: sesiNama || sesiWa };
  const [navQ, setNavQ] = useState("");
  const [wantedCount, setWantedCount] = useState(0);
  const [notifTerbuka, setNotifTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const sessionSyncedAtRef = useRef(0);
  // Bilah tidak boleh menyingkir sambil membawa panel yang sedang dibuka.
  const bilahTersembunyi =
    useHideOnScroll({ batasAtas: 96 }) && !notifTerbuka && !cariTerbuka;

  const submitSearch = (e) => {
    e.preventDefault();
    const term = navQ.trim();
    // Beranda tidak membaca ?q= — hasil pencarian ada di halaman marketplace.
    router.push(term ? `/jual-beli?q=${encodeURIComponent(term)}` : "/jual-beli");
  };

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    // Kalau pengguna belum memilih tema sendiri, ikuti setelan HP-nya —
    // termasuk saat ia berganti ke mode gelap sambil halaman terbuka.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const ikutSistem = () => {
      if (bacaTema() !== "sistem") return;
      setDark(!!terapkanTema("sistem"));
    };
    ikutSistem();
    media.addEventListener?.("change", ikutSistem);

    // Fetch wanted count for badge
    fetch("/api/wanted?limit=1")
      .then((r) => r.json())
      .then((d) => setWantedCount(d.total || d.listings?.length || 0))
      .catch(() => {});

    return () => media.removeEventListener?.("change", ikutSistem);
  }, []);


  const doLogout = async () => {
    await keluar();
    toast.success("Berhasil keluar.");
    router.refresh();
  };

  const toggleTheme = () => {
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-transform duration-300 will-change-transform ${
        bilahTersembunyi ? "-translate-y-full md:translate-y-0" : "translate-y-0"
      }`}
    >
      {/* ── Top bar: Apple Frosted Glass ── */}
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl transition-all duration-300 dark:border-white/[0.08] dark:bg-[#000000]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-1.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group min-w-0 shrink active:scale-[0.98] transition-transform">
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Logo className="h-5 w-5" src={config?.site?.logoUrl} />
            </div>
            <span className="truncate text-[13px] font-bold leading-none tracking-tight text-[#1d1d1f] transition-colors dark:text-[#f5f5f7]">
              USUPOLMEDUPDATE
            </span>
          </Link>

          {/* Right side: search, unified user account button, notif, theme, cta */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Search mini — Spotlight style */}
            <form onSubmit={submitSearch} className="relative hidden">
              <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-primary" />
              <input
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cari di kampus…"
                aria-label="Cari barang"
                className="peer w-36 rounded-full border border-black/[0.06] bg-black/[0.04] py-1.5 pl-8.5 pr-3 text-xs text-[#1d1d1f] outline-none transition-all duration-300 focus:w-52 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-white/[0.08] dark:bg-white/[0.08] dark:text-[#f5f5f7] dark:focus:border-primary/40 dark:focus:bg-[#1c1c1e]"
              />
            </form>

            {/* Unified User Account / Dashboard Button */}
            {session.wa ? (
              <div className="flex items-center gap-0.5 bg-black/[0.04] dark:bg-white/[0.08] p-0.5 rounded-full border border-black/[0.04] dark:border-white/[0.06]">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1c1c1e] px-2.5 py-1 text-[11px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-primary dark:hover:text-emerald-400 transition-all active:scale-[0.96] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  title="Buka Dashboard Akun"
                  aria-label="Buka dashboard"
                >
                  <Icon.User className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="max-w-[75px] truncate">{session.name || session.wa}</span>
                  <span className="hidden lg:inline text-[9px] text-gray-400 font-medium">· Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    toast("Keluar dari akun ini?", {
                      action: { label: "Keluar", onClick: doLogout },
                      cancel: { label: "Batal" },
                    });
                  }}
                  className="px-1.5 py-1 text-gray-400 hover:text-rose-500 rounded-full transition-colors text-[11px] font-bold active:scale-90"
                  title="Keluar dari akun"
                  aria-label="Keluar dari akun"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOtp(true)}
                className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1.5 text-[11px] font-bold text-[#1d1d1f] transition-all duration-200 hover:bg-black/[0.06] active:scale-[0.95] dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-[#f5f5f7] dark:hover:bg-white/[0.1]"
                title="Masuk / Daftar Akun"
              >
                <Icon.User className="h-3 w-3" />
                <span>Masuk</span>
              </button>
            )}

            <Link
              href="/chat"
              aria-label="Buka pesan"
              title="Pesan"
              className="rounded-full p-1.5 text-gray-500 transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1d1d1f] active:scale-90 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Icon.MessageCircle className="h-4 w-4" />
            </Link>

            {/* Cari — pil di bawah hanya ada di halaman telusur, jadi ikon
                ini yang menjamin pencarian tetap terjangkau di halaman lain. */}
            <button
              onClick={() => setCariTerbuka(true)}
              aria-label="Cari barang atau jasa"
              title="Cari"
              className="rounded-full p-1.5 text-gray-500 transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1d1d1f] active:scale-90 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Icon.Search className="h-4 w-4" />
            </button>

            {/* Notification Center */}
            <NotificationCenter onOpenChange={setNotifTerbuka} />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-1.5 text-gray-500 transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1d1d1f] active:scale-90 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
              aria-label="Toggle Theme"
            >
              <div className="relative h-4 w-4 overflow-hidden">
                <svg className={`absolute inset-0 h-4 w-4 transform transition-transform duration-500 ${dark ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <svg className={`absolute inset-0 h-4 w-4 transform transition-transform duration-500 ${dark ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
            </button>

            {/* Jual Barang CTA */}
            <Link href="/jual" className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(83,43,152,0.25)] transition-all duration-200 hover:brightness-105 active:scale-[0.95]">
              <span>+ Jual</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Nav links bar — Apple Segmented Style ── */}
      <div className="relative hidden border-b border-black/[0.06] bg-white/70 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#000000]/70">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#f5f5f7] to-transparent z-10 dark:from-[#000000]" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f5f5f7] to-transparent z-10 dark:from-[#000000]" />
        
        <nav className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold tracking-tight transition-all duration-200 active:scale-[0.96] ${
                  active
                    ? "bg-black/[0.08] text-[#1d1d1f] dark:bg-white/[0.14] dark:text-[#f5f5f7] shadow-xs"
                    : "text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.03] dark:text-gray-400 dark:hover:text-[#f5f5f7] dark:hover:bg-white/[0.05]"
                }`}
              >
                {l.label}
                {l.href === "/dicari" && wantedCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                    {wantedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <QuickSearchSheet isOpen={cariTerbuka} onClose={() => setCariTerbuka(false)} />

      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={(wa) => {
          setShowOtp(false);
          segarkan();
          router.refresh();
        }}
      />
    </header>
  );
}
