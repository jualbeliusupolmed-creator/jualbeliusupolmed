"use client";

import { useEffect, useState } from "react";

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

const ACTION_LABEL = {
  activate: "Aktifkan iklan", suspend: "Suspend iklan", delete: "Hapus iklan",
  bulk: "Aksi bulk", feature: "Featured", unfeature: "Unfeature",
  bump_now: "Bump", update_listing: "Edit iklan", blacklist: "Blacklist",
  unblacklist: "Unblacklist", resolve_report: "Selesaikan laporan",
  delete_report: "Hapus laporan", delete_rating: "Hapus rating",
  resolve_wanted: "Selesaikan dicari", delete_wanted: "Hapus dicari",
  update_payment: "Update pembayaran", delete_payment: "Hapus pembayaran",
  approve_unlock_manual: "Approve unlock", category_upsert: "Upsert kategori",
  category_delete: "Hapus kategori", save_settings: "Simpan pengaturan",
  pause_bot: "Pause bot", unpause_bot: "Resume bot",
  update_seller_profile: "Edit profil penjual", delete_blog: "Hapus blog",
  set_sponsored: "Set sponsored", reset_pin: "Reset PIN",
  award_bumps: "Award bumps", delete_group_post: "Hapus group post",
  delete_subscription: "Hapus subscription", hide_rating: "Hide rating",
  show_rating: "Show rating", resolve_referral: "Resolve referral",
  approve_profile_change: "Setujui ubah profil", reject_profile_change: "Tolak ubah profil",
};

export default function AuditPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("logs");

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold dark:text-white">Audit Trail</h1>
        <p className="mt-0.5 text-sm text-gray-400">Log semua aksi admin dan error kritis</p>
      </div>

      <div className="flex gap-2">
        {[["logs", "Aksi Admin"], ["errors", "Error Log"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {label}
            {data && key === "errors" && data.errors.length > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                {data.errors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        </div>
      ) : tab === "logs" ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          {!data?.logs?.length ? (
            <div className="p-10 text-center">
              <p className="text-2xl">📋</p>
              <p className="mt-2 text-sm text-gray-400">Belum ada log. Data terekam setelah migration_logs.sql dijalankan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Aksi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Detail</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
                        <span className="font-medium dark:text-white">{ACTION_LABEL[log.action] || log.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 font-mono text-xs">
                        {log.target_id ? log.target_id.slice(0, 20) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap">{relTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          {!data?.errors?.length ? (
            <div className="p-10 text-center">
              <p className="text-2xl">✅</p>
              <p className="mt-2 text-sm text-gray-400">Tidak ada error tercatat. Sistem berjalan normal.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {data.errors.map((e) => (
                <div key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">{e.endpoint}</p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{e.error_message}</p>
                      {e.context && (
                        <p className="mt-1 font-mono text-xs text-gray-400">{JSON.stringify(e.context)}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{relTime(e.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
