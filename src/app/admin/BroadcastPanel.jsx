"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function BroadcastPanel({ sellers }) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // AI Generator states
  const [aiInstruction, setAiInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  async function handleAIGenerate() {
    if (!aiInstruction.trim()) return;
    setGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/ai-generate-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiInstruction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal generate text");
      setMessage(data.text);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleBroadcast() {
    if (!message.trim()) return alert("Pesan tidak boleh kosong!");
    if (!confirm(`Kirim pesan ini ke ${sellers.length} penjual?`)) return;

    setLoading(true);
    setStatus("Sedang mengirim...");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          imageUrl: imageUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal broadcast");
      
      setStatus(`✅ Berhasil mengirim ke ${data.successCount} pengguna. Gagal: ${data.failCount}`);
      setMessage("");
      setImageUrl("");
    } catch (err) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold dark:text-white">Broadcast WhatsApp</h2>
        <p className="mb-4 text-sm text-gray-500">
          Kirim pesan massal ke seluruh pengguna ({sellers.length} penjual terdaftar). 
          Gunakan fitur ini dengan bijak untuk menghindari pemblokiran nomor WhatsApp oleh Meta.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">Bantu dengan AI ✨</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input"
                placeholder="Contoh: Buatkan info promo bebas biaya bump hari ini..."
                value={aiInstruction}
                maxLength={300}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
              />
              <button
                onClick={handleAIGenerate}
                disabled={generating || !aiInstruction.trim()}
                className="btn-accent shrink-0"
              >
                {generating ? "Berpikir..." : "Generate"}
              </button>
            </div>
            {aiError && <p className="mt-1 text-xs text-rose-500">{aiError}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium dark:text-gray-300">Pesan Text</label>
              <span className={`text-xs ${message.length > 900 ? "text-rose-500" : "text-gray-400"}`}>
                {message.length} karakter
              </span>
            </div>
            <textarea
              className="input min-h-[150px]"
              placeholder="Ketik pesan promosi atau pengumuman di sini..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">URL Gambar (Opsional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://example.com/promo.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {status && (
            <div className={`rounded-md p-3 text-sm ${status.includes("Error") ? "bg-rose-100 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
              {status}
            </div>
          )}

          <button
            onClick={handleBroadcast}
            disabled={loading || !message.trim()}
            className="btn-primary w-full"
          >
            {loading ? "Mengirim..." : `Kirim Broadcast ke ${sellers.length} Pengguna`}
          </button>
        </div>
      </div>
    </div>
  );
}
