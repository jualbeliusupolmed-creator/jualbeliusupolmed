"use client";

import { useEffect, useRef } from "react";

/**
 * ConfirmModal — pengganti window.confirm()
 *
 * Props:
 *   open      : boolean
 *   title     : string
 *   message   : string | ReactNode
 *   confirmLabel : string (default "Ya, Lanjutkan")
 *   cancelLabel  : string (default "Batal")
 *   danger    : boolean — warna tombol konfirmasi merah
 *   onConfirm : () => void
 *   onClose   : () => void
 */
export default function ConfirmModal({
  open,
  title = "Konfirmasi",
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  danger = false,
  onConfirm,
  onClose,
}) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (open) btnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay — frosted glass Apple style */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.2)] border border-black/[0.05] animate-slide-up dark:bg-[#1c1c1e]/95 dark:border-white/[0.08]">
        <h2 id="confirm-modal-title" className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">
          {title}
        </h2>
        {message && (
          <div className="mt-2 text-[15px] text-[#6e6e73] leading-relaxed dark:text-slate-400">
            {message}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline text-[13px] font-bold"
          >
            {cancelLabel}
          </button>
          <button
            ref={btnRef}
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            className={`btn text-[13px] font-bold ${
              danger
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_4px_12px_rgba(220,38,38,0.25)]"
                : "btn-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
