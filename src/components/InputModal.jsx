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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="input-modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="input-modal-title" className="text-lg font-bold text-gray-900">
          {title}
        </h2>

        <div className="mt-4">
          {label && (
            <label className="label" htmlFor="input-modal-field">
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
            className="input"
          />
          {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="btn-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
