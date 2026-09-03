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
      <div className="card mx-auto max-w-md p-8 text-center">
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
    <div className="mx-auto max-w-lg">
      <div className="g-card p-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--g-line)]">
          <Link href="/admin/overview" className="g-icon-btn text-base" title="Kembali">
            ←
          </Link>
          <div>
            <h1 className="g-card-title text-base">
              Persetujuan QRIS Manual (Unlock Kontak)
            </h1>
            <p className="g-card-desc">
              Verifikasi dan rilis nomor kontak pembeli ke pemohon
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="flex justify-between items-center py-2.5 px-3 bg-[var(--g-surface-2)] rounded-xl border border-[var(--g-line)]">
            <span className="font-semibold text-[var(--g-ink-soft)]">Status Transaksi</span>
            <span className={`g-badge ${payment.status === "paid" ? "is-ok" : "is-warn"}`}>
              {payment.status === "paid" ? "Paid (Lunas)" : "Pending (Menunggu Persetujuan)"}
            </span>
          </div>

          {/* Details */}
          <div className="border border-[var(--g-line)] rounded-xl divide-y divide-[var(--g-line)] bg-[var(--g-surface)]">
            <div className="p-3 flex justify-between gap-4">
              <span className="text-[var(--g-ink-soft)]">ID Pembayaran</span>
              <span className="font-mono text-[var(--g-ink)] select-all">{paymentId}</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-[var(--g-ink-soft)]">Order ID</span>
              <span className="font-semibold text-[var(--g-ink)]">{payment.midtrans_order_id}</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-[var(--g-ink-soft)]">Nominal</span>
              <span className="font-extrabold text-[var(--g-green)]">Rp 2.000</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-[var(--g-ink-soft)]">No. WA Penerima (Pemohon)</span>
              <span className="font-bold text-[var(--g-ink)]">{payment.meta?.requester_wa}</span>
            </div>
          </div>

          {wanted && (
            <div className="mt-4 p-4 bg-[var(--g-surface-2)] border border-[var(--g-line)] rounded-xl space-y-2">
              <h3 className="font-bold text-[var(--g-ink)] text-xs">Detail Postingan Cari Barang:</h3>
              <p className="text-[var(--g-ink-soft)]"><span className="font-medium">Judul:</span> <b className="text-[var(--g-ink)]">{wanted.title}</b></p>
              <p className="text-[var(--g-ink-soft)]"><span className="font-medium">Pembeli (Target):</span> <b className="text-[var(--g-ink)]">{wanted.buyer_name} ({wanted.buyer_wa})</b></p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-[var(--g-line)] flex flex-col gap-2">
            {payment.status !== "paid" ? (
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="g-btn g-btn-wa w-full py-2.5 text-xs font-bold"
              >
                {submitting ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>✓ Setujui &amp; Kirim Nomor WA Pembeli</span>
                )}
              </button>
            ) : (
              <div className="w-full py-2.5 text-center text-[var(--g-green-ink)] font-bold bg-[var(--g-green-soft)] border border-[var(--g-green)]/30 rounded-lg select-none">
                ✓ Transaksi Ini Sudah Lunas
              </div>
            )}
            <Link
              href="/admin/overview"
              className="g-btn g-btn-outlined w-full py-2.5 text-center text-xs font-bold"
            >
              Kembali ke Dashboard Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
