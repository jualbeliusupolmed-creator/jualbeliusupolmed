"use client";

import { useEffect, useId, useRef } from "react";
import { Icon } from "./Icons";
import { hapticLight } from "@/lib/haptics";

export default function BottomSheet({ isOpen, onClose, title, children }) {
  const sheetRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    hapticLight();

    const focusSheet = () => closeButtonRef.current?.focus();
    const frame = window.requestAnimationFrame(focusSheet);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
      {/* Backdrop tap to close */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup panel"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-[28px] border-t border-slate-200 bg-white p-5 pb-safe shadow-2xl animate-in slide-in-from-bottom duration-300 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Drag Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">
            {title || "Filter"}
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full active:scale-90 transition-transform"
          >
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 touch-pan-y">
          {children}
        </div>
      </section>
    </div>
  );
}
