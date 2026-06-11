"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";
import OTPModal from "@/components/OTPModal";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/dicari", label: "Dicari" },
  { href: "/jual", label: "Jual" },
  { href: "/favorit", label: "Favorit" },
  { href: "/cara-bergabung", label: "Cara Bergabung" },
  { href: "/blog", label: "Blog" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [session, setSession] = useState({ name: "", wa: "" });
  const [navQ, setNavQ] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    const term = navQ.trim();
    setOpen(false);
    router.push(term ? `/?q=${encodeURIComponent(term)}` : "/");
  };

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    // Register service worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.error("SW registration failed:", err));
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const wa = localStorage.getItem("seller_wa") || "";
      const name = localStorage.getItem("seller_name") || "";
      setSession({ name, wa });
    }
  }, [pathname]);

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
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-slate-900 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">
            jualbeli<span className="text-gray-400">.usupolmed</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {/* Search mini — cari produk dari halaman mana pun */}
          <form onSubmit={submitSearch} className="relative hidden lg:block mr-1">
            <Icon.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={navQ}
              onChange={(e) => setNavQ(e.target.value)}
              placeholder="Cari barang…"
              aria-label="Cari barang"
              className="w-36 rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-8 pr-2 text-xs text-gray-700 outline-none transition-all focus:w-48 focus:border-gray-300 focus:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 dark:focus:border-slate-700 dark:focus:bg-slate-900"
            />
          </form>

          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "font-semibold text-gray-900 dark:text-white"
                    : "font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          
          <button
            onClick={toggleTheme}
            className="ml-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Toggle Theme"
          >
            {dark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {session.wa && (
            <div className="flex items-center gap-1.5 ml-2 border border-gray-200 dark:border-slate-800 rounded-lg py-1 px-2.5 text-xs font-semibold text-gray-700 bg-gray-50/50 dark:text-slate-350 dark:bg-slate-900/40">
              <span className="truncate max-w-[90px] flex items-center gap-1" title={session.name || session.wa}>
                <Icon.User className="h-3 w-3" /> {session.name || session.wa}
              </span>
              <button
                onClick={async () => {
                  if (confirm("Log out dari nomor seller ini?")) {
                    await fetch("/api/auth/logout", { method: "POST" });
                    localStorage.removeItem("seller_wa");
                    localStorage.removeItem("seller_name");
                    setSession({ name: "", wa: "" });
                    window.location.reload();
                  }
                }}
                className="text-gray-400 hover:text-rose-500 font-bold ml-1 transition-colors"
                title="Keluar / Ganti Akun"
              >
                ✕
              </button>
            </div>
          )}

          {!session.wa && (
            <button
              onClick={() => setShowOtp(true)}
              className="ml-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Masuk
            </button>
          )}

          <Link href="/jual" className="btn-primary ml-2 px-4 py-2">
            Pasang Iklan
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Toggle Theme"
          >
            {dark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <button
            aria-label="menu"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-gray-100 bg-white px-4 py-2 dark:border-slate-900 dark:bg-slate-950 md:hidden">
          <form onSubmit={submitSearch} className="relative mb-2 pb-2 border-b border-gray-100 dark:border-slate-900">
            <Icon.Search className="pointer-events-none absolute left-3 top-[calc(50%-4px)] h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={navQ}
              onChange={(e) => setNavQ(e.target.value)}
              placeholder="Cari barang… laptop, buku, kos"
              aria-label="Cari barang"
              className="input pl-10 text-sm"
            />
          </form>
          {session.wa && (
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-900 pb-2.5 mb-2 text-xs font-semibold text-gray-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                <Icon.User className="h-3.5 w-3.5" /> Seller: {session.name || session.wa}
              </span>
              <button
                onClick={async () => {
                  if (confirm("Log out dari nomor seller ini?")) {
                    await fetch("/api/auth/logout", { method: "POST" });
                    localStorage.removeItem("seller_wa");
                    localStorage.removeItem("seller_name");
                    setSession({ name: "", wa: "" });
                    window.location.reload();
                  }
                }}
                className="text-rose-500 font-bold px-2 py-1 bg-rose-50 dark:bg-rose-950/20 rounded-md shrink-0"
              >
                Log Out
              </button>
            </div>
          )}
          {!session.wa && (
            <div className="border-b border-gray-100 dark:border-slate-900 pb-2 mb-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowOtp(true);
                }}
                className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
              >
                <Icon.User className="h-5 w-5 text-gray-400" /> Masuk / Daftar
              </button>
            </div>
          )}
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-slate-350 dark:hover:bg-slate-900"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/jual"
            onClick={() => setOpen(false)}
            className="btn-primary mt-2 w-full"
          >
            + Pasang Iklan
          </Link>
        </nav>
      )}

      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={(wa) => {
          setShowOtp(false);
          setSession((s) => ({ ...s, wa }));
          window.location.reload();
        }}
      />
    </header>
  );
}
