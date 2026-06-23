"use client";

import { useState, useEffect } from "react";

export default function AIPanel({ settings, action }) {
  const [aiConfig, setAiConfig] = useState(settings.ai_config || {
    model: "gemini-2.5-flash",
    memory: "Pasar target adalah mahasiswa USU dan Polmed di Kota Medan. Pembayaran bisa pakai QRIS atau bayar tunai (COD). Kategori yang tersedia: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya.",
    personality: "Kamu adalah asisten marketplace yang profesional tapi santai. Gunakan bahasa Indonesia sehari-hari, sopan, sedikit gaul (seperti pakai kata 'Kak' atau 'Agan'). Selalu berikan semangat untuk cepat berjualan."
  });
  const [saved, setSaved] = useState("");

  const [kwConfig, setKwConfig] = useState(settings.bot_keywords || {
    enabled: true,
    greeting_enabled: false,
    greeting: "Halo! 👋\n\nKetik salah satu perintah berikut:\n• *JUAL* — Pasang iklan\n• *CARI [nama barang]* — Cari barang\n• *PERPANJANG* — Perpanjang iklan\n• *UPGRADE* — Upgrade iklan\n• *ADMIN* — Hubungi admin\n\nAtau langsung kirim *Foto + Deskripsi + Harga* untuk pasang iklan!",
    triggers: "jual,wts,wtb,cari,beli,admin,min,mimin,perpanjang,upgrade,dijual,ready",
    min_price_digits: 4,
  });
  const [kwSaved, setKwSaved] = useState("");
  function flashKw() { setKwSaved("ok"); setTimeout(() => setKwSaved(""), 2000); }
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [loading, setLoading] = useState(false);

  // Audit Logs states
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState("");

  function flash() { setSaved("ok"); setTimeout(() => setSaved(""), 2000); }

  async function fetchLogs() {
    setLoadingLogs(true);
    setLogError("");
    try {
      const res = await fetch("/api/admin/bot-logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil log");
      setLogs(data.logs || []);
    } catch (err) {
      setLogError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  async function handleTest() {
    if (!testInput.trim()) return;
    setLoading(true);
    setTestOutput("");
    try {
      const body = { text: testInput, aiConfig };
      const res = await fetch("/api/admin/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi AI");
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestOutput("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">

      {/* ── Keyword-first Mode ─────────────────────────────────────────────── */}
      <div className="card p-5 col-span-1 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Pengaturan Respon Bot WA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Atur kapan bot merespons otomatis. Aktifkan <em>Keyword Mode</em> agar bot hanya merespons jika ada kata kunci tertentu — chat biasa cukup mendapat menu sapaan.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium dark:text-gray-300">Keyword Mode</span>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={kwConfig.enabled !== false} onChange={e => setKwConfig({ ...kwConfig, enabled: e.target.checked })} />
              <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>

        <div className={`grid gap-4 md:grid-cols-2 transition-opacity ${kwConfig.enabled === false ? "opacity-40 pointer-events-none" : ""}`}>
          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">Kata Kunci Trigger <span className="text-xs text-gray-400">(pisah dengan koma)</span></label>
            <input
              type="text"
              className="input font-mono text-sm"
              value={kwConfig.triggers || ""}
              onChange={e => setKwConfig({ ...kwConfig, triggers: e.target.value })}
              placeholder="jual,cari,beli,admin,min,perpanjang,upgrade"
            />
            <p className="mt-1 text-xs text-gray-400">Jika pesan mengandung salah satu kata ini → bot proses normal. Tanpa keyword → kirim sapaan saja.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">Minimum Digit Angka (Harga)</label>
            <input
              type="number"
              className="input"
              min={1} max={10}
              value={kwConfig.min_price_digits || 4}
              onChange={e => setKwConfig({ ...kwConfig, min_price_digits: Number(e.target.value) })}
            />
            <p className="mt-1 text-xs text-gray-400">Angka ≥ N digit dianggap sebagai harga dan tetap diproses AI. Default 4 = Rp 1.000 ke atas.</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-3 border rounded-xl dark:border-slate-700">
            <div>
              <p className="text-sm font-medium dark:text-gray-300">Balas dengan pesan sapaan jika tidak ada keyword</p>
              <p className="text-xs text-gray-400 mt-0.5">Nonaktif = bot diam total. Aktif = bot kirim menu sapaan di bawah.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={!!kwConfig.greeting_enabled} onChange={e => setKwConfig({ ...kwConfig, greeting_enabled: e.target.checked })} />
                <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          <div className={`md:col-span-2 transition-opacity ${kwConfig.greeting_enabled ? "" : "opacity-40 pointer-events-none"}`}>
            <label className="mb-1 block text-sm font-medium dark:text-gray-300">Pesan Sapaan</label>
            <textarea
              className="input min-h-[130px] font-mono text-sm"
              value={kwConfig.greeting || ""}
              onChange={e => setKwConfig({ ...kwConfig, greeting: e.target.value })}
              placeholder="Halo! 👋 Ketik JUAL untuk pasang iklan atau CARI untuk cari barang."
            />
            <p className="mt-1 text-xs text-gray-400">Gunakan *teks tebal* dan _miring_ sesuai format WhatsApp.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => { action({ action: "save_settings", key: "bot_keywords", value: kwConfig }, "Pengaturan keyword bot disimpan"); flashKw(); }}
            className="btn-primary"
          >
            {kwSaved === "ok" ? "✓ Tersimpan" : "Simpan Pengaturan"}
          </button>
          <p className="text-xs text-gray-400">
            {kwConfig.enabled !== false
              ? "✅ Aktif — bot hanya proses AI jika ada keyword atau angka harga"
              : "⭕ Nonaktif — semua pesan diproses AI (perilaku lama)"}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-lg font-bold dark:text-white">Pengaturan Memori & Kepribadian Bot</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Model AI Utama</span>
            <select className="input" value={aiConfig.model} onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Sangat Cepat & Cerdas)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Paling Cepat)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Paling Cerdas, Agak Lambat)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">Gemini Flash direkomendasikan untuk menyeimbangkan kecepatan dan kepintaran chatbot.</p>
          </label>
          
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Memori Bot (Konteks Fakta)</span>
            <textarea className="input min-h-[120px]" value={aiConfig.memory} onChange={(e) => setAiConfig({...aiConfig, memory: e.target.value})} placeholder="Contoh: Kami adalah marketplace untuk mahasiswa USU. COD bisa di Pendopo." />
            <p className="mt-1 text-xs text-gray-400">Tulis fakta-fakta spesifik yang AI harus "ingat" tentang Jual Beli USU saat ia merespons pengguna.</p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Kepribadian & Gaya Bicara</span>
            <textarea className="input min-h-[120px]" value={aiConfig.personality} onChange={(e) => setAiConfig({...aiConfig, personality: e.target.value})} placeholder="Contoh: Jadilah asisten yang ramah, gunakan panggilan 'Kak', gunakan emotikon." />
            <p className="mt-1 text-xs text-gray-400">Instruksikan bagaimana bot menyusun nada bicaranya. AI akan memproduksi balasan WhatsApp sesuai kepribadian ini.</p>
          </label>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "ai_config", value: aiConfig }, "Pengaturan AI disimpan"); flash(); }} className="btn-primary mt-5 w-full">
          {saved === "ok" ? "✓ Tersimpan" : "Simpan Pengaturan AI"}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 text-lg font-bold dark:text-white">Simulator Chatbot AI</h2>
        <p className="mb-4 text-xs text-gray-400">Ketik pesan bohongan dari pembeli untuk melihat bagaimana Gemini merespons menggunakan kepribadian yang Anda atur di sebelah kiri.</p>
        
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Pesan dari Pembeli</span>
          <textarea className="input min-h-[100px]" value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Tulis chat pembeli... (Misal: bg, numpang jual iphone xr 2.5 jt nego sikit, lecet di sudut aja. tq)" />
        </label>
        
        <button onClick={handleTest} disabled={loading} className="btn-outline mt-3 w-full">
          {loading ? "AI sedang berfikir..." : "Tes Ekstraksi & Balasan"}
        </button>

        {testOutput && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Respons JSON dari Gemini</p>
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-slate-300 overflow-x-auto">
              {testOutput}
            </pre>
          </div>
        )}
      </div>
      <div className="col-span-1 lg:col-span-2 card p-5 mt-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Audit Log & Analisis Percakapan</h2>
            <p className="text-xs text-gray-400">Menampilkan hingga 100 pesan WhatsApp terakhir yang ditangani oleh sistem (Real-time dari RAM Bot).</p>
          </div>
          <button onClick={fetchLogs} disabled={loadingLogs} className="btn-outline text-xs">
            {loadingLogs ? "Memuat..." : "Refresh Log"}
          </button>
        </div>
        
        {logError && <div className="mb-4 text-xs text-rose-500">{logError}</div>}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="p-3 font-medium">Waktu</th>
                <th className="p-3 font-medium">Pengirim (No. WA)</th>
                <th className="p-3 font-medium">Tipe</th>
                <th className="p-3 font-medium">Isi Pesan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loadingLogs ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-400">
                    <span className="inline-block animate-pulse">Memuat log dari bot...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-400">Belum ada log percakapan / Bot baru direstart</td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 text-xs whitespace-nowrap text-gray-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="p-3 text-xs font-mono">
                      {log.sender?.includes("me") ? (
                        <span className="text-emerald-600 font-semibold">BOT (Keluar)</span>
                      ) : (
                        log.sender?.split("@")[0] ?? "-"
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] uppercase dark:bg-slate-800">
                        {log.type || "text"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate" title={log.message}>
                      {log.message || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
