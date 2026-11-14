"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { AlertCircle, ArrowUpRight, CheckCircle2, CircleDollarSign, Plus, Ticket, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

export default function FinancialWarRoomPage() {
  const [loading, setLoading] = useState(true);
  const [recon, setRecon] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscountValue, setNewDiscountValue] = useState(100);
  const [newDiscountType, setNewDiscountType] = useState("percentage");
  const [newMaxUsage, setNewMaxUsage] = useState(50);
  const [newCampus, setNewCampus] = useState("ALL");

  async function loadData() {
    try {
      setLoading(true);
      const [reconRes, voucherRes] = await Promise.all([
        fetch("/api/admin/finance/reconciliation", { cache: "no-store" }),
        fetch("/api/admin/finance/vouchers", { cache: "no-store" }),
      ]);

      if (reconRes.ok) {
        const reconData = await reconRes.json();
        setRecon(reconData);
      }
      if (voucherRes.ok) {
        const vData = await voucherRes.json();
        setVouchers(vData.vouchers || []);
      }
    } catch (e) {
      toast.error("Gagal memuat data keuangan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateVoucher(e) {
    e.preventDefault();
    if (!newCode.trim()) return toast.error("Masukkan kode voucher");

    try {
      setCreating(true);
      const res = await fetch("/api/admin/finance/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          code: newCode,
          discountType: newDiscountType,
          discountValue: newDiscountValue,
          maxUsage: newMaxUsage,
          campus: newCampus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat voucher");
      toast.success(`Voucher ${json.voucher.code} berhasil dibuat!`);
      setNewCode("");
      loadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteVoucher(id, code) {
    if (!window.confirm(`Hapus voucher ${code}?`)) return;

    try {
      const res = await fetch("/api/admin/finance/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, code }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Voucher dihapus");
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      toast.error(e.message);
    }
  }

  const m = recon?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
              <CircleDollarSign className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900">Ruang Kendali Finansial & Voucher</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Rekonsiliasi transaksi QRIS, audit kebocoran biaya gateway, dan pembuatan kupon promo kemitraan kampus.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600 active:opacity-85"
        >
          {loading ? "Menghitung..." : "Segarkan Angka"}
        </button>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Gross Merchandise / Volume</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{rupiah(m.totalGross || 0)}</p>
          <p className="mt-1 text-[11px] text-slate-400">{m.totalTransactions || 0} transaksi berhasil</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4.5 shadow-sm">
          <p className="text-xs font-bold text-amber-900">Potongan Gateway (MDR 0.7%)</p>
          <p className="mt-2 text-2xl font-black text-amber-900">-{rupiah(m.estimatedGatewayMdr || 0)}</p>
          <p className="mt-1 text-[11px] text-amber-700">Estimasi biaya pihak ketiga / QRIS</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 shadow-sm">
          <p className="text-xs font-bold text-emerald-950">Pendapatan Bersih Platform</p>
          <p className="mt-2 text-2xl font-black text-emerald-950">{rupiah(m.netPlatformRevenue || 0)}</p>
          <p className="mt-1 text-[11px] text-emerald-800">Kas bersih yang masuk ke platform</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4.5 shadow-sm">
          <p className="text-xs font-bold text-rose-900">Pending / Tertunda</p>
          <p className="mt-2 text-2xl font-black text-rose-950">{rupiah(m.totalPendingAmount || 0)}</p>
          <p className="mt-1 text-[11px] text-rose-700">{m.pendingCount || 0} pembayaran menunggu</p>
        </div>
      </div>

      {/* Grid: Voucher Generator + Leakage Monitor */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voucher & Free Pass Creator */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Ticket className="h-4 w-4 text-emerald-800" />
            <h2 className="text-sm font-black text-slate-900">Voucher & Free-Pass Kemitraan</h2>
          </div>

          <form onSubmit={handleCreateVoucher} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700">Kode Promo / Voucher</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Contoh: BEMUSU2026, GRATISPOSTING"
                className="mt-1 w-full uppercase font-mono rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Jenis Diskon</label>
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal Rupiah (Rp)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  {newDiscountType === "percentage" ? "Besar Diskon (%)" : "Nominal Potongan (Rp)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={newDiscountType === "percentage" ? "100" : "1000000"}
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Batas Pemakaian (Kuota)</label>
                <input
                  type="number"
                  min="1"
                  value={newMaxUsage}
                  onChange={(e) => setNewMaxUsage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Target Kampus</label>
                <input
                  type="text"
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value)}
                  placeholder="ALL / USU / POLMED"
                  className="mt-1 w-full uppercase rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-600 active:opacity-85 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Membuat..." : "Buat Kode Voucher Baru"}
            </button>
          </form>

          {/* Vouchers List */}
          <div className="mt-5 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-700">Voucher Aktif ({vouchers.length})</p>
            <div className="mt-2 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {vouchers.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Belum ada kode voucher yang dibuat.</p>
              ) : (
                vouchers.map((v) => (
                  <div key={v.id || v.code} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-emerald-950">{v.code}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {v.discountType === "percentage" ? `${v.discountValue}% OFF` : `Potongan ${rupiah(v.discountValue)}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Dipakai: {v.usageCount || 0} / {v.maxUsage} · Kampus: {v.campus || "Semua"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVoucher(v.id, v.code)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Potential Leakage / Pending Fee Monitor */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-black text-slate-900">Audit Kebocoran & Tagihan Pending</h2>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
              {recon?.potentialLeakage?.length || 0} transaksi
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Daftar tagihan yang dibuat namun belum terkonfirmasi pelunasannya oleh gateway. Pastikan tidak ada penjual yang sudah aktif sebelum biaya diselesaikan.
          </p>

          <div className="mt-4 divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {(!recon?.potentialLeakage || recon.potentialLeakage.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Semua transaksi terverifikasi rapi. Tidak ada kebocoran terdeteksi.
              </div>
            ) : (
              recon.potentialLeakage.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      ID: <span className="font-mono">{String(item.id).slice(0, 8)}</span> · {item.type}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-amber-900">{rupiah(item.amount || 0)}</p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      pending
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
