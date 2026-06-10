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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900">
          {title}
        </h2>
        {message && (
          <div className="mt-2 text-sm text-gray-600 leading-relaxed">
            {message}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
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
            className={`btn ${
              danger
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
