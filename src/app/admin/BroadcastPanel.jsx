"use client";

import { useState, useEffect } from "react";

export default function BroadcastPanel({ sellers }) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // AI Generator states
  const [aiInstruction, setAiInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  // Jadwal states
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledList, setScheduledList] = useState([]);
  const [showScheduled, setShowScheduled] = useState(false);

  useEffect(() => {
    if (showScheduled) loadScheduled();
  }, [showScheduled]);

  async function loadScheduled() {
    try {
      const res = await fetch("/api/admin/broadcast/schedule");
      const data = await res.json();
      setScheduledList(data.broadcasts || []);
    } catch (_) {}
  }

  async function cancelScheduled(id) {
    if (!confirm("Batalkan jadwal ini?")) return;
    await fetch("/api/admin/broadcast/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadScheduled();
  }

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

  async function handleSchedule() {
    if (!message.trim()) return alert("Pesan tidak boleh kosong!");
    if (!scheduledAt) return alert("Pilih waktu jadwal terlebih dahulu!");
    if (!confirm(`Jadwalkan pesan ini untuk dikirim pada ${new Date(scheduledAt).toLocaleString("id-ID")}?`)) return;

    setLoading(true);
    setStatus("Menjadwalkan...");
    try {
      const res = await fetch("/api/admin/broadcast/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          imageUrl: imageUrl.trim() || null,
          scheduledAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjadwalkan");
      setStatus(`📅 Broadcast dijadwalkan untuk ${new Date(scheduledAt).toLocaleString("id-ID")}`);
      setMessage("");
      setImageUrl("");
      setScheduledAt("");
      loadScheduled();
    } catch (err) {
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

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">Jadwalkan Pengiriman (Opsional)</label>
            <input
              type="datetime-local"
              className="input"
              value={scheduledAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            {scheduledAt && (
              <p className="mt-1 text-xs text-gray-500">Akan dikirim: {new Date(scheduledAt).toLocaleString("id-ID")}</p>
            )}
          </div>

          {status && (
            <div className={`rounded-md p-3 text-sm ${status.includes("Error") ? "bg-rose-100 text-rose-700" : status.includes("📅") ? "bg-indigo-50 text-indigo-700" : "bg-blue-50 text-blue-700"}`}>
              {status}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBroadcast}
              disabled={loading || !message.trim() || !!scheduledAt}
              className="btn-primary flex-1"
            >
              {loading && !scheduledAt ? "Mengirim..." : `⚡ Kirim Sekarang (${sellers.length})`}
            </button>
            <button
              onClick={handleSchedule}
              disabled={loading || !message.trim() || !scheduledAt}
              className="btn-outline flex-1 text-indigo-600 border-indigo-300 hover:bg-indigo-50"
            >
              {loading && scheduledAt ? "Menjadwalkan..." : "📅 Jadwalkan"}
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Jadwal */}
      <div className="card p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold dark:text-white">Jadwal Broadcast</h3>
          <button onClick={() => setShowScheduled(!showScheduled)} className="text-xs text-blue-600 hover:underline">
            {showScheduled ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
        {showScheduled && (
          scheduledList.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada jadwal broadcast.</p>
          ) : (
            <div className="space-y-3">
              {scheduledList.map((bc) => (
                <div key={bc.id} className="flex items-start justify-between gap-3 p-3 border rounded-xl dark:border-slate-700">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate dark:text-white">{bc.message.slice(0, 80)}{bc.message.length > 80 ? "..." : ""}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(bc.scheduled_at).toLocaleString("id-ID")} ·{" "}
                      <span className={bc.status === "sent" ? "text-green-600" : bc.status === "failed" ? "text-rose-600" : "text-amber-600"}>
                        {bc.status === "sent" ? "✅ Terkirim" : bc.status === "failed" ? "❌ Gagal" : "⏳ Terjadwal"}
                      </span>
                    </p>
                  </div>
                  {bc.status === "pending" && (
                    <button onClick={() => cancelScheduled(bc.id)} className="text-xs text-rose-500 hover:underline shrink-0">Batal</button>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
