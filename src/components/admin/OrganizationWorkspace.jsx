"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, CircleAlert, Camera, LoaderCircle, MapPin, Plus, Save, Search, ShieldCheck, X } from "lucide-react";

const EMPTY = { provinces: [], universities: [], catalogSource: "relational" };
const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

function slug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function accountHandle(account) {
  return typeof account === "string" ? account : account?.handle || "";
}

function connectionStatus(account) {
  if (typeof account === "string") return account ? "Belum terhubung" : "Belum diatur";
  if (account?.status === "connected") return "Terhubung";
  if (account?.handle) return "Tercatat, belum terhubung";
  return "Belum diatur";
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
  const activeUniversities = useMemo(() => data.universities.filter((item) => item.active !== false), [data.universities]);
  const activeUnits = useMemo(() => data.universities.reduce((count, item) => count + (item.units || []).filter((unit) => unit.active !== false).length, 0), [data.universities]);
  const filteredUniversities = useMemo(() => data.universities.map((university, index) => ({ university, index })).filter(({ university }) => {
    const matchesProvince = provinceFilter === "all" || university.provinceId === provinceFilter;
    const haystack = `${university.name} ${university.code} ${accountHandle(university.accounts?.instagram)}`.toLowerCase();
    return matchesProvince && haystack.includes(campusQuery.trim().toLowerCase());
  }), [campusQuery, data.universities, provinceFilter]);
  const provincesMissingChannels = data.provinces.filter((province) => province.active !== false && (!accountHandle(province.accounts?.instagram) || !accountHandle(province.accounts?.whatsapp_channel)));

  function updateProvince(index, key, value) {
    setData((current) => ({ ...current, provinces: current.provinces.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateProvinceAccount(index, key, value) {
    setData((current) => ({ ...current, provinces: current.provinces.map((item, i) => i === index ? { ...item, accounts: { ...(item.accounts || {}), [key]: value } } : item) }));
  }
  function updateUniversity(index, key, value) {
    setData((current) => ({ ...current, universities: current.universities.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function updateUniversityAccount(index, key, value) {
    setData((current) => ({ ...current, universities: current.universities.map((item, i) => i === index ? { ...item, accounts: { ...(item.accounts || {}), [key]: value } } : item) }));
  }
  function updateUnit(universityIndex, unitIndex, key, value) {
    setData((current) => ({ ...current, universities: current.universities.map((item, i) => i === universityIndex ? { ...item, units: item.units.map((unit, j) => j === unitIndex ? { ...unit, [key]: value } : unit) } : item) }));
  }
  function addProvince() {
    setData((current) => ({ ...current, provinces: [...current.provinces, { id: "", name: "", active: false, accounts: { instagram: "", whatsapp_channel: "" }, _new: true }] }));
  }
  function addUniversity() {
    setData((current) => ({ ...current, universities: [...current.universities, { id: "", code: "", name: "", provinceId: activeProvinces[0]?.id || "", active: true, accounts: { instagram: "", whatsapp_channel: "" }, units: [], emailDomains: [], _new: true }] }));
  }
  function addUnit(universityIndex) {
    setData((current) => ({ ...current, universities: current.universities.map((item, i) => i === universityIndex ? { ...item, units: [...(item.units || []), { id: `${slug(item.id || item.code || "unit")}-unit-${Date.now()}`, code: "", name: "", active: true, _new: true }] } : item) }));
  }
  function removeNew(kind, index) {
    setData((current) => ({ ...current, [kind]: current[kind].filter((item, i) => i !== index || !item._new) }));
  }
  function removeNewUnit(universityIndex, unitIndex) {
    setData((current) => ({ ...current, universities: current.universities.map((item, i) => i === universityIndex ? { ...item, units: item.units.filter((unit, j) => j !== unitIndex || !unit._new) } : item) }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const provinces = data.provinces.map((item) => ({ id: item.id, name: item.name, active: item.active !== false, accounts: { instagram: accountHandle(item.accounts?.instagram), whatsapp_channel: accountHandle(item.accounts?.whatsapp_channel) } }));
      const universities = data.universities.map((item) => ({
        id: item.id, code: item.code, name: item.name, provinceId: item.provinceId, active: item.active !== false,
        accounts: { instagram: accountHandle(item.accounts?.instagram), whatsapp_channel: accountHandle(item.accounts?.whatsapp_channel) },
        emailDomains: item.emailDomains || [],
        units: (item.units || []).map((unit) => ({ id: unit.id, code: unit.code, name: unit.name, active: unit.active !== false })),
      }));
      await requestJson("/api/admin/organization", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provinces, universities }) });
      setNotice("Struktur organisasi tersimpan. Fitur lama tetap memakai nama kampus yang sama.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save} className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Kendali jaringan nasional</p><h2 className="mt-1 text-2xl font-black tracking-tight">Provinsi, universitas & kanal</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">Atur jaringan Indonesia → provinsi → universitas → unit/cabang. Akun provinsi wajib dicatat untuk Instagram dan WhatsApp; akun universitas opsional. Nama akun yang dicatat belum berarti integrasinya sudah terhubung.</p></div><span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900 sm:self-auto"><ShieldCheck className="h-4 w-4" />Superadmin</span></header>
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Provinsi aktif", value: activeProvinces.length, icon: MapPin }, { label: "Universitas aktif", value: activeUniversities.length, icon: Building2 }, { label: "Unit/cabang aktif", value: activeUnits, icon: Building2 }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>)}</div>
    {data.catalogSource === "legacy-settings" ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900"><b>Data lama terdeteksi.</b> Daftar kampus dibaca dari pengaturan yang ada. Data baru akan disimpan ke katalog relasional setelah migrasi diterapkan.</div> : null}
    {provincesMissingChannels.length ? <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Penyiapan kanal provinsi belum lengkap.</b> Isi Instagram dan kanal WhatsApp untuk: {provincesMissingChannels.map((item) => item.name).join(", ")}. Akun yang dicatat tetap berstatus belum terhubung sampai integrasi resminya disiapkan.</span></div> : null}
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    {loading ? <div className="grid min-h-64 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : <>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black">1. Provinsi</h3><p className="mt-1 text-xs text-slate-500">Wilayah pusat. Setiap provinsi menyiapkan satu identitas Instagram dan kanal WhatsApp.</p></div><button type="button" onClick={addProvince} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 px-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"><Plus className="h-4 w-4" />Tambah provinsi</button></div>
        <div className="grid gap-3 md:grid-cols-2">{data.provinces.map((province, index) => <article key={`${province.id}-${index}`} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Wilayah {index + 1}</span><div className="flex items-center gap-2"><label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={province.active !== false} onChange={(event) => updateProvince(index, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{province._new ? <button type="button" onClick={() => removeNew("provinces", index)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Hapus baris provinsi"><X className="h-4 w-4" /></button> : null}</div></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold text-slate-600">Kode provinsi<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={province.id} disabled={!province._new} onChange={(event) => updateProvince(index, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="sumatera-utara" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama provinsi<input required maxLength={100} value={province.name} onChange={(event) => { updateProvince(index, "name", event.target.value); if (province._new && !province.id) updateProvince(index, "id", slug(event.target.value)); }} placeholder="Sumatera Utara" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Instagram provinsi</span><input required={province.active !== false} maxLength={31} value={accountHandle(province.accounts?.instagram)} onChange={(event) => updateProvinceAccount(index, "instagram", event.target.value.replace(/^@/, "").toLowerCase())} placeholder="jualbelidikampus.sumut" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">{connectionStatus(province.accounts?.instagram)}</span></label><label className="text-[10px] font-bold text-slate-600">Kanal WhatsApp provinsi<input required={province.active !== false} maxLength={200} value={accountHandle(province.accounts?.whatsapp_channel)} onChange={(event) => updateProvinceAccount(index, "whatsapp_channel", event.target.value)} placeholder="Tautan undangan atau JID @newsletter" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">{connectionStatus(province.accounts?.whatsapp_channel)}</span></label></div></article>)}{!data.provinces.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400 md:col-span-2">Belum ada provinsi. Tambahkan wilayah untuk memulai.</div> : null}</div>
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black">2. Universitas dan unit/cabang</h3><p className="mt-1 text-xs text-slate-500">Universitas hanya didaftarkan sekali. Cabang menjadi unit di bawah universitas, bukan universitas duplikat.</p></div><button type="button" onClick={addUniversity} disabled={!activeProvinces.length} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 px-3 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Tambah universitas</button></div>
        {!activeProvinces.length ? <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">Aktifkan satu provinsi terlebih dahulu.</div> : null}
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_240px]"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={campusQuery} onChange={(event) => setCampusQuery(event.target.value)} placeholder="Cari universitas, kode, atau Instagram" className={`${inputClass} pl-9`} /></label><select value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)} className={inputClass}><option value="all">Semua provinsi ({data.universities.length})</option>{data.provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}</select></div>
        <div className="space-y-3">{filteredUniversities.map(({ university, index }) => {
          const province = data.provinces.find((item) => item.id === university.provinceId);
          return <article key={`${university.id}-${index}`} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-800">{index + 1}</span><p className="truncate text-xs font-extrabold text-slate-700">{university.name || "Universitas baru"}</p></div><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={university.active !== false} onChange={(event) => updateUniversity(index, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{university._new ? <button type="button" onClick={() => removeNew("universities", index)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Hapus baris</button> : null}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-[10px] font-bold text-slate-600">Kode universitas<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={university.id} disabled={!university._new} onChange={(event) => updateUniversity(index, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="usu" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama resmi<input required maxLength={160} value={university.name} onChange={(event) => { updateUniversity(index, "name", event.target.value); if (university._new && !university.id) updateUniversity(index, "id", slug(event.target.value)); }} placeholder="Universitas ..." className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Kode singkat<input required maxLength={32} value={university.code} onChange={(event) => updateUniversity(index, "code", event.target.value.toUpperCase())} placeholder="USU" className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Provinsi<select required value={university.provinceId} onChange={(event) => updateUniversity(index, "provinceId", event.target.value)} className={inputClass}><option value="">Pilih provinsi</option>{activeProvinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-[10px] font-bold text-slate-600"><span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Instagram universitas (opsional)</span><input maxLength={31} value={accountHandle(university.accounts?.instagram)} onChange={(event) => updateUniversityAccount(index, "instagram", event.target.value.replace(/^@/, "").toLowerCase())} placeholder="jualbelidikampus.usu" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">{connectionStatus(university.accounts?.instagram)}</span></label><label className="text-[10px] font-bold text-slate-600">Kanal WhatsApp universitas (opsional)<input maxLength={200} value={accountHandle(university.accounts?.whatsapp_channel)} onChange={(event) => updateUniversityAccount(index, "whatsapp_channel", event.target.value)} placeholder="Tautan atau JID kanal" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">{connectionStatus(university.accounts?.whatsapp_channel)}</span></label><div className="sm:col-span-2 lg:col-span-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Unit / cabang · {province?.name || "provinsi belum dipilih"}</p><button type="button" onClick={() => addUnit(index)} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-50"><Plus className="h-3.5 w-3.5" />Tambah unit</button></div>{(university.units || []).length ? <div className="space-y-2">{university.units.map((unit, unitIndex) => <div key={`${unit.id}-${unitIndex}`} className="grid items-end gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[1fr_1fr_auto_auto]"><label className="text-[10px] font-bold text-slate-600">Kode unit<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={unit.id} disabled={!unit._new} onChange={(event) => updateUnit(index, unitIndex, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder={`${university.id || "universitas"}-cabang`} className={inputClass} /></label><label className="text-[10px] font-bold text-slate-600">Nama cabang<input required maxLength={160} value={unit.name} onChange={(event) => { updateUnit(index, unitIndex, "name", event.target.value); if (unit._new && !unit.code) updateUnit(index, unitIndex, "code", slug(event.target.value).toUpperCase().replaceAll("-", "_")); }} placeholder="Kampus ..." className={inputClass} /></label><label className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={unit.active !== false} onChange={(event) => updateUnit(index, unitIndex, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{unit._new ? <button type="button" onClick={() => removeNewUnit(index, unitIndex)} className="mb-1 grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50" aria-label="Hapus unit baru"><X className="h-4 w-4" /></button> : <span />}</div>)}</div> : <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-[10px] text-slate-400">Belum ada cabang/unit terdaftar.</p>}</div><label className="text-[10px] font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Domain email kampus (opsional)<input value={(university.emailDomains || []).join(", ")} onChange={(event) => updateUniversity(index, "emailDomains", event.target.value.split(",").map((domain) => domain.trim()).filter(Boolean))} placeholder="contoh.ac.id" className={inputClass} /><span className="mt-1 block font-normal text-slate-400">Bukan syarat pendaftaran akun.</span></label></div>
          </article>;
        })}{!data.universities.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">Belum ada universitas terdaftar.</div> : null}{data.universities.length && !filteredUniversities.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">Tidak ada universitas yang cocok.</div> : null}</div>
      </section>
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5"><h3 className="text-sm font-black text-sky-950">Status yang ditampilkan</h3><div className="mt-3 grid gap-3 text-xs leading-relaxed text-sky-900 sm:grid-cols-3"><p><b>Identitas tercatat:</b> nama akun atau kanal sudah tersimpan sebagai tujuan.</p><p><b>Belum terhubung:</b> publikasi otomatis belum diotorisasi melalui integrasi resmi.</p><p><b>Akses owner:</b> cakupan provinsi dan universitas dikelola terpisah melalui menu Akses owner.</p></div></section>
      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4"><p className="text-[11px] leading-relaxed text-slate-500">Provinsi, universitas, dan cabang tersimpan tidak dihapus; nonaktifkan jika tidak digunakan.</p><button disabled={saving} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : notice ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? "Menyimpan…" : "Simpan struktur"}</button></div>
    </>}
  </form>;
}
