"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/dicari", label: "Dicari" },
  { href: "/jual", label: "Jual" },
  { href: "/favorit", label: "Favorit" },
  { href: "/cara-bergabung", label: "Cara Bergabung" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [session, setSession] = useState({ name: "", wa: "" });

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
              <span className="truncate max-w-[90px]" title={session.name || session.wa}>
                👤 {session.name || session.wa}
              </span>
              <button
                onClick={() => {
                  if (confirm("Log out dari nomor seller ini?")) {
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
          {session.wa && (
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-900 pb-2.5 mb-2 text-xs font-semibold text-gray-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                👤 Seller: {session.name || session.wa}
              </span>
              <button
                onClick={() => {
                  if (confirm("Log out dari nomor seller ini?")) {
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
    </header>
  );
}
