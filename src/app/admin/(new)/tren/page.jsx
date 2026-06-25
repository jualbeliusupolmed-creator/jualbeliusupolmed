"use client";

import { useEffect, useState } from "react";

export default function TrenPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/tren?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const maxCount = data?.top?.[0]?.count || 1;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold dark:text-white">Tren Pencarian</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {data ? `${data.total.toLocaleString("id-ID")} pencarian` : "Memuat..."} dalam {days} hari terakhir
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value={7}>7 hari</option>
          <option value={30}>30 hari</option>
          <option value={90}>90 hari</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        </div>
      ) : !data?.top?.length ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-2xl">🔍</p>
          <p className="mt-2 text-sm text-gray-400">Belum ada data pencarian. Data mulai terekam setelah migration_logs.sql dijalankan.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Queries */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <h3 className="mb-4 text-sm font-bold dark:text-white">Top Pencarian</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {data.top.map((q, i) => (
                <div key={q.query}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium dark:text-white">
                      <span className="mr-2 text-gray-300 dark:text-slate-600">#{i + 1}</span>
                      {q.query}
                    </span>
                    <span className="text-xs text-gray-400">{q.count}×</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-gray-900 dark:bg-slate-200"
                      style={{ width: `${(q.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pencarian tanpa hasil — gap supply */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm dark:border-amber-900/30 dark:bg-amber-900/10">
            <h3 className="mb-1 text-sm font-bold text-amber-800 dark:text-amber-300">Gap Supply — 0 Hasil</h3>
            <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">Buyer cari ini tapi tidak ada iklan. Peluang supply!</p>
            {data.noResult.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">Semua pencarian punya hasil. </p>
            ) : (
              <div className="space-y-2">
                {data.noResult.map((q) => (
                  <div key={q.query} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-slate-900/40">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{q.query}</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">{q.count}× dicari</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
