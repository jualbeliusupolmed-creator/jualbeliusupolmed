"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import { countSumutOwners, summarizeSumutAccounts } from "@/lib/sumutOperationalReadiness";

const endpoints = [
  ["owners", "/api/admin/owners"],
  ["social", "/api/admin/social/accounts"],
  ["whatsapp", "/api/admin/whatsapp/channels"],
  ["commerce", "/api/admin/analytics/commerce"],
];

async function loadEndpoint(url) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "Tidak dapat memuat data."), { status: response.status });
  return body;
}

function Card({ label, value, detail, tone = "emerald" }) {
  const colors = tone === "amber" ? "bg-amber-50 text-amber-800" : tone === "blue" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-900";
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value ?? "—"}</p><p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${colors}`}>{detail}</p></div>;
}

export default function SumutOperationalReadiness() {
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(endpoints.map(async ([key, url]) => {
      try { return [key, await loadEndpoint(url), null]; }
      catch (error) { return [key, null, { message: error.message, status: error.status }]; }
    }));
    setResponses(Object.fromEntries(results.filter(([, data]) => data).map(([key, data]) => [key, data])));
    setErrors(Object.fromEntries(results.filter(([, , error]) => error).map(([key, , error]) => [key, error])));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const data = useMemo(() => {
    const scopeIds = responses.commerce?.universityScopeIds || [];
    const accounts = summarizeSumutAccounts(responses.social?.accounts, responses.whatsapp?.accounts, scopeIds);
    const metrics = responses.commerce?.counts || {};
    return {
      provinceName: responses.commerce?.provinceName || "Sumatera Utara",
      universities: responses.commerce?.universityCount,
      owners: countSumutOwners(responses.owners?.owners, scopeIds),
      ownerCountAvailable: Boolean(responses.owners),
      ...accounts,
      gatewayOnline: Boolean(responses.whatsapp?.stats?.gatewayOnline),
      metrics,
    };
  }, [responses]);

  const commerceError = errors.commerce;
  const ownerRestricted = errors.owners?.status === 403;
  const failedCount = Object.keys(errors).filter((key) => !(key === "owners" && ownerRestricted)).length;

  return <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-800"><Activity className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-slate-950">Kesiapan live · {data.provinceName}</h2><p className="mt-1 text-xs text-slate-600">Angka langsung dari panel. Tidak memuat email, nomor telepon, ID akun, atau token.</p></div></div>
      <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 hover:border-emerald-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Memuat…" : "Perbarui data"}</button>
    </div>
    {failedCount > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">Sebagian data belum dapat dimuat. Coba perbarui; angka yang gagal dimuat tidak dianggap nol.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Universitas dalam cakupan" value={responses.commerce ? data.universities : "—"} detail={responses.commerce ? "Universitas aktif sesuai akses" : "Data katalog belum tersedia"} />
      <Card label="Admin/owner aktif" value={data.ownerCountAvailable ? data.owners : ownerRestricted ? "Terbatas" : "—"} detail={data.ownerCountAvailable ? "Scope Sumut cocok" : ownerRestricted ? "Daftar nama khusus superadmin" : "Data owner belum tersedia"} tone="blue" />
      <Card label="Akun Instagram" value={responses.social ? `${data.instagramConnected}/${data.instagramTotal}` : "—"} detail={responses.social ? "Terhubung dan token tersedia / akun aktif" : "Data akun sosial belum tersedia"} />
      <Card label="Grup/kanal WhatsApp" value={responses.whatsapp ? `${data.whatsappLive}/${data.whatsappTotal}` : "—"} detail={responses.whatsapp ? data.gatewayOnline ? "Ditemukan di gateway / akun aktif" : "Gateway belum tersambung" : "Data WhatsApp belum tersedia"} tone={data.gatewayOnline ? "emerald" : "amber"} />
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Kontak tercatat · 30 hari" value={commerceError ? "—" : data.metrics.contactAttempts ?? "—"} detail="Permintaan kontak, bukan chat terbukti" tone="blue" />
      <Card label="Konfirmasi DEAL" value={commerceError ? "—" : data.metrics.sellerReportedDeal ?? "—"} detail="Dilaporkan penjual lewat WA" />
      <Card label="Konfirmasi GAGAL" value={commerceError ? "—" : data.metrics.sellerReportedFailed ?? "—"} detail="Dilaporkan penjual lewat WA" tone="amber" />
      <Card label="Listing terjual" value={commerceError ? "—" : data.metrics.soldListings ?? "—"} detail="Status listing; bukan bukti pembayaran" />
    </div>
    <div className="flex flex-wrap gap-2 border-t border-emerald-200 pt-3">
      <Link href="/admin/organization" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-emerald-900">Katalog wilayah <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      <Link href="/admin/owners" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-emerald-900"><ShieldCheck className="h-3.5 w-3.5" />Kelola admin <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      <Link href="/admin/social" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-emerald-900">Akun sosial <ArrowUpRight className="h-3.5 w-3.5" /></Link>
    </div>
  </section>;
}
