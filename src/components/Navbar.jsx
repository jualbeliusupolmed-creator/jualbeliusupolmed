"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";
import OTPModal from "@/components/OTPModal";
import NotificationCenter from "@/components/NotificationCenter";
import { toast } from "sonner";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/jual-beli", label: "Marketplace" },
  { href: "/jasa", label: "Jasa" },
  { href: "/dicari", label: "Dicari" },
  { href: "/mading", label: "Menfess" },
  { href: "/teman", label: "Cari Teman 🔥" },
  { href: "/chat", label: "Obrolan" },
];

export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [session, setSession] = useState({ name: "", wa: "" });
  const [navQ, setNavQ] = useState("");
  const [wantedCount, setWantedCount] = useState(0);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = navQ.trim();
    router.push(term ? `/?q=${encodeURIComponent(term)}` : "/");
  };

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.error("SW registration failed:", err));
      });
      // Saat SW baru aktif (skipWaiting + clientsClaim), reload supaya
      // chunk yang lama tidak crash lagi
      let swRefreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!swRefreshing) {
          swRefreshing = true;
          window.location.reload();
        }
      });
    }

    // Fetch wanted count for badge
    fetch("/api/wanted?limit=1")
      .then((r) => r.json())
      .then((d) => setWantedCount(d.total || d.listings?.length || 0))
      .catch(() => {});
  }, []);

  // Cookie server adalah satu-satunya sumber kebenaran sesi;
  // profile name diambil dari server/localStorage.
  const syncSession = () => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.loggedIn) {
          const storedName = localStorage.getItem("seller_name") || "";
          setSession({ name: d.name || storedName || d.wa, wa: d.wa });
        } else {
          localStorage.removeItem("seller_wa");
          setSession({ name: "", wa: "" });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    syncSession();
  }, [pathname]);

  const doLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("seller_wa");
    localStorage.removeItem("seller_name");
    setSession({ name: "", wa: "" });
    toast.success("Berhasil keluar.");
    router.refresh();
  };

  const toggleTheme = () => {
    const isDark = !dark;
    setDark(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <header className="sticky top-0 z-40">
      {/* ── Top bar: Apple Frosted Glass ── */}
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl transition-all duration-300 dark:border-white/[0.08] dark:bg-[#000000]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group min-w-0 shrink active:scale-[0.98] transition-transform">
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Logo className="h-7 w-7" src={config?.site?.logoUrl} />
            </div>
            <span className="truncate text-[15px] font-bold leading-none tracking-tight text-[#1d1d1f] transition-colors dark:text-[#f5f5f7]">
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1c1c1e] px-3 py-1.5 text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-primary dark:hover:text-emerald-400 transition-all active:scale-[0.96] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  title="Buka Dashboard Akun"
                  aria-label="Buka dashboard"
                >
                  <Icon.User className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="max-w-[85px] truncate">{session.name || session.wa}</span>
                  <span className="hidden lg:inline text-[10px] text-gray-400 font-medium">· Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    toast("Keluar dari akun ini?", {
                      action: { label: "Keluar", onClick: doLogout },
                      cancel: { label: "Batal" },
                    });
                  }}
                  className="px-2 py-1 text-gray-400 hover:text-rose-500 rounded-full transition-colors text-xs font-bold active:scale-90"
                  title="Keluar dari akun"
                  aria-label="Keluar dari akun"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOtp(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.03] px-3.5 py-1.5 text-xs font-bold text-[#1d1d1f] transition-all duration-200 hover:bg-black/[0.06] active:scale-[0.95] dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-[#f5f5f7] dark:hover:bg-white/[0.1]"
                title="Masuk / Daftar Akun"
              >
                <Icon.User className="h-3.5 w-3.5" />
                <span>Masuk</span>
              </button>
            )}

            <Link
              href="/chat"
              aria-label="Buka pesan"
              title="Pesan"
              className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1d1d1f] active:scale-90 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <Icon.MessageCircle className="h-4 w-4" />
            </Link>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1d1d1f] active:scale-90 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
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

      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={(wa) => {
          setShowOtp(false);
          syncSession();
          router.refresh();
        }}
      />
    </header>
  );
}
