"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { downloadCSV } from "@/lib/csv";
import { PageHeader } from "@/components/admin/ui";

const PAYMENT_TYPES = ["iklan", "bump", "featured", "sold_fee", "subscribe", "renewal", "autobump", "sponsored", "wanted"];
const PAYMENT_STATUS = ["pending", "paid", "failed", "expired"];
const PAGE = 25;

function StatusBadge({ s }) {
  const map = {
    pending: { color: "text-amber-700", bg: "bg-amber-100", label: "Pending" },
    paid: { color: "text-green-700", bg: "bg-green-100", label: "Lunas" },
    failed: { color: "text-rose-700", bg: "bg-rose-100", label: "Gagal" },
    expired: { color: "text-gray-700", bg: "bg-gray-200", label: "Kedaluwarsa" },
  };
  const d = map[s] || { color: "text-gray-700", bg: "bg-gray-100", label: s };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${d.bg} ${d.color}`}>
      {d.label}
    </span>
  );
}

function LoadMore({ shown, total, onClick }) {
  if (shown >= total) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button onClick={onClick} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
        Tampilkan Lebih Banyak ({shown} dari {total})
      </button>
    </div>
  );
}

export default function TransaksiClient({ initialPayments = [] }) {
  const router = useRouter();
  
  const [payType, setPayType] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [paySearch, setPaySearch] = useState("");
  const [payLimit, setPayLimit] = useState(PAGE);
  
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredPayments = useMemo(() => {
    return initialPayments.filter((p) =>
      (payType === "all" || p.type === payType) &&
      (payStatus === "all" || p.status === payStatus) &&
      (!paySearch || (p.midtrans_order_id || "").toLowerCase().includes(paySearch.toLowerCase()))
    );
  }, [initialPayments, payType, payStatus, paySearch]);

  async function action(body, okMsg) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const paidOnly = filteredPayments.filter(p => p.status === "paid");
  const totalPaid = paidOnly.reduce((s, p) => s + (p.amount || 0), 0);
  const byType = PAYMENT_TYPES.reduce((acc, t) => {
    const sum = paidOnly.filter(p => p.type === t).reduce((s, p) => s + (p.amount || 0), 0);
    if (sum > 0) acc[t] = sum;
    return acc;
  }, {});

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Transaksi" />

      <div className="mb-3 flex flex-wrap gap-2">
        <input 
          className="g-input min-w-[160px] flex-1" 
          placeholder="Cari Order ID…" 
          value={paySearch} 
          onChange={(e) => { setPaySearch(e.target.value); setPayLimit(PAGE); }} 
        />
        <select className="g-input w-auto" value={payType} onChange={(e) => setPayType(e.target.value)}>
          <option value="all">Semua tipe</option>
          {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="g-input w-auto" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
          <option value="all">Semua status</option>
          {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => downloadCSV("transaksi.csv", filteredPayments.map((p) => ({
            order_id: p.midtrans_order_id || p.id, tipe: p.type, jumlah: p.amount, status: p.status, listing_id: p.listing_id || "", dibuat: p.created_at,
          })))}
          className="g-btn g-btn-outlined"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Total Lunas</p>
          <p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">{rupiah(totalPaid)}</p>
          <p className="mt-1 text-[10px] font-medium text-gray-500">{paidOnly.length} transaksi</p>
        </div>
        {Object.entries(byType).map(([t, sum]) => (
          <div key={t} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t}</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{rupiah(sum)}</p>
          </div>
        ))}
      </div>

      <p className="mb-2 text-xs" style={{ color: "var(--g-ink-soft)" }}>{filteredPayments.length} transaksi</p>

      <div className="g-table-wrap">
        <table className="g-table min-w-[700px]">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Tipe</th>
              <th>Jumlah</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.slice(0, payLimit).map((p) => (
              <tr key={p.id}>
                <td className="max-w-[160px] truncate font-mono text-[11px]">{p.midtrans_order_id || p.id.slice(0, 8)}</td>
                <td className="capitalize font-medium">{p.type}</td>
                <td className="font-semibold text-emerald-600 dark:text-emerald-400">{rupiah(p.amount)}</td>
                <td><StatusBadge s={p.status} /></td>
                <td className="text-xs" style={{ color: "var(--g-ink-soft)" }}>{new Date(p.created_at).toLocaleDateString("id-ID")}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {p.status !== "paid" && (
                      <button onClick={() => { if(window.confirm("Tandai lunas?")) action({ action: "update_payment", id: p.id, status: "paid" }, "Ditandai paid") }} className="g-btn g-btn-sm" style={{ background: "var(--g-green-soft)", color: "var(--g-green)" }}>
                        Paid
                      </button>
                    )}
                    {p.status !== "failed" && (
                      <button onClick={() => { if(window.confirm("Tandai gagal?")) action({ action: "update_payment", id: p.id, status: "failed" }, "Ditandai failed") }} className="g-btn g-btn-sm" style={{ background: "var(--g-yellow-soft)", color: "var(--g-yellow-dark)" }}>
                        Failed
                      </button>
                    )}
                    <button onClick={() => { if(window.confirm("Hapus transaksi?")) action({ action: "delete_payment", id: p.id }, "Dihapus") }} className="g-btn g-btn-sm g-btn-danger">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="g-empty" style={{ border: 0 }}>
            <p className="g-empty-title">Tidak ada transaksi yang cocok</p>
          </div>
        )}
      </div>
      <LoadMore shown={Math.min(payLimit, filteredPayments.length)} total={filteredPayments.length} onClick={() => setPayLimit((n) => n + PAGE)} />
    </div>
  );
}
