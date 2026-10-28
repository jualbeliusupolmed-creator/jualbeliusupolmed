"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/useFocusTrap";

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
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) btnRef.current?.focus();
  }, [open]);
  useFocusTrap({ isOpen: open, onClose, containerRef: dialogRef, initialFocusRef: btnRef });

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      {/* Overlay — frosted glass Apple style */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />

      {/* Card */}
      <div ref={dialogRef} className="relative w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.2)] border border-black/[0.05] animate-slide-up dark:bg-[#1c1c1e]/95 dark:border-white/[0.08]">
        <h2 id={titleId} className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">
          {title}
        </h2>
        {message && (
          <div id={messageId} className="mt-2 text-[15px] text-[#6e6e73] leading-relaxed dark:text-slate-400">
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
    </div>,
    document.body
  );
}
