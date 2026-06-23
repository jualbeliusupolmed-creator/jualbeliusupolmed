"use client";

import { useState, useEffect } from "react";

export default function AIPanel({ settings, action }) {
  const [aiConfig, setAiConfig] = useState(settings.ai_config || {
    model: "gemini-2.5-flash",
    memory: "Pasar target adalah mahasiswa USU dan Polmed di Kota Medan. Pembayaran bisa pakai QRIS atau bayar tunai (COD). Kategori yang tersedia: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya.",
    personality: "Kamu adalah asisten marketplace yang profesional tapi santai. Gunakan bahasa Indonesia sehari-hari, sopan, sedikit gaul (seperti pakai kata 'Kak' atau 'Agan'). Selalu berikan semangat untuk cepat berjualan."
  });
  const [saved, setSaved] = useState("");
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
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-400">Belum ada log percakapan / Bot baru direstart</td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 text-xs whitespace-nowrap text-gray-500">
                      {new Date(log.timestamp).toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-xs font-mono">
                      {log.sender.includes("me") ? (
                        <span className="text-emerald-600 font-semibold">BOT (Keluar)</span>
                      ) : (
                        log.sender.split("@")[0]
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
