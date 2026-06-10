"use client";

import { useRef, useState } from "react";
import { rupiah } from "@/lib/fees";

// Generate gambar iklan 9:16 untuk IG Story memakai html2canvas, lalu download.
export default function IGShareButton({ listing }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `iklan-${listing.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      alert("Gagal membuat gambar: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline">
        📸 Share ke IG Story
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] overflow-auto rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kanvas 9:16 */}
            <div
              ref={ref}
              style={{ width: 270, height: 480 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white"
            >
              <div className="absolute inset-x-0 top-0 p-4 text-center text-sm font-extrabold tracking-wide">
                JUAL BELI USU · POLMED
              </div>
              <div className="absolute left-1/2 top-16 h-44 w-44 -translate-x-1/2 overflow-hidden rounded-xl bg-white/10">
                {listing.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.image_url}
                    alt=""
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-5xl">
                    📦
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <p className="line-clamp-2 text-lg font-bold">{listing.title}</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {rupiah(listing.price)}
                </p>
                <p className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary">
                  bit.ly/jualbeliusupolmed
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={download} disabled={busy} className="btn-primary flex-1">
                {busy ? "Membuat…" : "⬇️ Download Gambar"}
              </button>
              <button onClick={() => setOpen(false)} className="btn-outline">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
