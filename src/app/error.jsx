"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  const reference = error?.digest || "ERR-" + String(error?.name || "APP").slice(0, 12).toUpperCase();
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (error) {
      import("@/lib/logger").then(({ logger }) => {
        logger.error("App error boundary caught:", error);
      });
    }
    if (!isChunkError) return;
    const key = "chunk_reload_at";
    const last = parseInt(sessionStorage.getItem(key) || "0", 10);
    if (Date.now() - last > 15000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, [error, isChunkError]);

  if (isChunkError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-gray-400">Memuat versi terbaru…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Terjadi kesalahan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Silakan coba lagi. Jika masalah berlanjut, sampaikan kode {reference}.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}
