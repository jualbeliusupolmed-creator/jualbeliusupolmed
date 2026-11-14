"use client";

import { compressImage, validateImageFile } from "@/lib/image";

// Uploader multi-foto terkontrol. Parent memegang array `media` berisi item
// { file?, url?, preview }. Foto pertama otomatis jadi sampul.
export default function MediaUploader({
  media,
  setMedia,
  max = 5,
  error,
  setError,
}) {
  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setError?.("");
    const next = [...media];
    for (const f of files) {
      if (next.length >= max) {
        setError?.(`Maksimal ${max} foto.`);
        break;
      }
      const err = validateImageFile(f);
      if (err) {
        setError?.(err);
        continue;
      }
      try {
        const c = await compressImage(f);
        next.push({ file: c, preview: URL.createObjectURL(c) });
      } catch {
        next.push({ file: f, preview: URL.createObjectURL(f) });
      }
    }
    setMedia(next);
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
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
              aria-label="Hapus foto"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-1.5 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-white disabled:opacity-30 p-0.5 hover:text-emerald-300 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                aria-label="Geser ke kiri"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === media.length - 1}
                className="text-white disabled:opacity-30 p-0.5 hover:text-emerald-300 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
                aria-label="Geser ke kanan"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {media.length < max && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-gray-300 text-center hover:border-emerald-600 transition-colors focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2">
            <span className="text-xs text-gray-500 font-semibold">+ Tambah</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="hidden"
            />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <p className="mt-1.5 text-xs text-gray-500">
        Maksimal {max} foto (foto pertama jadi sampul). Otomatis dioptimalkan ke format WebP.
      </p>
    </div>
  );
}
