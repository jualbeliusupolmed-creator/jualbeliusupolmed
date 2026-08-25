"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function UnduhMenfessModal({ post, onClose }) {
  const [ratio, setRatio] = useState("portrait"); // 'portrait' (1080x1350) | 'landscape' (1200x675)
  const [downloading, setDownloading] = useState(false);

  if (!post) return null;

  const imageUrl = `/api/mading/${post.id}/instagram-image?ratio=${ratio}`;
  const downloadUrl = `/api/mading/${post.id}/instagram-image?ratio=${ratio}&download=1`;

  async function handleDownload() {
    setDownloading(true);
    try {
      // Fetch as blob to ensure seamless mobile & desktop download
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error("Gagal mengunduh gambar");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menfess-usu-${post.id}-${ratio}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Gambar Menfess (${ratio === "portrait" ? "Potrait 1080×1350" : "Landscape 1200×675"}) berhasil diunduh! 📸`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-black/[0.06] dark:border-white/[0.08] z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon.Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Unduh Gambar Menfess
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Pilih rasio tampilan kartu untuk posting di media sosial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* RATIO SELECTOR TABS */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setRatio("portrait")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              ratio === "portrait"
                ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <span>📱 Potrait (1080 × 1350)</span>
          </button>

          <button
            type="button"
            onClick={() => setRatio("landscape")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              ratio === "landscape"
                ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <span>🖼️ Landscape (1200 × 675)</span>
          </button>
        </div>

        {/* LIVE PREVIEW CONTAINER */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-950/5 p-2 dark:bg-black/30 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[260px]">
          <div
            className={`relative transition-all duration-300 shadow-lg rounded-xl overflow-hidden ${
              ratio === "portrait"
                ? "aspect-[4/5] w-full max-w-[260px]"
                : "aspect-[16/9] w-full max-w-[420px]"
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

        <div className="text-center text-[11px] text-gray-400">
          {ratio === "portrait"
            ? "Format 4:5 Instagram Feed & Story HD • Pas untuk feed tanpa terpotong"
            : "Format 16:9 Landscape • Pas untuk Twitter/X, Status WhatsApp & Banner"}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Icon.Download className="h-4 w-4" />
            <span>{downloading ? "Menyiapkan File..." : "Unduh Gambar (HD)"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-outline py-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Icon.Link className="h-4 w-4" />
            <span>Salin Tautan Gambar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
