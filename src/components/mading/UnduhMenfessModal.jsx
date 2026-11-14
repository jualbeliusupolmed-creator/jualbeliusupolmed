"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function UnduhMenfessModal({ post, onClose }) {
  const [ratio, setRatio] = useState("portrait"); // 'portrait' (1080x1350) | 'story' (1080x1920)
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!post) return;
    const previouslyFocused = document.activeElement;
    function handleKeyDown(e) {
      if (e.key === "Escape" && !downloading) {
        onClose?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [post, downloading, onClose]);

  if (!post || !mounted) return null;

  const imageUrl = `/api/mading/${post.id}/instagram-image?ratio=${ratio}`;
  const downloadUrl = `/api/mading/${post.id}/instagram-image?ratio=${ratio}&download=1`;

  async function handleDownload() {
    setDownloading(true);
    try {
      // Unduh langsung sebagai blob biner untuk kompatibilitas lintas peramban
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Gagal mengunduh gambar");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menfess-usu-${post.id}-${ratio === "story" ? "9-16" : "1080x1350"}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Gambar Menfess (${ratio === "story" ? "Potrait 9:16 (Story/Status)" : "Potrait 4:5 (1080×1350)"}) berhasil diunduh! `);
    } catch (err) {
      toast.error(err.message || "Gagal mengunduh gambar");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    try {
      const fullUrl = `${window.location.origin}${imageUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Tautan gambar disalin ke papan klip!");
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/70" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Icon.Download className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Unduh Gambar Menfess
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih format Potrait untuk Feed atau Story / Status WA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal unduh"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Icon.X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* RATIO SELECTOR TABS */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setRatio("portrait")}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ${
              ratio === "portrait"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <span>Potrait 1080 × 1350</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Feed / Postingan (4:5)</span>
          </button>

          <button
            type="button"
            onClick={() => setRatio("story")}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 ${
              ratio === "story"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <span>Potrait 9 : 16</span>
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Story IG &amp; Status WA</span>
          </button>
        </div>

        {/* LIVE PREVIEW CONTAINER */}
        <div className="relative overflow-hidden rounded-xl bg-slate-100 p-2 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[280px]">
          <div
            className={`relative transition-opacity duration-200 shadow-md rounded-lg overflow-hidden ${
              ratio === "story"
                ? "aspect-[9/16] w-full max-w-[210px]"
                : "aspect-[4/5] w-full max-w-[260px]"
            }`}
          >
            <Image
              src={imageUrl}
              alt="Pratinjau Gambar Menfess"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          {ratio === "story"
            ? "Format 9:16 Fullscreen Potrait — Pas untuk Story IG, Status WA & TikTok"
            : "Format 4:5 Potrait Feed — Pas untuk postingan Feed Instagram tanpa terpotong"}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Icon.Download className="h-4 w-4" aria-hidden="true" />
            <span>{downloading ? "Menyiapkan File…" : "Unduh Gambar (HD)"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
          >
            <Icon.Link className="h-4 w-4" aria-hidden="true" />
            <span>Salin Tautan Gambar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
