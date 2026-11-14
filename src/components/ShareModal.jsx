"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "ig-feed", label: "IG Feed", IconComponent: Icon.Camera, action: "download", format: "feed", desc: "1:1 — Download" },
  { id: "ig-story", label: "IG Story", IconComponent: Icon.Smartphone, action: "download", format: "story", desc: "9:16 — Download" },
  { id: "tiktok", label: "TikTok", IconComponent: Icon.Music, action: "download", format: "story", desc: "9:16 — Download" },
  { id: "wa", label: "WhatsApp", IconComponent: Icon.MessageCircle, action: "share", format: null, desc: "Kirim teks + link" },
  { id: "fb", label: "Facebook", IconComponent: Icon.Share, action: "share", format: null, desc: "Bagikan link" },
];

export default function ShareModal({ listing, isIconOnly = false }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("story");
  const [busy, setBusy] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [shareError, setShareError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyLink = async () => {
    try {
      const url = getUrl();
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      toast.success("Tautan produk berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const feedRef = useRef(null);
  const storyRef = useRef(null);

  function getUrl() {
    const base = typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id");
    return `${base}/produk/${buildSlug(listing.title, listing.id)}`;
  }

  async function downloadTemplate(format, platformId) {
    setBusy(platformId);
    setShareError("");
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
      setShareError("Gagal membuat gambar: " + (e.message || "kesalahan internal"));
    } finally {
      setBusy(null);
    }
  }

  function handlePlatform(p) {
    if (p.action === "download") {
      downloadTemplate(p.format, p.id);
    } else if (p.id === "wa") {
      const cond = listing.condition === "new" ? " · Baru" : listing.condition === "used" ? " · Bekas" : "";
      const text = `*${listing.title}*\nHarga: ${rupiah(listing.price)}${cond}\n${listing.category ? `Kategori: ${listing.category}\n` : ""}\n${getUrl()}\n_Kampus Kita — marketplace mahasiswa lintas kampus_`;
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
          className="flex h-11 w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 hover:bg-slate-200 dark:text-slate-100 dark:hover:bg-slate-700 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
          aria-label="Bagikan produk ini"
        >
          <Icon.Share className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-outline w-full active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600">
          <span className="inline-flex items-center justify-center gap-2"><Icon.Share className="h-4 w-4" aria-hidden="true" />Buat Template Share</span>
        </button>
      )}

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay frosted glass */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />

          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 animate-slide-up motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="font-bold tracking-tight text-[17px] text-slate-900 dark:text-white">Buat Template</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup modal"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon.X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {shareError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                  {shareError}
                </div>
              )}

              {/* Segmented Control */}
              <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {["feed", "story"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-lg py-2 text-[13px] font-semibold active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${tab === t
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">{t === "feed" ? <Icon.Camera className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon.Smartphone className="h-3.5 w-3.5" aria-hidden="true" />}{t === "feed" ? "Feed (1:1)" : "Story (9:16)"}</span>
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
                    <div className="w-6 h-6 rounded-full bg-slate-950 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">JB</span>
                    </div>
                    <span className="text-white text-xs font-bold drop-shadow">Kampus Kita</span>
                  </div>
                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="line-clamp-2 text-sm font-bold text-white drop-shadow">{listing.title}</p>
                    <p className="mt-1 text-xl font-extrabold text-white drop-shadow">{priceLabel}</p>
                    <p className="mt-2 text-[10px] text-white/70">kampuskita.my.id</p>
                  </div>
                </div>

                {/* Story 9:16 */}
                <div
                  ref={storyRef}
                  style={{ width: 180, height: 320 }}
                  className={`relative overflow-hidden rounded-2xl flex-shrink-0 ${tab !== "story" ? "hidden" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900" />
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
                    <span className="text-white text-xs font-extrabold drop-shadow">Kampus Kita</span>
                  </div>
                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <p className="line-clamp-2 text-sm font-bold text-white drop-shadow">{listing.title}</p>
                    <p className="mt-1 text-lg font-extrabold text-white drop-shadow">{priceLabel}</p>
                    <div className="mt-3 mx-auto inline-block rounded-full bg-white px-4 py-1.5">
                      <span className="text-[10px] font-bold text-slate-950">kampuskita.my.id</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salin Tautan Cepat (Pola make-interfaces-feel-better: High feedback, tactile active state) */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 dark:border-white/10 dark:bg-slate-800/80">
                <input
                  type="text"
                  readOnly
                  value={getUrl()}
                  aria-label="Tautan produk"
                  className="flex-1 truncate bg-transparent px-2 text-xs text-slate-700 outline-none dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors active:scale-[0.96] motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-800 hover:bg-emerald-900 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Icon.Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Icon.Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Platform buttons */}
              <div className="grid grid-cols-5 gap-2">
                {PLATFORMS.map((p) => {
                  const isActive = (p.format === "feed" && tab === "feed") || (p.format === "story" && tab === "story") || !p.format;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePlatform(p)}
                      disabled={busy === p.id}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 active:scale-[0.95] active:translate-y-px transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-emerald-600 motion-reduce:transform-none ${isActive ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" : "opacity-50 bg-slate-100 dark:bg-slate-800"}`}
                    >
                      <p.IconComponent className={`h-6 w-6 ${busy === p.id ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{p.label}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">{p.desc}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">
                IG & TikTok: download gambar lalu upload manual. WA & FB: langsung share.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
