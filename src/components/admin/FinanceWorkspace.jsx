"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, CreditCard, LoaderCircle, RefreshCw, WalletCards } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { SETTLEABLE_PAYMENT_TYPES } from "@/lib/admin-finance-policy";

const PERIODS = [[7, "7 hari"], [30, "30 hari"], [90, "90 hari"], [365, "1 tahun"]];
const APPROVABLE_TYPES = new Set(SETTLEABLE_PAYMENT_TYPES);
const money = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

function approvalConsequence(payment) {
  if (payment.requiresUnlockApproval) return "Persetujuan akan mengirim detail kontak pencari kepada pemohon lewat WhatsApp.";
  const consequences = {
    iklan: "Persetujuan akan mengaktifkan iklan dan dapat mengirim pemberitahuan WhatsApp, grup, serta Instagram.",
    bump: "Persetujuan akan menaikkan iklan.",
    featured: "Persetujuan akan mengaktifkan sorotan iklan.",
    autobump: "Persetujuan akan mengaktifkan jadwal naik otomatis.",
    subscribe: "Persetujuan akan mengaktifkan paket Pro penjual.",
    sold_fee: "Persetujuan akan menandai iklan sebagai terjual.",
    renewal: "Persetujuan akan mengaktifkan kembali dan memperpanjang masa tayang iklan.",
    sponsored: "Persetujuan akan mengaktifkan label sponsor pada iklan.",
  };
  return consequences[payment.type] || "Tipe pembayaran ini tidak dapat disetujui dari workspace.";
}

