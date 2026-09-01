"use client";

import { useEffect, useCallback, useRef, useState } from "react";

/**
 * GlobalImageLightbox — dipasang sekali di LayoutWrapper.
 *
 * Cara kerja:
 * - Mendengarkan click pada semua <img data-zoom> di seluruh app
 * - Menampilkan foto full-screen dengan backdrop blur
 * - Swipe ke bawah / klik luar / ESC untuk tutup
 * - Pinch-to-zoom native bekerja otomatis (touch-action: pinch-zoom)
 *
 * Cara pakai di komponen mana saja — cukup tambah data-zoom:
 *   <img src={url} alt="Foto produk" data-zoom />
 *   // URL berbeda dari src (misal: versi HD):
 *   <img src={url_thumb} alt="Foto" data-zoom data-zoom-src={url_hd} />
 */
export default function GlobalImageLightbox() {
  const [foto, setFoto] = useState(null); // { src, alt }
  const [visible, setVisible] = useState(false);
  const startY = useRef(null);

  // Handler global click — tangkap klik pada img[data-zoom]
  const handleClick = useCallback((e) => {
    const el = e.target.closest("img[data-zoom]");
    if (!el) return;
    e.preventDefault();
    const src = el.dataset.zoomSrc || el.src;
    const alt = el.dataset.zoomAlt || el.alt || "";
    setFoto({ src, alt });
    setVisible(true);
    document.body.style.overflow = "hidden";
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") tutup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClick, handleKeyDown]);

  function tutup() {
    setVisible(false);
    document.body.style.overflow = "";
    setTimeout(() => setFoto(null), 250);
  }

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80) tutup();
    startY.current = null;
  }

  if (!foto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={foto.alt || "Foto"}
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target.tagName !== "IMG") tutup();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Tombol tutup */}
      <button
        onClick={tutup}
        aria-label="Tutup foto"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-90"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-5 w-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Foto — pinch-to-zoom native via touch-action: pinch-zoom */}
      <div
        className="relative flex max-h-full max-w-full items-center justify-center p-4"
        style={{ touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.src}
          alt={foto.alt}
          draggable={false}
          style={{
            maxHeight: "calc(100dvh - 2rem)",
            maxWidth: "calc(100dvw - 2rem)",
            objectFit: "contain",
            borderRadius: "12px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            transform: visible ? "scale(1)" : "scale(0.92)",
            transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            touchAction: "pinch-zoom",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: "zoom-out",
          }}
        />
      </div>

      {/* Caption */}
      {foto.alt && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-center text-sm text-white/80"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            maxWidth: "calc(100vw - 4rem)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {foto.alt}
        </div>
      )}

      {/* Mobile hint */}
      <SwipeHint visible={visible} />
    </div>
  );
}

function SwipeHint({ visible }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-white/40 transition-opacity duration-500 md:hidden"
      style={{ opacity: show ? 1 : 0 }}
    >
      Geser ke bawah untuk tutup
    </div>
  );
}
