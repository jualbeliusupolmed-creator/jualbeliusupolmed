"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Pencil, Plus, Search, ShieldCheck, UserRound, UserRoundX, Users, X } from "lucide-react";

const EMPTY = { account: "", displayName: "", scopes: [], marketplace: [], reports: [], po: [], users: [], finance: [], analytics: [], content: [] };
const MODULES = [
  { key: "marketplace", label: "Marketplace", actions: [["read", "Lihat data cakupan"], ["review", "Review iklan pending"], ["manage", "Tangguhkan atau pulihkan"]] },
  { key: "users", label: "Pengguna", actions: [["read", "Lihat akun tersamarkan"], ["manage", "Batasi akun"]] },
  { key: "reports", label: "Laporan", actions: [["read", "Lihat laporan cakupan"], ["manage", "Tandai laporan selesai"]] },
  { key: "po", label: "Open PO", actions: [["read", "Lihat batch cakupan"], ["manage", "Kelola batch dan pesanan"]] },
  { key: "finance", label: "Keuangan", actions: [["read", "Lihat transaksi cakupan"]] },
  { key: "analytics", label: "Analitik", actions: [["read", "Lihat ringkasan cakupan"]] },
  { key: "content", label: "Konten", actions: [["read", "Lihat artikel cakupan"], ["review", "Review artikel cakupan"], ["manage", "Sunting artikel cakupan"]] },
];

function requestJson(url, options) {
  return fetch(url, options).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
    return body;
  });
}

