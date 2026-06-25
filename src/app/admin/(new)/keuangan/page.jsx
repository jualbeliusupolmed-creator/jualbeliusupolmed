"use client";

import { useEffect, useState } from "react";

const TYPES = ["iklan", "bump", "featured", "sold_fee", "subscribe", "renewal", "autobump", "sponsored", "wanted"];
const TYPE_LABEL = {
  iklan: "Iklan Baru", bump: "Bump", featured: "Featured", sold_fee: "Biaya Jual",
  subscribe: "Langganan PRO", renewal: "Perpanjang", autobump: "AutoBump",
  sponsored: "Sponsored", wanted: "Cari Barang",
};

function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function exportCsv(rows, headers, filename) {
  const lines = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function KeuanganPage() {
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/keuangan")
      .then((r) => r.json())
      .then((d) => { setPayments(d.payments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      </div>
    );
  }

  if (!payments) {
    return <p className="text-red-500">Gagal memuat data keuangan.</p>;
  }

  // Build last 12 months
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const monthlyData = months.map((month) => {
    const mp = payments.filter((p) => p.created_at.slice(0, 7) === month);
    const total = mp.reduce((s, p) => s + (p.amount || 0), 0);
    const byType = {};
    for (const p of mp) {
      byType[p.type] = (byType[p.type] || 0) + (p.amount || 0);
    }
    return { month, total, count: mp.length, byType };
  });

  const grandTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonth = monthlyData[monthlyData.length - 1].total;
  const lastMonth = monthlyData[monthlyData.length - 2].total;
  const growth = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null;

  const maxTotal = Math.max(1, ...monthlyData.map((m) => m.total));

  const totalByType = {};
  for (const p of payments) {
    totalByType[p.type] = (totalByType[p.type] || 0) + (p.amount || 0);
  }

  function handleExportCsv() {
    const headers = ["Bulan", "Total", "Jumlah Transaksi", ...TYPES.map((t) => TYPE_LABEL[t] || t)];
    const rows = monthlyData.map((m) => [
      m.month,
      m.total,
      m.count,
      ...TYPES.map((t) => m.byType[t] || 0),
    ]);
    exportCsv(rows, headers, `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold dark:text-white">Laporan Keuangan</h1>
          <p className="mt-0.5 text-sm text-gray-400">Pendapatan marketplace (pembayaran terkonfirmasi)</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</p>
          <p className="mt-1 text-2xl font-black dark:text-white">{rupiah(grandTotal)}</p>
          <p className="text-xs text-gray-400">{payments.length} transaksi</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Bulan Ini</p>
          <p className="mt-1 text-2xl font-black dark:text-white">{rupiah(thisMonth)}</p>
          {growth !== null && (
            <p className={`text-xs font-medium ${Number(growth) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {Number(growth) >= 0 ? "▲" : "▼"} {Math.abs(Number(growth))}% vs bulan lalu
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Bulan Lalu</p>
          <p className="mt-1 text-2xl font-black dark:text-white">{rupiah(lastMonth)}</p>
        </div>
      </div>

      {/* Revenue per tipe */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h3 className="mb-4 text-sm font-bold dark:text-white">Breakdown per Tipe</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TYPES.filter((t) => totalByType[t] > 0).sort((a, b) => (totalByType[b] || 0) - (totalByType[a] || 0)).map((t) => (
            <div key={t} className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs text-gray-400">{TYPE_LABEL[t] || t}</p>
              <p className="mt-1 font-bold dark:text-white">{rupiah(totalByType[t])}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart bulanan */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <h3 className="mb-4 text-sm font-bold dark:text-white">Revenue 12 Bulan</h3>
        <div className="flex h-36 items-end gap-1">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-gray-900 transition-all hover:bg-gray-700 dark:bg-slate-200 dark:hover:bg-white"
                style={{ height: `${(m.total / maxTotal) * 100}%`, minHeight: m.total > 0 ? "4px" : "0" }}
                title={`${m.month}: ${rupiah(m.total)} (${m.count} transaksi)`}
              />
              <span className="mt-1 text-[9px] text-gray-400">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabel detail */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Bulan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Transaksi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
                {TYPES.filter((t) => totalByType[t] > 0).map((t) => (
                  <th key={t} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                    {TYPE_LABEL[t] || t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {[...monthlyData].reverse().map((m) => (
                <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium dark:text-white">{m.month}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{m.count}</td>
                  <td className="px-4 py-3 text-right font-semibold dark:text-white">{rupiah(m.total)}</td>
                  {TYPES.filter((t) => totalByType[t] > 0).map((t) => (
                    <td key={t} className="px-4 py-3 text-right text-gray-500 dark:text-slate-400">
                      {m.byType[t] ? rupiah(m.byType[t]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
