"use client";

import { useState } from "react";

export default function ProductGallery({ images = [], title }) {
  const imgs = images.filter(Boolean);
  const [active, setActive] = useState(0);

  if (imgs.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center bg-gray-100 text-6xl dark:bg-slate-950 dark:text-slate-800">
        📦
      </div>
    );
  }

  const handlePrev = () => {
    setActive((prev) => (prev === 0 ? imgs.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActive((prev) => (prev === imgs.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="group relative">
      {/* Main Image View */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          src={imgs[active]}
          alt={title}
          className="h-full w-full object-cover transition-all duration-500 hover:scale-105 animate-fade-in"
        />
        
        {/* Arrow Navigation */}
        {imgs.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 opacity-0 shadow-md transition-all hover:bg-white hover:scale-105 group-hover:opacity-100 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-900"
              aria-label="Previous image"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 opacity-0 shadow-md transition-all hover:bg-white hover:scale-105 group-hover:opacity-100 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-900"
              aria-label="Next image"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Floating Dot Indicators */}
        {imgs.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            {imgs.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-3 bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === active
                  ? "border-primary dark:border-white scale-[0.98]"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
