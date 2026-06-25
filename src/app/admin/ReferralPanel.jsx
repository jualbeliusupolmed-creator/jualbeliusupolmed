"use client";
import { useEffect, useState } from "react";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Badge({ status }) {
  const cls = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    rewarded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    expired: "bg-gray-100 text-gray-500 dark:bg-slate-800",
  }[status] || "bg-gray-100 text-gray-500";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{status || "-"}</span>;
}

export default function ReferralPanel({ action }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/referrals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setReferrals(json.referrals || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = referrals.filter(r => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (r.referrer_wa || "").includes(lower) || (r.referred_wa || "").includes(lower) || (r.status || "").includes(lower);
  });

  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === "pending").length,
    rewarded: referrals.filter(r => r.status === "rewarded").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Total", stats.total, "text-gray-700 dark:text-slate-200"], ["Pending", stats.pending, "text-yellow-600"], ["Tereward", stats.rewarded, "text-green-600"]].map(([l, v, cls]) => (
          <div key={l} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-center">
            <div className={`text-2xl font-bold ${cls}`}>{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Cari nomor WA atau status..." value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={load} className="btn-outline px-4">Refresh</button>
      </div>

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {["Referrer (Pengundang)", "Referred (Diundang)", "Status", "Dibuat", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Tidak ada data referral</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs">{r.referrer_wa || "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.referred_wa || "-"}</td>
                  <td className="px-3 py-2"><Badge status={r.status} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {r.status === "pending" && (
                        <button
                          onClick={() => action({ action: "resolve_referral", id: r.id }, "Referral ditandai tereward").then(load)}
                          className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        >
                          Tandai Reward
                        </button>
                      )}
                      {r.referrer_wa && (
                        <button
                          onClick={() => action({ action: "award_bumps", wa: r.referrer_wa, count: 1 }, "1 free bump diberikan ke referrer").then(load)}
                          className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          +1 Bump
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">Menampilkan {filtered.length} dari {referrals.length} referral</p>
    </div>
  );
}
