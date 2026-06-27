"use client";
import { rupiah } from "@/lib/fees";
import { useState, useEffect, useRef } from "react";

export default function QRISModal({ qrisUrl, fee, onClose, transactionId, onSuccess }) {
  const [pollStatus, setPollStatus] = useState("PENDING"); // PENDING | SUCCESS | EXPIRED
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const intervalRef = useRef(null);

  // Auto-polling tiap 4 detik saat modal terbuka
  useEffect(() => {
    if (!transactionId || successMsg) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/klikqris-status?orderId=${encodeURIComponent(transactionId)}`);
        const data = await res.json();
        if (data.paid || data.status === "SUCCESS") {
          clearInterval(intervalRef.current);
          setPollStatus("SUCCESS");
          setSuccessMsg("🎉 Pembayaran berhasil dikonfirmasi otomatis!");
          setTimeout(() => {
            if (onSuccess) onSuccess(data);
            else onClose();
          }, 2000);
        } else if (data.status === "EXPIRED") {
          clearInterval(intervalRef.current);
          setPollStatus("EXPIRED");
          setError("QRIS sudah kadaluwarsa. Silakan buat transaksi baru.");
        }
      } catch {
        // network error sementara, lanjut polling
      }
    }, 4000);

    return () => clearInterval(intervalRef.current);
  }, [transactionId, successMsg, onSuccess, onClose]);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Mohon pilih gambar struk transfer Anda terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      if (transactionId) formData.append("transactionId", transactionId);
      if (fee) formData.append("expectedAmount", fee);

      const res = await fetch("/api/payments/verify-receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memverifikasi struk.");

      clearInterval(intervalRef.current);
      setSuccessMsg("🎉 Struk valid! Pembayaran berhasil dikonfirmasi oleh AI.");
      setTimeout(() => {
        if (onSuccess) onSuccess(data);
        else onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!qrisUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 animate-fade-in relative my-8">
        <button
          onClick={onClose}
          disabled={loading || !!successMsg}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          ✕
        </button>

        <div className="text-center mt-2">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            ⚡ Bayar via QRIS
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Scan kode QRIS di bawah dengan m-Banking / e-Wallet Anda
          </p>

          <div className="mt-4 bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrisUrl} alt="QRIS" className="w-[250px] h-[250px] object-contain" />
          </div>

          {fee && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-150/40 dark:border-slate-850">
              <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Transfer Tepat Sebesar:</p>
              <p className="text-3xl font-black text-primary dark:text-white mt-0.5">{rupiah(fee)}</p>
              <p className="text-[10px] text-red-500 mt-1 font-bold">PENTING: Nominal sudah include kode unik — bayar persis sesuai angka di atas!</p>
            </div>
          )}

          {/* Status polling indicator */}
          {!successMsg && pollStatus === "PENDING" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              Menunggu pembayaran... dikonfirmasi otomatis
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-600 text-xs text-left border border-red-100 dark:bg-red-900/20 dark:border-red-800/50">
              ❌ {error}
            </div>
          )}

          {successMsg && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 text-green-700 text-sm font-bold text-center border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 animate-pulse">
              {successMsg}
            </div>
          )}

          {/* Fallback manual upload */}
          {!successMsg && pollStatus !== "EXPIRED" && (
            <div className="mt-4">
              {!showFallback ? (
                <button
                  type="button"
                  onClick={() => setShowFallback(true)}
                  className="text-xs text-gray-400 hover:text-primary underline dark:text-slate-500"
                >
                  Sudah bayar tapi belum dikonfirmasi? Upload struk
                </button>
              ) : (
                <div className="border-t border-gray-100 dark:border-slate-800 pt-4 text-left">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    📸 Upload Bukti Transfer (opsional)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    Jika sudah 5 menit belum terkonfirmasi otomatis, upload struk untuk verifikasi AI.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/20
                      dark:file:bg-primary/20 dark:file:text-primary-light
                      cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="btn-primary w-full text-center py-3 mt-3 shadow-md transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI Sedang Membaca Struk...
                      </>
                    ) : "Kirim & Verifikasi"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !successMsg && (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Batal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
