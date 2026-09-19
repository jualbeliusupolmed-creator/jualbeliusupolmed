"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner"; // Using sonner which is in package.json

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "baru saja";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function TabInstagram() {
  const [data, setData] = useState({ stats: {}, items: [] });
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Otomatisasi: Jika ada antrean 'queued' atau 'processing', refresh otomatis tiap 4 detik
  useEffect(() => {
    const hasActiveQueue = (data.stats?.queued || 0) > 0 || (data.stats?.processing || 0) > 0;
    if (!hasActiveQueue) return;

    const timer = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(timer);
  }, [data.stats?.queued, data.stats?.processing]);

  const fetchData = async (options = {}) => {
    const silent = options === true || options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/instagram");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      if (json.ok) {
        setData({ stats: json.stats, items: json.items });
        // Jika ada yang queued dan belum sedang diproses, jalankan otomatis di latar belakang
        if (json.stats?.queued > 0 && !autoProcessing) {
          triggerAutoProcess();
        }
      }
    } catch (err) {
      if (!silent) toast.error(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const triggerAutoProcess = async () => {
    setAutoProcessing(true);
    try {
      const res = await fetch("/api/admin/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_queue" }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok) {
        fetchData({ silent: true });
      }
    } catch (_) {
    } finally {
      setAutoProcessing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!confirm("Reset semua antrean yang gagal menjadi Queued?")) return;
    setLoadingAction(true);
    try {
      const res = await fetch("/api/admin/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_failed" }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message);
        fetchData();
      } else {
        toast.error(json.error || "Gagal melakukan retry");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      queued: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || "bg-slate-100 text-slate-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Antrean Instagram</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {autoProcessing ? "Mengunggah Otomatis…" : "Otomatisasi Aktif"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {autoProcessing 
              ? "Sistem sedang memproses antrean ke Instagram di latar belakang secara otomatis..."
              : "Postingan Menfess dan Katalog otomatis diproses langsung ke Instagram Meta API."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
          <button
            onClick={async () => {
              setLoadingAction(true);
              try {
                const res = await fetch("/api/admin/instagram", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "process_queue" }),
                });
                const json = await res.json();
                if (json.ok) {
                  toast.success(json.message);
                  fetchData();
                } else {
                  toast.error(json.error || "Gagal memproses antrean");
                }
              } catch (err) {
                toast.error(err.message);
              } finally {
                setLoadingAction(false);
              }
            }}
            disabled={loadingAction || !data.stats?.queued}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAction ? "Memproses..." : `Proses Antrean (${data.stats?.queued || 0})`}
          </button>
          <button
            onClick={handleRetryFailed}
            disabled={loadingAction || !data.stats?.failed}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loadingAction ? "Memproses..." : `Retry Failed (${data.stats?.failed || 0})`}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tertunda (Queued)", value: data.stats?.queued || 0, color: "text-amber-500" },
          { label: "Diproses", value: data.stats?.processing || 0, color: "text-blue-500" },
          { label: "Berhasil", value: data.stats?.published || 0, color: "text-emerald-500" },
          { label: "Gagal", value: data.stats?.failed || 0, color: "text-red-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-black mt-2 ${stat.color}`}>
              {loading ? "-" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Tipe / Sumber</th>
                <th className="px-6 py-4">Judul / Pengirim</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Percobaan</th>
                <th className="px-6 py-4">Pembaruan Terakhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Tidak ada riwayat antrean.</td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={`${item.source}-${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{item.source}</span>
                        <span className="text-xs text-slate-500 font-mono mt-1" title={item.post_id || item.listing_id}>
                          {(item.post_id || item.listing_id || "").slice(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={item.title}>
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{item.detail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {statusBadge(item.status)}
                        {item.last_error && (
                          <span className="text-[10px] text-red-500 max-w-[200px] leading-tight truncate" title={item.last_error}>
                            {item.last_error}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {item.attempts}x
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="whitespace-nowrap">
                        {formatRelativeTime(item.updated_at)}
                      </div>
                      <div className="text-[10px] opacity-70 mt-1">
                        {formatDate(item.updated_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(item.status === "queued" || item.status === "failed") && (
                        <button
                          disabled={loadingAction}
                          onClick={async () => {
                            const toastId = toast.loading("Memproses " + item.title + "...");
                            try {
                              const res = await fetch("/api/admin/instagram", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "process_single",
                                  source: item.source,
                                  id: item.post_id || item.listing_id
                                }),
                              });
                              const json = await res.json();
                              if (json.ok) {
                                toast.success(json.message || "Berhasil diproses!", { id: toastId });
                              } else {
                                toast.error(json.error || "Gagal memproses", { id: toastId });
                              }
                            } catch (err) {
                              toast.error(err.message, { id: toastId });
                            } finally {
                              fetchData();
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Proses
                        </button>
                      )}
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
