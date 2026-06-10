"use client";

import { useRef, useState } from "react";
import { rupiah } from "@/lib/fees";

// Membuat poster QR untuk satu iklan. Cocok dicetak & ditempel di kampus —
// orang scan langsung ke halaman produk (offline → online).
export default function QRButton({ listing }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);

  function productUrl() {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/produk/${listing.id}`;
  }

  async function openModal() {
    setOpen(true);
    if (qr) return;
    try {
      const QR = (await import("qrcode")).default;
      const png = await QR.toDataURL(productUrl(), {
        width: 480,
        margin: 1,
        color: { dark: "#4C1D95", light: "#ffffff" },
      });
      setQr(png);
    } catch (e) {
      console.error("qr:", e?.message);
    }
  }

  async function downloadPoster() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `qr-${listing.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      alert("Gagal membuat poster: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={openModal} className="btn-outline">
        🔳 QR Poster
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
            {/* Poster yang akan diunduh */}
            <div
              ref={ref}
              style={{ width: 300 }}
              className="rounded-xl border border-gray-100 p-5 text-center"
            >
              <p className="text-sm font-extrabold tracking-wide text-primary">
                JUAL BELI USU · POLMED
              </p>
              <p className="mt-3 line-clamp-2 text-base font-bold text-gray-900">
                {listing.title}
              </p>
              <p className="text-lg font-extrabold text-primary">
                {rupiah(listing.price)}
              </p>
              <div className="mt-3 grid place-items-center">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR" width={220} height={220} />
                ) : (
                  <div className="grid h-[220px] w-[220px] place-items-center text-gray-300">
                    Membuat QR…
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-gray-500">
                📱 Scan untuk lihat & beli
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={downloadPoster}
                disabled={busy || !qr}
                className="btn-primary flex-1"
              >
                {busy ? "Membuat…" : "⬇️ Download Poster"}
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
