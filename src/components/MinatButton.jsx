"use client";

import { useState } from "react";
import { formatWaForBaileys } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import { useRouter } from "next/navigation";
import { useTransactionMode } from "@/lib/useTransactionMode";
import { toast } from "sonner";

const TEMPLATES = [
  (title) => `Halo, apakah "${title}" masih tersedia?`,
  (title) => `Berapa harga final untuk "${title}"? Boleh nego?`,
  (title) => `Bisa COD di mana untuk "${title}"?`,
];

// Tombol "Minat": Mengikuti mode transaksi global (Mode 1: WA langsung vs Mode 2: In-App DM)
export default function MinatButton({ listing }) {
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const router = useRouter();
  const { isWaMode } = useTransactionMode();

  async function sendMinat(text) {
    setShowPicker(false);
    setBusy(true);

    // MODE 1: DIRECT WHATSAPP
    if (isWaMode) {
      try {
        const rawWa = listing.seller_wa;
        const formattedWa = formatWaForBaileys(rawWa);

        if (!formattedWa) {
          toast.error("Nomor WhatsApp penjual tidak tersedia.");
          setBusy(false);
          return;
        }

        // Catat interaksi minat ke backend (fire-and-forget)
        fetch("/api/minat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listing_id: listing.id }),
        }).catch(() => {});

        const slug = buildSlug(listing.title, listing.id);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.jualbeliusupolmed.web.id";
        const productLink = `${baseUrl}/produk/${slug}`;

        const fullMsg =
          `Halo ${listing.seller_name || "Penjual"},\n\n` +
          `${text}\n\n` +
          `📦 *${listing.title}*\n` +
          `🔗 ${productLink}`;

        const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(fullMsg)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
        toast.success("Membuka WhatsApp penjual...");
      } catch (err) {
        toast.error("Gagal membuka WhatsApp.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // MODE 2: IN-APP DIRECT MESSAGE
    try {
      const res = await fetch("/api/chat/marketplace/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Silakan masuk/login terlebih dahulu untuk chat penjual.");
          router.push("/dashboard/login");
          return;
        }
        throw new Error(data.error || "Gagal memulai chat");
      }

      router.push(`/chat?room=${data.roomId}`);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={busy}
        className="btn-wa w-full"
      >
        {busy
          ? "Memproses…"
          : isWaMode
          ? "📱 Chat Penjual via WhatsApp"
          : "💬 Minat / Chat Penjual"}
      </button>

      {/* Template Picker Modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowPicker(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                {isWaMode ? "📱 Chat WhatsApp Penjual" : "💬 Pilih Pesan ke Penjual"}
              </p>
              <button
                onClick={() => setShowPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Templates */}
            <div className="p-3 space-y-2">
              {TEMPLATES.map((tpl, i) => {
                const msg = tpl(listing.title);
                return (
                  <button
                    key={i}
                    onClick={() => sendMinat(msg)}
                    className="w-full text-left rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-gray-800 dark:text-slate-200 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 transition-all"
                  >
                    {msg}
                  </button>
                );
              })}

              {/* Custom message */}
              <div className="pt-1">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5 px-1">
                  Atau ketik pesan sendiri:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && customMsg.trim() && sendMinat(customMsg.trim())
                    }
                    placeholder="Tulis pesan..."
                    className="input flex-1 text-sm py-2"
                  />
                  <button
                    onClick={() => customMsg.trim() && sendMinat(customMsg.trim())}
                    disabled={!customMsg.trim()}
                    className="btn-wa px-3 text-sm disabled:opacity-40"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
