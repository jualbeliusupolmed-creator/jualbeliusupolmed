"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, CircleAlert, Instagram, LoaderCircle, MapPin, Plus, Save, Search, ShieldCheck, X } from "lucide-react";

const EMPTY = { provinces: [], campuses: [], catalogSource: "managed" };
const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

function slug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OrganizationWorkspace() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [campusQuery, setCampusQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try { setData(await requestJson("/api/admin/organization", { cache: "no-store" })); }
    catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const activeProvinces = useMemo(() => data.provinces.filter((item) => item.active !== false), [data.provinces]);
  const activeCampuses = useMemo(() => data.campuses.filter((item) => item.active !== false), [data.campuses]);
  const branches = useMemo(() => data.campuses.filter((item) => item.parentCampusId), [data.campuses]);
  const filteredCampuses = useMemo(() => data.campuses.map((campus, index) => ({ campus, index })).filter(({ campus }) => {
    const matchesProvince = provinceFilter === "all" || campus.provinceId === provinceFilter;
    const haystack = `${campus.name} ${campus.shortName} ${campus.instagramHandle}`.toLowerCase();
    return matchesProvince && haystack.includes(campusQuery.trim().toLowerCase());
  }), [campusQuery, data.campuses, provinceFilter]);

  function updateProvince(index, key, value) {
    setData((current) => ({ ...current, provinces: current.provinces.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateCampus(index, key, value) {
    setData((current) => ({ ...current, campuses: current.campuses.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function addProvince() {
    setData((current) => ({ ...current, provinces: [...current.provinces, { id: "", name: "", active: true, _new: true }] }));
  }
  function addCampus() {
    setData((current) => ({ ...current, campuses: [...current.campuses, { id: "", name: "", shortName: "", provinceId: activeProvinces[0]?.id || "", parentCampusId: "", instagramHandle: "", emailDomains: [], active: true, _new: true }] }));
  }
  function removeNew(kind, index) {
    setData((current) => ({ ...current, [kind]: current[kind].filter((item, i) => i !== index || !item._new) }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const provinces = data.provinces.map(({ id, name, active }) => ({ id, name, active }));
      const campuses = data.campuses.map(({ id, name, shortName, provinceId, parentCampusId, instagramHandle, emailDomains, active }) => ({ id, name, shortName, provinceId, parentCampusId, instagramHandle, emailDomains, active }));
      await requestJson("/api/admin/organization", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provinces, campuses }) });
      setNotice("Struktur provinsi dan kampus tersimpan. Penugasan owner memakai daftar terbaru ini.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save} className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Kendali jaringan nasional</p><h2 className="mt-1 text-2xl font-black tracking-tight">Struktur provinsi & kampus</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">Bangun katalog Indonesia → provinsi → kampus/universitas. Tambahkan kampus cabang, tetapkan akun Instagram tiap kampus, lalu gunakan struktur yang sama untuk memberi cakupan owner.</p></div>
      <span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900 sm:self-auto"><ShieldCheck className="h-4 w-4" />Superadmin</span>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Provinsi aktif", value: activeProvinces.length, icon: MapPin }, { label: "Kampus aktif", value: activeCampuses.length, icon: Building2 }, { label: "Kampus cabang", value: branches.length, icon: Building2 }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>)}
    </div>
    {data.catalogSource === "legacy-derived" ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900"><b>Katalog lama terdeteksi.</b> Provinsi saat ini dibaca dari data kampus yang sudah ada. Simpan struktur ini untuk mulai mengelola provinsi secara mandiri; kampus dan cakupan yang ada tetap ikut terbawa.</div> : null}
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    {loading ? <div className="grid min-h-64 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : <>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black">1. Provinsi</h3><p className="mt-1 text-xs text-slate-500">Provinsi boleh disiapkan dulu, meski kampusnya belum ditambahkan.</p></div><button type="button" onClick={addProvince} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 px-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"><Plus className="h-4 w-4" />Tambah provinsi</button></div>
        <div className="grid gap-3 md:grid-cols-2">{data.provinces.map((province, index) => <article key={`${province.id}-${index}`} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Wilayah {index + 1}</span><div className="flex items-center gap-2"><label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={province.active !== false} onChange={(event) => updateProvince(index, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{province._new ? <button type="button" onClick={() => removeNew("provinces", index)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Hapus baris provinsi"><X className="h-4 w-4" /></button> : null}</div></div><div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]"><label className="text-[10px] font-bold text-slate-600">Kode provinsi<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={province.id} disabled={!province._new} onChange={(event) => updateProvince(index, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="sumatera-utara" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama provinsi<input required maxLength={100} value={province.name} onChange={(event) => { updateProvince(index, "name", event.target.value); if (province._new && !province.id) updateProvince(index, "id", slug(event.target.value)); }} placeholder="Sumatera Utara" className={inputClass} /></label></div></article>)}{!data.provinces.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400 md:col-span-2">Belum ada provinsi. Tambahkan provinsi untuk membangun struktur jaringan.</div> : null}</div>
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black">2. Kampus / universitas</h3><p className="mt-1 text-xs text-slate-500">Satu kampus dapat memiliki akun Instagram sendiri dan ditautkan ke kampus induk.</p></div><button type="button" onClick={addCampus} disabled={!activeProvinces.length} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 px-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Tambah kampus</button></div>
        {!activeProvinces.length ? <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">Tambahkan setidaknya satu provinsi aktif sebelum menambah kampus.</div> : null}
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_240px]"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={campusQuery} onChange={(event) => setCampusQuery(event.target.value)} placeholder="Cari kampus, singkatan, atau Instagram" className={`${inputClass} pl-9`} /></label><select value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)} className={inputClass}><option value="all">Semua provinsi ({data.campuses.length})</option>{data.provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}</select></div>
        <div className="space-y-3">{filteredCampuses.map(({ campus, index }) => {
          const parentOptions = data.campuses.filter((item) => item.id && item.id !== campus.id && item.provinceId === campus.provinceId);
          return <article key={`${campus.id}-${index}`} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-800">{index + 1}</span><p className="truncate text-xs font-extrabold text-slate-700">{campus.name || "Kampus baru"}</p>{campus.parentCampusId ? <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800">Cabang</span> : null}</div><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={campus.active !== false} onChange={(event) => updateCampus(index, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{campus._new ? <button type="button" onClick={() => removeNew("campuses", index)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Hapus baris</button> : null}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-[10px] font-bold text-slate-600">Kode kampus<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Gunakan huruf kecil, angka, dan tanda hubung." value={campus.id} disabled={!campus._new} onChange={(event) => updateCampus(index, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="usu" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama resmi<input required maxLength={120} value={campus.name} onChange={(event) => { updateCampus(index, "name", event.target.value); if (campus._new && !campus.id) updateCampus(index, "id", slug(event.target.value)); }} placeholder="Universitas ..." className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama singkat<input required maxLength={32} value={campus.shortName} onChange={(event) => updateCampus(index, "shortName", event.target.value.toUpperCase())} placeholder="USU" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Provinsi<select required value={campus.provinceId} onChange={(event) => updateCampus(index, "provinceId", event.target.value)} className={inputClass}><option value="">Pilih provinsi</option>{activeProvinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}</select></label><label className="text-[10px] font-bold text-slate-600">Kampus induk (opsional)<select value={campus.parentCampusId || ""} onChange={(event) => updateCampus(index, "parentCampusId", event.target.value)} className={inputClass}><option value="">Kampus mandiri / induk</option>{parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label><label className="text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" />Akun Instagram kampus</span><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">@</span><input maxLength={31} value={campus.instagramHandle || ""} onChange={(event) => updateCampus(index, "instagramHandle", event.target.value.replace(/^@/, "").toLowerCase())} placeholder="jualbelidikampus.usu" className={`${inputClass} pl-7`} /></div></label><label className="text-[10px] font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Domain email verifikasi (opsional)<input value={(campus.emailDomains || []).join(", ")} onChange={(event) => updateCampus(index, "emailDomains", event.target.value.split(",").map((domain) => domain.trim()).filter(Boolean))} placeholder="contoh.ac.id" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">Tidak wajib untuk membuat akun marketplace.</span></label></div>
          </article>;
        })}{!data.campuses.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">Belum ada kampus terdaftar.</div> : null}{data.campuses.length && !filteredCampuses.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">Tidak ada kampus yang cocok dengan pencarian.</div> : null}</div>
      </section>
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5"><h3 className="text-sm font-black text-sky-950">Kontrol yang memakai struktur ini</h3><div className="mt-3 grid gap-3 text-xs leading-relaxed text-sky-900 sm:grid-cols-3"><p><b>Akses owner:</b> pilih provinsi atau satu/beberapa kampus pada halaman Akses owner.</p><p><b>Instagram kampus:</b> katalog akun per kampus mulai tercatat di sini; integrasi DM dan penerbitan tetap perlu penghubung akun Instagram.</p><p><b>FYP provinsi:</b> struktur wilayah siap menjadi cakupan kurasi. Panel publikasi FYP belum tersedia di versi ini.</p></div></section>
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4"><p className="text-[11px] leading-relaxed text-slate-500">Provinsi atau kampus yang sudah tersimpan tidak dihapus; nonaktifkan jika tidak digunakan.</p><button disabled={saving} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : notice ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? "Menyimpan…" : "Simpan struktur"}</button></div>
    </>}
  </form>;
}
