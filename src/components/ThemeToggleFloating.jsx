"use client";

import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { bacaTema, terapkanTema } from "@/lib/tampilan";
import { cn } from "@/lib/utils";

export default function ThemeToggleFloating() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));

    const handleThemeChange = (e) => {
      setDark(e.detail?.dark ?? document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("theme:change", handleThemeChange);
    return () => window.removeEventListener("theme:change", handleThemeChange);
  }, []);

  const handleToggle = () => {
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

  if (!mounted) return null;

  return (
    <aside
      aria-label="Pengaturan Tema Tampilan"
      className="hidden md:flex fixed bottom-6 right-6 z-40"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
        title={dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full",
          "border border-slate-200/90 dark:border-white/15",
          "bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl",
          "text-slate-800 dark:text-white",
          "shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
          "hover:scale-105 active:scale-95 transition-all duration-200 group no-tap-highlight cursor-pointer"
        )}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-12",
            dark ? "bg-violet-500/20 text-amber-300" : "bg-amber-500/15 text-amber-600"
          )}
        >
          {dark ? (
            <Icon.Sun className="w-3.5 h-3.5" />
          ) : (
            <Icon.Moon className="w-3.5 h-3.5" />
          )}
        </div>
        <span className="text-[11.5px] font-bold tracking-tight pr-1 select-none">
          {dark ? "Gelap" : "Terang"}
        </span>
      </button>
    </aside>
  );
}
