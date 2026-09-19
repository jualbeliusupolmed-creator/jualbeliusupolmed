"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel, Stat, StatGrid, TableWrap } from "@/components/admin/ui";
import { useBasisApi } from "@/components/admin/basis";

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
  const api = useBasisApi();
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/keuangan`)
      .then((r) => r.json())
      .then((d) => { setPayments(d.payments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [api]);

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
      <PageHeader
        title="Laporan Keuangan"
        description="Pendapatan marketplace dari pembayaran yang sudah terkonfirmasi."
        actions={<button onClick={handleExportCsv} className="btn-outline text-sm">⬇ Export CSV</button>}
      />

      {/* KPI Cards */}
      <StatGrid>
        <Stat label="Total Revenue" value={rupiah(grandTotal)} sub={`${payments.length} transaksi`} />
        <Stat
          label="Bulan Ini"
          value={rupiah(thisMonth)}
          sub={growth !== null ? `${Number(growth) >= 0 ? "▲" : "▼"} ${Math.abs(Number(growth))}% vs bulan lalu` : null}
          tone={growth !== null ? (Number(growth) >= 0 ? "ok" : "bad") : ""}
        />
        <Stat label="Bulan Lalu" value={rupiah(lastMonth)} />
      </StatGrid>

      {/* Revenue per tipe */}
      <Panel title="Breakdown per Tipe">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TYPES.filter((t) => totalByType[t] > 0).sort((a, b) => (totalByType[b] || 0) - (totalByType[a] || 0)).map((t) => (
            <Stat key={t} label={TYPE_LABEL[t] || t} value={rupiah(totalByType[t])} />
          ))}
        </div>
      </Panel>

      {/* Bar chart bulanan */}
      <Panel title="Revenue 12 Bulan">
        <div className="flex h-36 items-end gap-1">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-gray-900 transition-all hover:bg-gray-700 dark:bg-slate-200 dark:hover:bg-white"
                style={{ height: `${(m.total / maxTotal) * 100}%`, minHeight: m.total > 0 ? "4px" : "0" }}
                title={`${m.month}: ${rupiah(m.total)} (${m.count} transaksi)`}
              />
              <span className="text-meta text-gray-400 mt-1">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Tabel detail */}
      <Panel title="Rincian per Bulan" padded={false}>
        <TableWrap>
          <thead>
            <tr>
              <th>Bulan</th>
              <th className="text-right">Transaksi</th>
              <th className="text-right">Total</th>
              {TYPES.filter((t) => totalByType[t] > 0).map((t) => (
                <th key={t} className="text-right whitespace-nowrap">{TYPE_LABEL[t] || t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...monthlyData].reverse().map((m) => (
              <tr key={m.month}>
                <td className="font-medium">{m.month}</td>
                <td className="text-right text-gray-400">{m.count}</td>
                <td className="text-right font-semibold">{rupiah(m.total)}</td>
                {TYPES.filter((t) => totalByType[t] > 0).map((t) => (
                  <td key={t} className="text-right">
                    {m.byType[t] ? rupiah(m.byType[t]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Panel>
    </div>
  );
}