export default function FinanceWorkspace({ canManage = false, initialOrderId = "" }) {
  const [days, setDays] = useState(initialOrderId ? 365 : 30);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState(initialOrderId);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState({ payments: [], summary: { paidAmount: 0, paidCount: 0 }, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (period) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/finance?days=" + period, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Transaksi gagal dimuat.");
      setData(body);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(days); }, [days, load]);

  const statusLabel = { paid: "Lunas", pending: "Menunggu", failed: "Gagal", cancelled: "Dibatalkan", expired: "Kedaluwarsa" };
  const visiblePayments = data.payments.filter((payment) =>
    (type === "all" || payment.type === type) &&
    (status === "all" || payment.status === status) &&
    (!query.trim() || `${payment.id} ${payment.midtrans_order_id || ""} ${payment.listing?.title || ""} ${payment.type || ""}`.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const paidPayments = visiblePayments.filter((payment) => payment.status === "paid");
  const paidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);

  async function updatePayment(payment, status) {
    const unlock = payment.requiresUnlockApproval;
    const consequence = approvalConsequence(payment);
    const prompt = status === "paid"
      ? "Setujui pembayaran " + (payment.midtrans_order_id || payment.id) + "? " + consequence
      : "Tandai pembayaran " + (payment.midtrans_order_id || payment.id) + " sebagai gagal?";
    if (!window.confirm(prompt)) return;
    setBusyId(payment.id);
    setError("");
    setNotice("");
    try {
      const payload = unlock && status === "paid"
        ? { action: "approve_unlock_manual", payment_id: payment.id }
        : { action: "update_payment", id: payment.id, status };
      const response = await fetch("/api/admin/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Pembayaran gagal diperbarui.");
      setNotice(body.warning || (status === "paid" ? "Pembayaran disetujui dan layanan diproses." : "Pembayaran ditandai gagal."));
      await load(days);
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }
  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Transaksi dan keuangan</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Riwayat pembayaran yang terhubung dengan iklan dalam cakupan akun.</p></div><button onClick={() => load(days)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button></header>
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="text-sm font-black">Pembayaran tercatat</h3><p className="mt-1 text-[11px] text-slate-500">{data.total.toLocaleString("id-ID")} transaksi dalam periode terpilih</p></div><div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">{PERIODS.map(([value, label]) => <button key={value} onClick={() => setDays(value)} aria-pressed={days === value} className={`min-h-8 rounded-full px-3 text-[11px] font-extrabold ${days === value ? "bg-white text-emerald-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div></div>
      <div className="grid gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-2"><div className="flex items-center gap-3 bg-white px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><WalletCards className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Nilai pembayaran lunas pada hasil</p><p className="mt-0.5 text-lg font-black tabular-nums">{money(paidAmount)}</p></div></div><div className="flex items-center gap-3 bg-white px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><CreditCard className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Transaksi lunas pada hasil</p><p className="mt-0.5 text-lg font-black tabular-nums">{paidPayments.length.toLocaleString("id-ID")}</p></div></div></div>
      <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row"><input aria-label="Cari transaksi" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari iklan atau ID transaksi" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600" /><select aria-label="Filter jenis transaksi" value={type} onChange={(event) => setType(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><option value="all">Semua jenis</option>{[...new Set(data.payments.map((payment) => payment.type).filter(Boolean))].map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter status transaksi" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"><option value="all">Semua status</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={() => downloadCSV("transaksi.csv", visiblePayments.map((payment) => ({ tanggal: payment.created_at, order_id: payment.midtrans_order_id || payment.id, judul: payment.listing?.title || "Pembayaran platform", tipe: payment.type, kampus: payment.listing?.campus || "", nilai: payment.amount, status: payment.status })))} className="min-h-9 rounded-full border border-slate-200 px-3 text-[11px] font-extrabold text-slate-600 hover:border-emerald-300 hover:text-emerald-800">Unduh CSV</button></div>
      {notice ? <p role="status" className="border-t border-emerald-100 bg-emerald-50 px-5 py-2.5 text-[11px] font-bold text-emerald-800">{notice}</p> : null}
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#f8faf9] text-[10px] font-extrabold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Tanggal</th><th className="px-4 py-3">Iklan / Order ID</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Kampus</th><th className="px-4 py-3 text-right">Nilai</th><th className="px-5 py-3">Status</th>{canManage ? <th className="px-5 py-3">Tindakan</th> : null}</tr></thead><tbody className="divide-y divide-slate-100">{loading && !data.payments.length ? <tr><td colSpan={canManage ? 7 : 6} className="h-36 text-center text-slate-400"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr> : visiblePayments.length ? visiblePayments.map((payment) => <tr key={payment.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{new Date(payment.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td><td className="max-w-[260px] px-4 py-3.5"><p className="truncate font-bold text-slate-800">{payment.listing?.title || "Pembayaran platform"}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{payment.midtrans_order_id || payment.id}</p></td><td className="px-4 py-3.5 text-slate-600">{payment.type || "—"}</td><td className="px-4 py-3.5 text-slate-600">{payment.listing?.campus || "—"}</td><td className="whitespace-nowrap px-4 py-3.5 text-right font-extrabold tabular-nums">{money(payment.amount)}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${payment.status === "paid" ? "bg-emerald-50 text-emerald-800" : payment.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{statusLabel[payment.status] || payment.status}</span></td>{canManage ? <td className="px-5 py-3.5"><div className="flex gap-1.5">{payment.status === "pending" && (payment.type === "wanted" ? payment.requiresUnlockApproval : APPROVABLE_TYPES.has(payment.type)) ? <><button disabled={busyId === payment.id} onClick={() => updatePayment(payment, "paid")} className="min-h-8 rounded-full bg-emerald-800 px-3 text-[10px] font-extrabold text-white disabled:opacity-50">Setujui</button><button disabled={busyId === payment.id} onClick={() => updatePayment(payment, "failed")} className="min-h-8 rounded-full border border-slate-200 px-3 text-[10px] font-extrabold text-slate-600 disabled:opacity-50">Gagal</button></> : payment.status === "pending" ? <span className="text-[10px] text-slate-400">{payment.type === "wanted" ? "Data pembuka kontak tidak lengkap" : "Gunakan alur khusus pembayaran"}</span> : <span className="text-[10px] text-slate-400">—</span>}</div></td> : null}</tr>) : <tr><td colSpan={canManage ? 7 : 6} className="h-36 text-center text-sm font-semibold text-slate-400">Belum ada transaksi yang cocok dengan filter.</td></tr>}</tbody></table></div>
      {data.total > data.payments.length ? <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">Menampilkan 200 transaksi terbaru dari {data.total.toLocaleString("id-ID")} total pada periode ini. Ringkasan dan CSV mengikuti daftar yang dimuat.</p> : null}
    </section>
  </div>;
}
