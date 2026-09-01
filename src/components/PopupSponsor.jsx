"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const KUNCI_STORAGE = "popup_sponsor_last_seen";
const DURASI_24_JAM = 24 * 60 * 60 * 1000;

export default function PopupSponsor({ config }) {
  const [isOpen, setIsOpen] = useState(false);
  const popupAd = config?.popupAd;

  useEffect(() => {
    if (!popupAd?.enabled || !popupAd?.imageUrl) return;

    try {
      const lastSeen = Number(localStorage.getItem(KUNCI_STORAGE) || 0);
      const now = Date.now();

      if (!lastSeen || now - lastSeen > DURASI_24_JAM) {
        // Tampilkan dengan delay halus 1.2 detik setelah halaman dimuat
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (_) {
      // Ignore localStorage restrictions
    }
  }, [popupAd]);

  const tutup = () => {
    try {
      localStorage.setItem(KUNCI_STORAGE, String(Date.now()));
    } catch (_) {}
    setIsOpen(false);
  };

  const handleAction = () => {
    try {
      localStorage.setItem(KUNCI_STORAGE, String(Date.now()));
    } catch (_) {}
    setIsOpen(false);
    if (popupAd?.targetUrl) {
      window.open(popupAd.targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen || !popupAd?.enabled || !popupAd?.imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-black/[0.06] dark:border-white/[0.1] dark:bg-slate-900 animate-in zoom-in-95 duration-200">
        {/* Tombol Tutup Floating */}
        <button
          onClick={tutup}
          aria-label="Tutup promo"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95 shadow-sm"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>
        </button>

        {/* Gambar Banner Sponsor */}
        <div
          onClick={handleAction}
          className="relative w-full cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={popupAd.imageUrl}
            alt={popupAd.title || "Promo & Event Spesial"}
            className="w-full max-h-[380px] object-cover transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm backdrop-blur-xs">
              Sponsor / Event
            </span>
          </div>
        </div>

        {/* Konten & Tombol CTA */}
        <div className="p-4 sm:p-5 text-center">
          {popupAd.title && (
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-snug">
              {popupAd.title}
            </h3>
          )}

          <div className="mt-4 space-y-2">
            {popupAd.targetUrl && (
              <button
                onClick={handleAction}
                className="btn-primary w-full py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                <span>{popupAd.buttonText || "Lihat Selengkapnya"}</span>
                <Icon.ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={tutup}
              className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors pt-1 block w-full text-center"
            >
              Lewati promo hari ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
