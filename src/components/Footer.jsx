"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Icon } from "@/components/Icons";
import { terapkanTema } from "@/lib/tampilan";

export default function Footer({ config }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const handleThemeChange = (e) => {
      setDark(e.detail?.dark ?? document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("theme:change", handleThemeChange);
    return () => window.removeEventListener("theme:change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

  return (
    <footer className="mt-8 w-full border-t border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <Icon.GraduationCap className="h-5 w-5 text-emerald-200" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                Kampus Kita
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Jual-beli, Open PO, dan komunitas mahasiswa.
              </p>
            </div>
          </div>

          <nav aria-label="Bantuan dan informasi" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link href="/panduan-aman" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-600">
              Panduan aman COD
            </Link>
            <Link href="/faq" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-600">
              Bantuan
            </Link>
            <Link href="/syarat-ketentuan" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-600">
              Ketentuan
            </Link>
            <Link href="/kebijakan-privasi" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-600">
              Privasi
            </Link>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row">
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center sm:text-left">
            © 2026 Kampus Kita. Hak cipta dilindungi.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {dark ? (
                <>
                  <Icon.Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Icon.Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
