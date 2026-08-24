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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[8px] transition-opacity duration-300 animate-in fade-in">
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
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[32px] border-t border-black/[0.05] bg-white/95 backdrop-blur-xl p-5 pb-safe shadow-[0_-24px_64px_rgba(0,0,0,0.15)] animate-slide-up dark:border-white/[0.08] dark:bg-[#1c1c1e]/95"
      >
        {/* Drag Handle — iOS style */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-black/[0.15] dark:bg-white/[0.2] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <h3 id={titleId} className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">
            {title || "Filter"}
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/[0.05] text-[#1d1d1f] hover:bg-black/[0.09] active:scale-90 transition-all dark:bg-white/[0.08] dark:text-white"
          >
            <Icon.X className="w-3.5 h-3.5" />
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
