"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
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

  return (
    <html lang="id">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          {isChunkError ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Memuat versi terbaru…</p>
          ) : (
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Terjadi kesalahan</h2>
              <button
                onClick={reset}
                style={{ background: "#111", color: "#fff", border: "none", borderRadius: "9999px", padding: "0.5rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
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
