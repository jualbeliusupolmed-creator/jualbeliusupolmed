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
  // localStorage hanya dipakai untuk nama tampilan.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.loggedIn) {
          setSession({ name: localStorage.getItem("seller_name") || "", wa: d.wa });
        } else {
          localStorage.removeItem("seller_wa");
          setSession({ name: "", wa: "" });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
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
      {/* ── Top bar ── */}
      <div className="border-b border-gray-100 bg-white/85 backdrop-blur-xl transition-all duration-300 dark:border-slate-900/80 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group min-w-0">
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Logo className="h-7 w-7" src={config?.site?.logoUrl} />
            </div>
            <span className="truncate text-[15px] font-extrabold leading-none tracking-tight text-primary transition-colors dark:text-emerald-400">
              USUPOLMEDUPDATE
            </span>
          </Link>

          {/* Right side: session + theme */}
          <div className="flex shrink-0 items-center gap-2.5">
            {/* Search mini — desktop only */}
            <form onSubmit={submitSearch} className="relative hidden md:block mr-2">
              <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-primary" />
              <input
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cari barang…"
                aria-label="Cari barang"
                className="peer w-40 rounded-full border border-gray-200 bg-gray-50/80 py-1.5 pl-9 pr-3 text-xs text-gray-700 outline-none transition-all duration-300 focus:w-56 focus:border-gray-300 focus:bg-white focus:shadow-soft dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:focus:border-slate-700 dark:focus:bg-slate-900"
              />
            </form>

            {/* Session indicator */}
            {session.wa ? (
              <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Icon.User className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="max-w-[80px] truncate">{session.name || session.wa}</span>
                <button
                  onClick={() => {
                    toast("Keluar dari akun ini?", {
                      action: { label: "Keluar", onClick: doLogout },
                      cancel: { label: "Batal" },
                    });
                  }}
                  className="ml-1 text-gray-400 hover:text-rose-500 transition-colors font-bold"
                  title="Keluar"
                  aria-label="Keluar dari akun"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOtp(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary transition-all duration-300 hover:bg-primary hover:text-white active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
              >
                <Icon.User className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Masuk</span>
              </button>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            {/* Ke dashboard harus selalu terlihat di mobile, bukan terselip di nav yang dapat digeser. */}
            <Link
              href="/dashboard"
              aria-label="Buka dashboard"
              title="Dashboard"
              className="inline-flex items-center gap-1.5 rounded-full p-2 text-gray-500 transition-all duration-300 hover:bg-gray-100 hover:text-primary active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <Icon.User className="h-4 w-4" />
              <span className="hidden lg:inline text-xs font-bold">Dashboard</span>
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-500 transition-all duration-300 hover:bg-gray-100 hover:text-gray-900 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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

            {/* Jual Barang CTA — desktop only */}
            <Link href="/jual" className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-polmed px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-polmed/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-polmed-dark hover:shadow-lg hover:shadow-polmed/30 active:scale-95">
              <span>+ Jual</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Nav links bar — horizontal scroll with gradient mask ── */}
      <div className="relative border-b border-gray-100 bg-white/90 backdrop-blur-md dark:border-slate-900/80 dark:bg-slate-950/90">
        {/* Soft edge masks for smooth scroll indication */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-10 dark:from-slate-950" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 dark:from-slate-950" />
        
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative shrink-0 whitespace-nowrap px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
                  active
                    ? "text-primary dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {l.label}
                {l.href === "/dicari" && wantedCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none animate-pulse">
                    {wantedCount}
                  </span>
                )}
                {/* Active indicator line */}
                {active && (
                  <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-primary dark:bg-emerald-400 animate-fade-in" />
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
          setSession((s) => ({ ...s, wa }));
          router.refresh();
        }}
      />
    </header>
  );
}