export default function OwnersWorkspace() {
  const [data, setData] = useState({ owners: [], campuses: [], provinces: [] });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    setLoading(true);
    try { setData(await requestJson("/api/admin/owners", { cache: "no-store" })); }
    catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const owners = useMemo(() => data.owners.filter((owner) => `${owner.display_name} ${owner.email}`.toLowerCase().includes(query.toLowerCase())), [data.owners, query]);

  function startEdit(owner) {
    const modules = owner.permissions || {};
    setEditing(owner.user_id);
    setForm({
      account: owner.email === "Akun Auth" ? owner.user_id : owner.email,
      displayName: owner.display_name,
      scopes: (owner.scopes || []).map((scope) => `${scope.scope_type}:${scope.scope_id}`),
      marketplace: Array.isArray(modules.marketplace) ? modules.marketplace : [],
      reports: Array.isArray(modules.reports) ? modules.reports : [],
      po: Array.isArray(modules.po) ? modules.po : [],
      users: Array.isArray(modules.users) ? modules.users : [],
      finance: Array.isArray(modules.finance) ? modules.finance : [],
      analytics: Array.isArray(modules.analytics) ? modules.analytics : [],
      content: Array.isArray(modules.content) ? modules.content : [],
    });
    setMessage(null);
  }

  function toggleScope(value) {
    setForm((current) => ({ ...current, scopes: current.scopes.includes(value) ? current.scopes.filter((item) => item !== value) : [...current.scopes, value] }));
  }
  function toggleModule(module, action) {
    setForm((current) => {
      const selected = current[module].includes(action);
      const next = action === "read" && selected
        ? []
        : selected ? current[module].filter((value) => value !== action) : [...current[module], action];
      if (action !== "read" && !selected && !next.includes("read")) next.push("read");
      return { ...current, [module]: next };
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const scopes = form.scopes.map((entry) => { const [type, ...id] = entry.split(":"); return { type, id: id.join(":") }; });
    try {
      const permissions = Object.fromEntries(MODULES.map(({ key }) => [key, form[key]]));
      await requestJson("/api/admin/owners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: form.account, displayName: form.displayName, scopes, permissions }) });
      setMessage({ type: "success", text: "Akses owner tersimpan." });
      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setSaving(false); }
  }

  async function changeStatus(owner) {
    const status = owner.status === "active" ? "suspended" : "active";
    if (!window.confirm(`${status === "suspended" ? "Hentikan sementara" : "Aktifkan kembali"} akses ${owner.display_name}?`)) return;
    try {
      await requestJson("/api/admin/owners", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: owner.user_id, status }) });
      await load();
      setMessage({ type: "success", text: status === "active" ? "Akses owner diaktifkan." : "Akses owner dihentikan sementara." });
    } catch (error) { setMessage({ type: "error", text: error.message }); }
  }

  async function removeOwner(owner) {
    if (!window.confirm(`Cabut seluruh akses workspace ${owner.display_name}?`)) return;
    try {
      await requestJson("/api/admin/owners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: owner.user_id }) });
      await load();
      setMessage({ type: "success", text: "Akses owner dicabut." });
    } catch (error) { setMessage({ type: "error", text: error.message }); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Pengelolaan akses</p><h2 className="mt-1 text-2xl font-black tracking-tight">Owner & cakupan</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Tentukan akun Auth, wilayah kerja, dan izin modul untuk setiap owner. Satu owner dapat mengelola provinsi, beberapa kampus, atau gabungan keduanya.</p></div><span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900 sm:self-auto"><ShieldCheck className="h-4 w-4" />Superadmin</span></header>
      {message ? <div role="status" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message.text}</div> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="text-sm font-black">Owner terdaftar</h3><p className="mt-1 text-xs text-slate-500">{data.owners.length} akun memiliki akses</p></div><label className="relative block w-full sm:max-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau akun" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600" /></label></div>
          {loading ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : owners.length ? <div className="divide-y divide-slate-100">{owners.map((owner) => { const grantedModules = MODULES.filter(({ key }) => owner.permissions?.[key]?.length).map(({ label }) => label); return <article key={owner.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{owner.display_name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${owner.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{owner.status === "active" ? "Aktif" : "Nonaktif"}</span></div><p className="mt-0.5 truncate text-xs text-slate-500">{owner.email}</p><div className="mt-2 flex flex-wrap gap-1.5">{owner.scopes.map((scope) => <span key={`${scope.scope_type}:${scope.scope_id}`} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{scope.scope_id.replaceAll("-", " ")}</span>)}{grantedModules.map((module) => <span key={module} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">{module}</span>)}</div></div><div className="flex items-center gap-1 self-end sm:self-auto"><button onClick={() => startEdit(owner)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Ubah izin"><Pencil className="h-4 w-4" /></button><button onClick={() => changeStatus(owner)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-800" title={owner.status === "active" ? "Hentikan akses sementara" : "Aktifkan kembali"}><UserRoundX className="h-4 w-4" /></button><button onClick={() => removeOwner(owner)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700" title="Cabut akses"><X className="h-4 w-4" /></button></div></article>; })}</div> : <div className="grid min-h-48 place-items-center px-5 text-center"><div><Users className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Belum ada owner tambahan</p><p className="mt-1 text-xs text-slate-400">Tambahkan akun pertama melalui formulir di samping.</p></div></div>}
        </section>

        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">{editing ? "Edit owner" : "Akun baru"}</p><h3 className="mt-1 text-base font-black">{editing ? "Atur ulang akses" : "Tambah owner"}</h3></div>{editing ? <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Batalkan edit"><X className="h-4 w-4" /></button> : null}</div>
          <label className="block text-xs font-bold text-slate-700">Akun Auth<input required value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} placeholder="Email akun atau ID Auth" disabled={!!editing} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600 disabled:text-slate-400" /><span className="mt-1 block text-[10px] leading-relaxed text-slate-400">Akun harus sudah dibuat di Supabase Auth.</span></label>
          <label className="block text-xs font-bold text-slate-700">Nama tampilan<input required maxLength={80} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nama owner" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label>

          <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-xs font-extrabold">Cakupan kerja</legend><div className="space-y-3">{data.provinces.length ? <div><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Provinsi</p>{data.provinces.map((province) => { const value = `province:${province.id}`; return <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.scopes.includes(value)} onChange={() => toggleScope(value)} className="h-4 w-4 accent-emerald-700" />{province.name}</label>; })}</div> : null}<div><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Kampus tertentu</p><div className="grid gap-x-3 sm:grid-cols-2">{data.campuses.map((campus) => { const value = `campus:${campus.id.toLowerCase()}`; return <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.scopes.includes(value)} onChange={() => toggleScope(value)} className="h-4 w-4 accent-emerald-700" />{campus.shortName}</label>; })}</div></div></div></fieldset>

          <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-xs font-extrabold">Izin modul</legend><p className="mb-3 text-[10px] leading-relaxed text-slate-500">Akses data mengikuti kampus dan provinsi yang dipilih. Pengaturan platform dan WhatsApp hanya tersedia untuk superadmin.</p><div className="grid gap-3 sm:grid-cols-2">{MODULES.map(({ key, label, actions }) => <div key={key} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-extrabold">{label}</p>{actions.map(([action, description], index) => <label key={action} className={`flex min-h-8 cursor-pointer items-center gap-2 text-xs font-medium ${index === 0 ? "mt-2" : ""}`}><input type="checkbox" checked={form[key].includes(action)} onChange={() => toggleModule(key, action)} className="h-4 w-4 accent-emerald-700" />{description}</label>)}</div>)}</div></fieldset>

          <div className="flex gap-2 pt-1"><button disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Tambahkan owner"}</button></div>
        </form>
      </div>
    </div>
  );
}
