"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (!isChunkError) return;
    const key = "chunk_reload_at";
    const last = parseInt(sessionStorage.getItem(key) || "0", 10);
    if (Date.now() - last > 15000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, [isChunkError]);

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
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Terjadi kesalahan</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {error?.message || "Silakan coba lagi."}
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-gray-900 px-5 py-2 text-xs font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}
