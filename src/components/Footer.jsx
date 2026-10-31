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
    <footer className="mt-8 w-full border-t border-[#E2E8F0] bg-white transition-colors dark:border-white/[0.08] dark:bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#047857] text-white shadow-sm">
              <Icon.GraduationCap className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <p className="font-bold leading-tight tracking-tight text-[#0F172A] dark:text-white">
                Kampus Kita
              </p>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                Jual-beli, Open PO, dan komunitas mahasiswa.
              </p>
            </div>
          </div>

          <nav aria-label="Bantuan dan informasi" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link href="/panduan-aman" className="font-semibold text-[#047857] hover:underline dark:text-emerald-400">
              Panduan aman COD
            </Link>
            <Link href="/faq" className="text-[#64748B] transition-colors hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white">
              Bantuan
            </Link>
            <Link href="/syarat-ketentuan" className="text-[#64748B] transition-colors hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white">
              Ketentuan
            </Link>
            <Link href="/kebijakan-privasi" className="text-[#64748B] transition-colors hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white">
              Privasi
            </Link>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4 dark:border-white/[0.08] sm:flex-row">
          <p className="text-xs text-[#64748B] dark:text-slate-500 text-center sm:text-left">
            © 2026 Kampus Kita. Hak cipta dilindungi.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-white/[0.12] bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
            >
              {dark ? (
                <>
                  <Icon.Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Icon.Moon className="h-3.5 w-3.5 text-slate-600" />
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
