"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "./AdminProvider";
import { Building2, Check, CircleAlert, Clock3, LoaderCircle, Mail, Plus, Send, ShieldCheck, X } from "lucide-react";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

const FIELD = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";
const STATUS = {
  pending: ["Menunggu persetujuan", "bg-amber-50 text-amber-800"],
  approved: ["Disetujui", "bg-emerald-50 text-emerald-800"],
  rejected: ["Ditolak", "bg-rose-50 text-rose-800"],
  cancelled: ["Dibatalkan", "bg-slate-100 text-slate-600"],
  expired: ["Kedaluwarsa", "bg-slate-100 text-slate-600"],
};

export default function AdminRequestsWorkspace() {
  const { confirmThen } = useAdmin();
  const [data, setData] = useState({ requests: [], provinces: [], universities: [], isSuperadmin: false, actorId: "" });
  const [form, setForm] = useState({ provinceId: "", universityId: "", name: "", email: "", note: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setData(await requestJson("/api/admin/admin-requests", { cache: "no-store" })); }
    catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const provinceOptions = useMemo(() => data.provinces, [data.provinces]);
  const universityOptions = useMemo(() => data.universities.filter((item) => !form.provinceId || item.province_id === form.provinceId), [data.universities, form.provinceId]);
  const provinceNames = useMemo(() => new Map(data.provinces.map((item) => [item.id, item.name])), [data.provinces]);
  const universityNames = useMemo(() => new Map(data.universities.map((item) => [item.id, item.name])), [data.universities]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      await requestJson("/api/admin/admin-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm((current) => ({ ...current, universityId: "", name: "", email: "", note: "" }));
      setNotice("Permintaan dikirim ke superadmin untuk ditinjau.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function decide(item, decision) {
    const approved = decision === "approved";
    confirmThen({
      title: approved ? "Setujui admin universitas?" : "Tolak permintaan?",
      message: approved
        ? `Undang ${item.requested_name} (${item.requested_email}) untuk mengelola ${universityNames.get(item.university_id) || "universitas ini"}? Supabase Auth akan mengirim tautan aktivasi.`
        : `Tolak permintaan Admin Universitas ${universityNames.get(item.university_id) || "ini"}?`,
      danger: !approved,
      confirmLabel: approved ? "Setujui & undang" : "Tolak permintaan",
    }, async () => {
      setBusyId(item.id); setError(""); setNotice("");
      try {
        const result = await requestJson("/api/admin/admin-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: item.id, decision }) });
        setNotice(approved ? (result.invitationSent ? "Permintaan disetujui dan tautan aktivasi dikirim melalui Supabase Auth." : "Permintaan disetujui. Akun Auth yang sudah ada mendapat akses universitas ini.") : "Permintaan ditolak.");
        await load();
      } catch (cause) { setError(cause.message); }
      finally { setBusyId(""); }
    });
  }

  async function cancel(item) {
    confirmThen({ title: "Batalkan permintaan?", message: `Batalkan permintaan admin untuk ${universityNames.get(item.university_id) || "universitas ini"}?`, danger: true, confirmLabel: "Batalkan" }, async () => {
      setBusyId(item.id); setError("");
      try { await requestJson("/api/admin/admin-requests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: item.id }) }); setNotice("Permintaan dibatalkan."); await load(); }
      catch (cause) { setError(cause.message); }
      finally { setBusyId(""); }
    });
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Tata kelola jaringan</p><h2 className="mt-1 text-2xl font-black tracking-tight">Permintaan Admin Universitas</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">Admin provinsi mengajukan penanggung jawab. Superadmin memeriksa dan memutuskan; akun yang disetujui mendapat cakupan universitas saja.</p></div><span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900"><ShieldCheck className="h-4 w-4" />{data.isSuperadmin ? "Superadmin pusat" : "Admin provinsi"}</span></header>
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    <div className={`grid items-start gap-5 ${data.isSuperadmin ? "" : "xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)"}`}>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5"><div><h3 className="text-sm font-black">Daftar permintaan</h3><p className="mt-1 text-xs text-slate-500">Setiap keputusan tercatat di jejak aktivitas.</p></div><button type="button" onClick={load} className="rounded-full px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Muat ulang</button></div>
        {loading ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : data.requests.length ? <div className="divide-y divide-slate-100">{data.requests.map((item) => { const [label, badgeClass] = STATUS[item.status] || STATUS.pending; const isRequester = item.requested_by === data.actorId; return <article key={item.id} className="space-y-3 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-extrabold">{universityNames.get(item.university_id) || "Universitas"}</h4><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${badgeClass}`}>{label}</span></div><p className="mt-1 text-xs text-slate-500">{provinceNames.get(item.province_id) || "Provinsi"} · Diajukan {new Date(item.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })} oleh {item.requesterName}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p className="font-semibold text-slate-800">{item.requested_name}</p><p className="flex items-center gap-1.5 text-slate-600"><Mail className="h-3.5 w-3.5" />{item.requested_email}</p></div>{item.note ? <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">{item.note}</p> : null}{item.review_note ? <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">Catatan keputusan: {item.review_note}</p> : null}{item.invitation_sent_at ? <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800"><Send className="h-3 w-3" />Undangan dikirim {new Date(item.invitation_sent_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p> : null}</div>
          {item.status === "pending" && data.isSuperadmin ? <div className="flex shrink-0 gap-2 sm:flex-col"><button type="button" disabled={busyId === item.id} onClick={() => decide(item, "approved")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-800 px-3 text-[10px] font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{busyId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Setujui</button><button type="button" disabled={busyId === item.id} onClick={() => decide(item, "rejected")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-rose-200 px-3 text-[10px] font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><X className="h-3.5 w-3.5" />Tolak</button></div> : item.status === "pending" && isRequester ? <button type="button" disabled={busyId === item.id} onClick={() => cancel(item)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50"><X className="h-3.5 w-3.5" />Batalkan</button> : null}</div></article>; })}</div> : <div className="grid min-h-48 place-items-center px-5 text-center"><div><Clock3 className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Belum ada permintaan</p><p className="mt-1 text-xs text-slate-400">Pengajuan baru akan tampil di sini.</p></div></div>}
      </section>
      {!data.isSuperadmin ? <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Pengajuan baru</p><h3 className="mt-1 text-base font-black">Minta Admin Universitas</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Admin provinsi tidak membuat akun sendiri. Superadmin akan meninjau dan mengirim undangan Auth jika disetujui.</p></div>
        <label className="block text-xs font-bold text-slate-700">Provinsi<select required value={form.provinceId} onChange={(event) => setForm({ ...form, provinceId: event.target.value, universityId: "" })} className={FIELD}><option value="">Pilih provinsi</option>{provinceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-xs font-bold text-slate-700">Universitas<select required value={form.universityId} onChange={(event) => setForm({ ...form, universityId: event.target.value })} className={FIELD}><option value="">Pilih universitas</option>{universityOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-xs font-bold text-slate-700">Nama calon admin<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama penanggung jawab" className={FIELD} /></label>
        <label className="block text-xs font-bold text-slate-700">Email akun Supabase Auth<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nama@email.com" className={FIELD} /><span className="mt-1 block text-[10px] font-normal text-slate-400">Jika belum punya akun, undangan aktivasi dikirim setelah disetujui.</span></label>
        <label className="block text-xs font-bold text-slate-700">Alasan atau catatan<textarea maxLength={1000} rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Konteks pengajuan (opsional)" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
        <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? "Mengirim…" : "Kirim untuk ditinjau"}</button>
      </form> : null}
    </div>
  </div>;
}
