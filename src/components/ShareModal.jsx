"use client";

import { useRef, useState } from "react";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";

const PLATFORMS = [
  { id: "ig-feed",  label: "IG Feed",  IconComponent: Icon.Camera, action: "download", format: "feed",  desc: "1:1 — Download" },
  { id: "ig-story", label: "IG Story", IconComponent: Icon.Smartphone, action: "download", format: "story", desc: "9:16 — Download" },
  { id: "tiktok",   label: "TikTok",   IconComponent: Icon.Music, action: "download", format: "story", desc: "9:16 — Download" },
  { id: "wa",       label: "WhatsApp", IconComponent: Icon.MessageCircle, action: "share", format: null, desc: "Kirim teks + link" },
  { id: "fb",       label: "Facebook", IconComponent: Icon.Share, action: "share", format: null, desc: "Bagikan link" },
];

export default function ShareModal({ listing, isIconOnly = false }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("story");
  const [busy, setBusy] = useState(null);

  const feedRef  = useRef(null);
  const storyRef = useRef(null);

  function getUrl() {
    const base = typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id");
    return `${base}/produk/${buildSlug(listing.title, listing.id)}`;
  }

  async function downloadTemplate(format, platformId) {
    setBusy(platformId);
    try {
      const { toPng } = await import("html-to-image");
      const el = format === "feed" ? feedRef.current : storyRef.current;
      const dataUrl = await toPng(el, { 
        cacheBust: true,
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      const link = document.createElement("a");
      link.download = `${platformId}-${listing.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert("Gagal membuat gambar: " + e.message);
    } finally {
      setBusy(null);
    }
  }

  function handlePlatform(p) {
    if (p.action === "download") {
      downloadTemplate(p.format, p.id);
    } else if (p.id === "wa") {
      const cond = listing.condition === "new" ? " · Baru" : listing.condition === "used" ? " · Bekas" : "";
      const text = `*${listing.title}*\nHarga: ${rupiah(listing.price)}${cond}\n${listing.category ? `Kategori: ${listing.category}\n` : ""}\n${getUrl()}\n_Jual Beli USU Polmed — COD area kampus_`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } else if (p.id === "fb") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`, "_blank", "noopener");
    }
  }

  const isRental = listing.type === "sewa";
  const priceLabel = isRental && listing.rental_period
    ? `${rupiah(listing.price)} / ${listing.rental_period}`
    : rupiah(listing.price);

  return (
    <>
      {isIconOnly ? (
        <button 
          onClick={() => setOpen(true)} 
          className="flex h-11 w-full items-center justify-center rounded-full bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08] active:scale-95 transition-all dark:bg-white/[0.08] dark:text-white"
          aria-label="Bagikan"
        >
          <Icon.Share className="h-5 w-5" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-outline w-full">
          <span className="inline-flex items-center justify-center gap-2"><Icon.Sparkles className="h-4 w-4" />Buat Template Share</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={() => setOpen(false)}
        >
          {/* Overlay frosted glass */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />
          
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white/95 backdrop-blur-xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.2)] dark:bg-[#1c1c1e]/95 border border-black/[0.05] dark:border-white/[0.08] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="font-bold tracking-tight text-[17px] text-[#1d1d1f] dark:text-white">Buat Template</h3>
              <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05] text-[#1d1d1f] hover:bg-black/[0.09] active:scale-90 transition-all dark:bg-white/[0.08] dark:text-white">
                <Icon.X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Segmented Control iOS Style */}
              <div className="flex gap-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] p-1">
                {["feed", "story"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition-all ${
                      tab === t 
                        ? "bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-sm" 
                        : "text-[#6e6e73] dark:text-slate-400 hover:text-[#1d1d1f] dark:hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">{t === "feed" ? <Icon.Camera className="h-3.5 w-3.5" /> : <Icon.Smartphone className="h-3.5 w-3.5" />}{t === "feed" ? "Feed (1:1)" : "Story (9:16)"}</span>
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                {/* Feed 1:1 */}
                <div
                  ref={feedRef}
                  style={{ width: 270, height: 270 }}
                  className={`relative overflow-hidden rounded-2xl flex-shrink-0 ${tab !== "feed" ? "hidden" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  {listing.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.image_url}
                      alt=""
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-cover opacity-40"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
                  {/* Top brand */}
                  <div className="absolute inset-x-0 top-0 px-4 pt-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#111] flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">JB</span>
                    </div>
                    <span className="text-white text-xs font-bold tracking-wide drop-shadow">JUAL BELI USU</span>
                  </div>
                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="line-clamp-2 text-sm font-bold text-white drop-shadow">{listing.title}</p>
                    <p className="mt-1 text-xl font-extrabold text-white drop-shadow">{priceLabel}</p>
                    <p className="mt-2 text-[10px] text-white/70">jualbeliusupolmed.web.id</p>
                  </div>
                </div>

                {/* Story 9:16 */}
                <div
                  ref={storyRef}
                  style={{ width: 180, height: 320 }}
                  className={`relative overflow-hidden rounded-2xl flex-shrink-0 ${tab !== "story" ? "hidden" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#111] via-black to-slate-900" />
                  {listing.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.image_url}
                      alt=""
                      crossOrigin="anonymous"
                      className="absolute left-1/2 top-[60px] -translate-x-1/2 w-32 h-32 object-cover rounded-xl"
                    />
                  )}
                  {/* Top brand */}
                  <div className="absolute inset-x-0 top-0 px-4 pt-4 text-center">
                    <span className="text-white text-xs font-extrabold tracking-widest uppercase drop-shadow">JUAL BELI USU</span>
                  </div>
                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <p className="line-clamp-2 text-sm font-bold text-white drop-shadow">{listing.title}</p>
                    <p className="mt-1 text-lg font-extrabold text-white drop-shadow">{priceLabel}</p>
                    <div className="mt-3 mx-auto inline-block rounded-full bg-white px-4 py-1.5">
                      <span className="text-[10px] font-bold text-[#111]">jualbeliusupolmed.web.id</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform buttons */}
              <div className="grid grid-cols-5 gap-2">
                {PLATFORMS.map((p) => {
                  const isActive = (p.format === "feed" && tab === "feed") || (p.format === "story" && tab === "story") || !p.format;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePlatform(p)}
                      disabled={busy === p.id}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all text-center ${isActive ? "bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700" : "opacity-50 bg-gray-50 dark:bg-slate-800"}`}
                    >
                      <p.IconComponent className={`h-6 w-6 ${busy === p.id ? "animate-pulse" : ""}`} />
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-slate-300">{p.label}</span>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 leading-tight">{p.desc}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">
                IG & TikTok: download gambar lalu upload manual. WA & FB: langsung share.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
