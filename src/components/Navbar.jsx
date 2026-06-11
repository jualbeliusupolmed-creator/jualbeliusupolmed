"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";
import OTPModal from "@/components/OTPModal";
import { toast } from "sonner";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/jual", label: "Jual" },
  { href: "/dicari", label: "Dicari" },
  { href: "/favorit", label: "Favorit" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/blog", label: "Blog" },
  { href: "/cara-bergabung", label: "Info" },
];

export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [session, setSession] = useState({ name: "", wa: "" });
  const [navQ, setNavQ] = useState("");

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
    }
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
      <div className="border-b border-gray-100 bg-white/85 backdrop-blur-md dark:border-slate-900 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" src={config?.site?.logoUrl} />
            <span className="text-[14px] font-extrabold tracking-tight text-gray-900 dark:text-white">
              jualbeli<span className="text-gray-400 font-medium">.usupolmed</span>
            </span>
          </Link>

          {/* Right side: search (desktop) + session + theme */}
          <div className="flex items-center gap-1.5">
            {/* Search mini — desktop only */}
            <form onSubmit={submitSearch} className="relative hidden lg:block mr-1">
              <Icon.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={navQ}
                onChange={(e) => setNavQ(e.target.value)}
                placeholder="Cari barang…"
                aria-label="Cari barang"
                className="w-36 rounded-full border border-gray-200 bg-gray-50/60 py-1.5 pl-8 pr-3 text-xs text-gray-700 outline-none transition-all focus:w-48 focus:border-gray-300 focus:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 dark:focus:border-slate-700 dark:focus:bg-slate-900"
              />
            </form>

            {/* Session indicator */}
            {session.wa ? (
              <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50/60 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                <Icon.User className="h-3 w-3 shrink-0" />
                <span className="max-w-[72px] truncate">{session.name || session.wa}</span>
                <button
                  onClick={() => {
                    toast("Keluar dari akun ini?", {
                      action: { label: "Keluar", onClick: doLogout },
                      cancel: { label: "Batal" },
                    });
                  }}
                  className="ml-0.5 text-gray-400 hover:text-rose-500 transition-colors font-bold"
                  title="Keluar"
                  aria-label="Keluar dari akun"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOtp(true)}
                className="rounded-full border border-gray-200 bg-gray-50/60 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Masuk
              </button>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-900"
              aria-label="Toggle Theme"
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Pasang Iklan CTA — desktop only */}
            <Link href="/jual" className="hidden md:inline-flex rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
              + Pasang Iklan
            </Link>
          </div>
        </div>
      </div>

      {/* ── Nav links bar — horizontal scroll, no hamburger ── */}
      <div className="hidden md:block overflow-x-auto border-b border-gray-100 bg-white/70 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-slate-900 dark:bg-slate-950/70">
        <nav className="mx-auto flex max-w-6xl items-center gap-0 px-4">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "text-gray-900 border-b-2 border-gray-900 dark:text-white dark:border-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {l.label}
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
