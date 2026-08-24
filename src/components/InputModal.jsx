"use client";

import { useEffect, useRef, useState } from "react";

/**
 * InputModal — pengganti window.prompt()
 *
 * Props:
 *   open         : boolean
 *   title        : string
 *   label        : string
 *   defaultValue : string | number
 *   type         : "text" | "number" (default "text")
 *   min          : number (untuk type number)
 *   placeholder  : string
 *   confirmLabel : string (default "Simpan")
 *   onConfirm    : (value: string) => void
 *   onClose      : () => void
 *   hint         : string — teks kecil di bawah input
 */
export default function InputModal({
  open,
  title = "Masukkan Nilai",
  label,
  defaultValue = "",
  type = "text",
  min,
  placeholder,
  confirmLabel = "Simpan",
  onConfirm,
  onClose,
  hint,
}) {
  const [value, setValue] = useState(String(defaultValue ?? ""));
  const inputRef = useRef(null);

  // Reset value tiap kali modal dibuka
  useEffect(() => {
    if (open) {
      setValue(String(defaultValue ?? ""));
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleConfirm() {
    if (value.trim() === "") return;
    onConfirm?.(value);
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="input-modal-title"
    >
      {/* Overlay — frosted glass Apple style */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-white/95 backdrop-blur-xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.2)] border border-black/[0.05] animate-slide-up dark:bg-[#1c1c1e]/95 dark:border-white/[0.08]">
        <h2 id="input-modal-title" className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">
          {title}
        </h2>

        <div className="mt-4">
          {label && (
            <label className="label text-[13px] text-[#6e6e73] font-medium mb-1.5" htmlFor="input-modal-field">
              {label}
            </label>
          )}
          <input
            id="input-modal-field"
            ref={inputRef}
            type={type}
            min={min}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder={placeholder}
            className="input rounded-[14px] bg-black/[0.04] border-black/[0.05] focus:bg-white dark:bg-white/[0.08] dark:border-white/[0.05] dark:focus:bg-[#2c2c2e]"
          />
          {hint && <p className="mt-1.5 text-xs text-[#6e6e73] dark:text-slate-400">{hint}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline text-[13px] font-bold">
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="btn-primary text-[13px] font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
