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
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      className="fixed bottom-6 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/80 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-gray-900 hover:scale-110 active:scale-95 dark:bg-white/15 dark:hover:bg-white/25"
      style={{ animation: "fadeInUp 0.2s ease" }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
