"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Icon } from "@/components/Icons";

export default function ApproveUnlockClient({ paymentId, initialPayment, wanted }) {
  const [payment, setPayment] = useState(initialPayment);
  const [submitting, setSubmitting] = useState(false);

  if (!payment) {
    return (
      <div className="mx-auto max-w-md p-8 text-center bg-white dark:bg-slate-900 rounded-2xl shadow mt-10 border border-gray-100 dark:border-slate-800">
        <Icon.Package className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-650 mb-3" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Transaksi Tidak Ditemukan</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">ID transaksi pembayaran manual tidak valid atau telah dihapus.</p>
        <Link href="/admin/overview" className="btn-primary px-4 py-2 text-xs">
          Kembali ke Dashboard Admin
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_unlock_manual",
          payment_id: paymentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses persetujuan");
      
      toast.success("Pembayaran berhasil disetujui! Kontak pembeli telah dikirim ke pemohon.");
      setPayment((p) => ({ ...p, status: "paid" }));
      if (data.warning) {
        toast.warning(data.warning);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card bg-white p-6 shadow-xl dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
          <Link href="/admin/overview" className="text-gray-400 hover:text-gray-650 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
            ←
          </Link>
          <h1 className="text-base font-extrabold text-gray-900 dark:text-white">
            Persetujuan QRIS Manual (Unlock Kontak)
          </h1>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex justify-between items-center py-2.5 px-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
            <span className="font-semibold text-gray-500 dark:text-slate-400">Status Transaksi</span>
            <span className={`badge px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
              payment.status === "paid" 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" 
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            }`}>
              {payment.status === "paid" ? "Paid (Lunas)" : "Pending (Menunggu Persetujuan)"}
            </span>
          </div>

          {/* Details */}
          <div className="border border-gray-100 dark:border-slate-800/80 rounded-xl divide-y divide-gray-100 dark:divide-slate-850">
            <div className="p-3 flex justify-between gap-4">
              <span className="text-gray-400 dark:text-slate-500">ID Pembayaran</span>
              <span className="font-mono text-gray-750 dark:text-slate-350 select-all">{paymentId}</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-gray-400 dark:text-slate-500">Order ID</span>
              <span className="font-semibold text-gray-750 dark:text-slate-350">{payment.midtrans_order_id}</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-gray-400 dark:text-slate-500">Nominal</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Rp 2.000</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-gray-400 dark:text-slate-500">No. WA Penerima (Pemohon)</span>
              <span className="font-bold text-gray-750 dark:text-slate-300">{payment.meta?.requester_wa}</span>
            </div>
          </div>

          {wanted && (
            <div className="mt-4 p-4 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-2">
              <h3 className="font-bold text-blue-800 dark:text-blue-400 text-xs">Detail Postingan Cari Barang:</h3>
              <p className="text-gray-750 dark:text-slate-300"><span className="font-medium text-gray-400">Judul:</span> {wanted.title}</p>
              <p className="text-gray-750 dark:text-slate-300"><span className="font-medium text-gray-400">Pembeli (Target):</span> {wanted.buyer_name} ({wanted.buyer_wa})</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2">
            {payment.status !== "paid" ? (
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="btn-primary w-full py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>✅ Setujui &amp; Kirim Nomor WA Pembeli</span>
                )}
              </button>
            ) : (
              <div className="w-full py-2.5 text-center text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg select-none">
                ✓ Transaksi Ini Sudah Lunas
              </div>
            )}
            <Link
              href="/admin/overview"
              className="btn-outline w-full py-2.5 text-center text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg"
            >
              Kembali ke Dashboard Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
