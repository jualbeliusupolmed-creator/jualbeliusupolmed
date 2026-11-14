"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      className="fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-colors hover:bg-slate-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
