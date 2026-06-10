"use client";

import { useEffect, useState } from "react";

function StarIcon({ filled, half }) {
  if (filled) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-200">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon key={s} filled={s <= Math.round(value)} />
      ))}
    </div>
  );
}

/**
 * RatingWidget
 * Props:
 *   listing   : { id, status, seller_wa }
 *   className : string (optional)
 */
export default function RatingWidget({ listing, className = "" }) {
  const [existing, setExisting] = useState(null); // rating yang sudah ada
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isSold = listing?.status === "sold";

  useEffect(() => {
    if (!listing?.id) return;
    fetch(`/api/ratings?listing_id=${listing.id}`)
      .then((r) => r.json())
      .then((d) => {
        setExisting(d.rating || null);
        if (d.rating) {
          setSelected(d.rating.rating);
          setComment(d.rating.comment || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listing?.id]);

  async function submit() {
    if (!selected) {
      setError("Pilih jumlah bintang dulu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          seller_wa: listing.seller_wa,
          rating: selected,
          comment,
          buyer_name: buyerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan rating.");
      setExisting(data.rating);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isSold) return null;
  if (loading) return null;

  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="font-semibold text-gray-800">⭐ Rating Penjual</h3>

      {/* Sudah ada rating */}
      {existing ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <StarDisplay value={existing.rating} />
            <span className="text-sm font-bold text-amber-500">{existing.rating}/5</span>
          </div>
          {existing.buyer_name && (
            <p className="mt-1 text-xs text-gray-400">oleh {existing.buyer_name}</p>
          )}
          {existing.comment && (
            <p className="mt-2 text-sm text-gray-600 italic">
              &ldquo;{existing.comment}&rdquo;
            </p>
          )}
          {success && (
            <p className="mt-2 text-xs text-green-600 font-medium">
              ✅ Rating berhasil disimpan!
            </p>
          )}
        </div>
      ) : (
        /* Form rating baru */
        <div className="mt-3 space-y-3">
          <p className="text-xs text-gray-500">
            Barang ini sudah terjual. Bagaimana pengalaman kamu?
          </p>

          {/* Bintang interaktif */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110 focus:outline-none"
                aria-label={`${s} bintang`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-7 h-7 transition-colors ${
                    s <= (hovered || selected)
                      ? "text-amber-400"
                      : "text-gray-200"
                  }`}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            {selected > 0 && (
              <span className="ml-2 self-center text-sm font-semibold text-amber-500">
                {["", "Buruk", "Kurang", "Cukup", "Bagus", "Sangat Bagus"][selected]}
              </span>
            )}
          </div>

          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Nama kamu (opsional)"
            className="input"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tulis ulasan singkat… (opsional)"
            className="input min-h-[72px] resize-none"
          />

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !selected}
            className="btn-primary w-full"
          >
            {busy ? "Menyimpan…" : "Kirim Rating"}
          </button>
        </div>
      )}
    </div>
  );
}
