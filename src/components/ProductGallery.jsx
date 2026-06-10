"use client";

import { useState } from "react";

// Galeri foto produk: foto besar + thumbnail untuk ganti.
export default function ProductGallery({ images = [], title }) {
  const imgs = images.filter(Boolean);
  const [active, setActive] = useState(0);

  if (imgs.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center bg-gray-100 text-6xl">
        📦
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgs[active]}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>
      {imgs.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-primary" : "border-transparent"
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
