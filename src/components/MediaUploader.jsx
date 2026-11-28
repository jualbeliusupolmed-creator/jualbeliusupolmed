"use client";

import { useState } from "react";
import { compressImage, validateImageFile } from "@/lib/image";

// Uploader multi-foto terkontrol. Parent memegang array `media` berisi item
// { file?, url?, preview }. Foto pertama otomatis jadi sampul.
export default function MediaUploader({
  media,
  setMedia,
  max = 5,
  error,
  setError,
  inputLabel = "Tambah foto",
}) {
  const [compressing, setCompressing] = useState(false);

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setError?.("");
    if (!files.length) return;

    const remainingSlots = max - media.length;
    if (remainingSlots <= 0) {
      setError?.(`Maksimal ${max} foto.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError?.(`Hanya ${remainingSlots} foto lagi yang dapat ditambahkan (maksimal ${max}).`);
    }

    setCompressing(true);
    try {
      const processed = await Promise.all(
        filesToProcess.map(async (f) => {
          const err = validateImageFile(f);
          if (err) {
            setError?.(err);
            return null;
          }
          try {
            const c = await compressImage(f);
            return { file: c, preview: URL.createObjectURL(c) };
          } catch {
            return { file: f, preview: URL.createObjectURL(f) };
          }
        })
      );
      const valid = processed.filter(Boolean);
      if (valid.length) {
        setMedia([...media, ...valid]);
      }
    } finally {
      setCompressing(false);
    }
  }

  function remove(i) {
    setMedia(media.filter((_, idx) => idx !== i));
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const copy = [...media];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setMedia(copy);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {media.map((m, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.preview} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                Sampul
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={compressing}
              className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Hapus foto ${i + 1}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || compressing}
                className="inline-flex h-11 w-11 items-center justify-center text-white transition-colors hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Geser foto ${i + 1} ke kiri`}
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === media.length - 1 || compressing}
                className="inline-flex h-11 w-11 items-center justify-center text-white transition-colors hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Geser foto ${i + 1} ke kanan`}
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {media.length < max && (
          <label className={`grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-gray-300 text-center transition-colors focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 ${
            compressing ? "bg-emerald-50/50 border-emerald-300 cursor-wait" : "hover:border-emerald-600"
          }`}>
            {compressing ? (
              <div role="status" aria-live="polite" className="flex flex-col items-center gap-1">
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <span className="text-[10px] text-emerald-700 font-semibold">Mengompres…</span>
              </div>
            ) : (
              <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">+ Tambah</span>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={compressing}
              onChange={onPick}
              aria-label={inputLabel}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">
        Maksimal {max} foto (foto pertama jadi sampul). Otomatis dioptimalkan ke format WebP.
      </p>
    </div>
  );
}
