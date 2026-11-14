"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (error && !isChunkError) {
      import("@/lib/logger").then(({ logger }) => {
        logger.error("Global error boundary caught.", error);
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

  return (
    <html lang="id" className="overflow-x-clip">
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-clip">
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          {isChunkError ? (
            <p className="text-sm text-slate-400">Memuat versi terbaru…</p>
          ) : (
            <div className="max-w-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">Terjadi kesalahan</h2>
              <p className="text-xs text-slate-500">
                Aplikasi mengalami kendala saat memuat. Silakan muat ulang halaman.
              </p>
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                Coba lagi
              </button>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
