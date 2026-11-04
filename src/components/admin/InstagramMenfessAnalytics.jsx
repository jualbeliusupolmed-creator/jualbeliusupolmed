"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

const EMPTY_ANALYTICS = {
  summary: { received: 0, activeSenders: 0, newSenders: 0, returningSenders: 0 },
  daily: [],
  hourly: [],
  weekdays: [],
  accountOptions: [],
  selectedAccountId: null,
};

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function todayInJakarta() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function DistributionBars({ title, items, labelFor, emptyText }) {
  const maximum = Math.max(1, ...items.map((item) => item.total));
  const hasData = items.some((item) => item.total > 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {!hasData ? (
        <p className="mt-5 text-xs text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={labelFor(item)} className="grid grid-cols-[52px_1fr_32px] items-center gap-3">
              <span className="text-xs font-medium text-slate-500">{labelFor(item)}</span>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="meter"
                aria-label={`${labelFor(item)}: ${formatNumber(item.total)}`}
                aria-valuemin={0}
                aria-valuemax={maximum}
                aria-valuenow={item.total}
              >
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(item.total / maximum) * 100}%` }}
                />
              </div>
              <span className="text-right text-xs font-bold tabular-nums text-slate-700">
                {formatNumber(item.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function InstagramMenfessAnalytics() {
  const [period, setPeriod] = useState("7d");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (period === "custom" && (!appliedRange?.from || !appliedRange?.to)) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ period });
    if (accountId) params.set("accountId", accountId);
    if (period === "custom") {
      params.set("from", appliedRange.from);
      params.set("to", appliedRange.to);
    }

    setLoading(true);
    setError("");
    fetch(`/api/admin/social/menfess-analytics?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Analitik Menfess belum dapat dimuat.");
        }
        setAnalytics(payload);
        if (payload.dateRange) {
          setFrom(payload.dateRange.from);
          setTo(payload.dateRange.to);
        }
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message || "Analitik Menfess belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [period, accountId, appliedRange, reloadKey]);

  const summary = analytics.summary || EMPTY_ANALYTICS.summary;
  const dailyMaximum = Math.max(1, ...analytics.daily.map((item) => item.total));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2 className="text-lg font-black text-slate-900">Analitik Menfess Instagram</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Ringkasan hanya menghitung DM Menfess yang berhasil diproses. Pengirim baru berarti belum tercatat sebelum periode ini; isi pesan dan identitas tidak ditampilkan.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[11px] font-bold text-slate-500">
            Akun Instagram
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="h-9 min-w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
            >
              <option value="">Semua akun dalam cakupan Anda</option>
              {analytics.accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.handle ? `@${account.handle.replace(/^@/, "")}` : "Akun Instagram"}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] font-bold text-slate-500">
            Periode
            <select
              value={period}
              onChange={(event) => {
                const nextPeriod = event.target.value;
                if (nextPeriod === "custom") {
                  const today = todayInJakarta();
                  const initialRange = { from: from || today, to: to || today };
                  setFrom(initialRange.from);
                  setTo(initialRange.to);
                  setAppliedRange(initialRange);
                }
                setPeriod(nextPeriod);
              }}
              className="h-9 min-w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
            >
              <option value="today">Hari ini</option>
              <option value="7d">7 hari</option>
              <option value="30d">30 hari</option>
              <option value="custom">Rentang kustom</option>
            </select>
          </label>
          {period === "custom" && (
            <>
              <label className="grid gap-1 text-[11px] font-bold text-slate-500">
                Dari
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700"
                />
              </label>
              <label className="grid gap-1 text-[11px] font-bold text-slate-500">
                Sampai
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700"
                />
              </label>
              <button
                type="button"
                onClick={() => setAppliedRange({ from, to })}
                disabled={!from || !to || loading}
                className="h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Terapkan
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            aria-label="Segarkan analitik"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {period === "custom" && analytics.dateRange && (
        <p className="text-xs text-slate-500">
          Zona waktu Asia/Jakarta · maksimal 90 hari · {formatDate(analytics.dateRange.from)}–{formatDate(analytics.dateRange.to)}
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {analytics.truncated && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Data periode ini melebihi 5.000 event; angka yang ditampilkan mungkin belum mencakup semuanya.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Menfess diproses", summary.received],
          ["Pengirim aktif", summary.activeSenders],
          ["Pengirim baru", summary.newSenders],
          ["Pengirim berulang", summary.returningSenders],
        ].map(([label, total]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
              {loading ? "…" : formatNumber(total)}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tren Menfess harian</h3>
            <p className="mt-1 text-xs text-slate-500">Jumlah event Menfess yang tercatat setiap hari.</p>
          </div>
          {analytics.dateRange && (
            <span className="text-[11px] font-medium text-slate-400">
              {analytics.dateRange.days} hari · WIB
            </span>
          )}
        </div>
        {analytics.daily.length > 0 ? (
          <div className="mt-5 overflow-x-auto pb-2">
            <div className="flex min-w-max items-end gap-2" role="img" aria-label="Grafik tren Menfess harian">
              {analytics.daily.map((item) => (
                <div key={item.date} className="flex w-8 flex-col items-center gap-2">
                  <span className="text-[10px] tabular-nums text-slate-500">{item.total || ""}</span>
                  <div className="flex h-24 w-full items-end rounded-t-md bg-slate-50">
                    <div
                      className="w-full rounded-t-md bg-indigo-500"
                      style={{ height: `${item.total ? Math.max(5, (item.total / dailyMaximum) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 text-xs text-slate-500">{loading ? "Memuat tren…" : "Belum ada data pada periode ini."}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionBars
          title="Waktu pengiriman (WIB)"
          items={analytics.hourly}
          labelFor={(item) => `${String(item.hour).padStart(2, "0")}.00`}
          emptyText={loading ? "Memuat distribusi…" : "Belum ada data pada periode ini."}
        />
        <DistributionBars
          title="Hari pengiriman"
          items={analytics.weekdays}
          labelFor={(item) => item.day}
          emptyText={loading ? "Memuat distribusi…" : "Belum ada data pada periode ini."}
        />
      </div>
    </div>
  );
}
