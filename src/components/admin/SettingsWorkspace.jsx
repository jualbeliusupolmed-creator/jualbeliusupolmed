"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, LoaderCircle, Save, Settings2 } from "lucide-react";

const EMPTY = {
  site: { heroTitle: "", heroSubtitle: "", footerTagline: "", metaTitle: "", metaDescription: "", logoUrl: "", faviconUrl: "" },
  pricing: { freeMode: true, listingDays: 14, adBarang: 0, adPoster: 0, bump: 0, featuredPerDay: 0, featuredMaxPerDay: 0, renewalFee: 0, proMonthly: 0 },
  areas: [],
  campuses: [],
};
const MONEY_FIELDS = [["adBarang", "Biaya iklan barang"], ["adPoster", "Biaya iklan poster"], ["bump", "Biaya naikkan iklan"], ["featuredPerDay", "Sorotan per hari"], ["featuredMaxPerDay", "Batas sorotan per hari"], ["renewalFee", "Biaya perpanjangan"], ["proMonthly", "Paket Pro bulanan"]];

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

export default function SettingsWorkspace() {
  const [form, setForm] = useState(EMPTY);
  const [areasText, setAreasText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/admin/settings", { cache: "no-store" });
      setForm(data);
      setAreasText((data.areas || []).join(", "));
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, areas: areasText.split(",").map((value) => value.trim()).filter(Boolean) }),
      });
      setNotice("Pengaturan platform tersimpan.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  function updateSite(key, value) { setForm((current) => ({ ...current, site: { ...current.site, [key]: value } })); }
  function updatePricing(key, value) { setForm((current) => ({ ...current, pricing: { ...current.pricing, [key]: value } })); }
  function updateCampus(index, key, value) {
    setForm((current) => ({ ...current, campuses: current.campuses.map((campus, campusIndex) => campusIndex === index ? { ...campus, [key]: value } : campus) }));
  }
  function addCampus() {
    setForm((current) => ({ ...current, campuses: [...current.campuses, { id: `kampus-baru-${Date.now()}`, name: "", shortName: "", provinceId: "", active: true, emailDomains: [], _new: true }] }));
  }
  function removeNewCampus(index) {
    setForm((current) => ({ ...current, campuses: current.campuses.filter((campus, campusIndex) => campusIndex !== index || !campus._new) }));
  }

  const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";
  return <form onSubmit={save} className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Pengaturan platform</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Atur tampilan beranda, informasi pencarian, biaya, dan area layanan. Pengaturan ini berlaku untuk semua kampus.</p></div><span className="inline-flex min-h-9 items-center gap-2 self-start rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900"><Settings2 className="h-4 w-4" />Superadmin</span></header>
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    {loading ? <div className="grid min-h-64 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : <>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="mb-4"><h3 className="text-sm font-black">Identitas beranda</h3><p className="mt-1 text-[11px] text-slate-500">Teks yang terlihat di beranda dan hasil pencarian.</p></div><div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-bold text-slate-700 md:col-span-2">Judul hero<input maxLength={160} value={form.site.heroTitle} onChange={(event) => updateSite("heroTitle", event.target.value)} className={inputClass} placeholder="Kosongkan untuk judul bawaan beranda" /></label>
        <label className="text-xs font-bold text-slate-700 md:col-span-2">Subjudul<input maxLength={300} value={form.site.heroSubtitle} onChange={(event) => updateSite("heroSubtitle", event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-700 md:col-span-2">Tagline footer<input maxLength={300} value={form.site.footerTagline} onChange={(event) => updateSite("footerTagline", event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-700">Judul hasil pencarian<input maxLength={160} value={form.site.metaTitle} onChange={(event) => updateSite("metaTitle", event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-700">Deskripsi hasil pencarian<textarea rows={2} maxLength={320} value={form.site.metaDescription} onChange={(event) => updateSite("metaDescription", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
        <label className="text-xs font-bold text-slate-700">URL logo<input type="url" value={form.site.logoUrl} onChange={(event) => updateSite("logoUrl", event.target.value)} placeholder="https://..." className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-700">URL favicon<input type="url" value={form.site.faviconUrl} onChange={(event) => updateSite("faviconUrl", event.target.value)} placeholder="https://..." className={inputClass} /></label>
      </div></section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-sm font-black">Katalog kampus</h3><p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">Atur nama kampus dan provinsi yang dipakai marketplace serta cakupan owner. Kampus yang sudah terdaftar dapat dinonaktifkan, tetapi tidak dihapus.</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Domain email bersifat opsional dan hanya untuk verifikasi mahasiswa. Email kampus bukan syarat membuat akun atau masuk ke platform.</p></div>
          <button type="button" onClick={addCampus} className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 px-3 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-50">Tambah kampus</button>
        </div>
        <div className="space-y-3">
          {form.campuses.map((campus, index) => <article key={`${campus.id}-${index}`} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-[10px] font-black text-emerald-800">{index + 1}</span><p className="text-xs font-extrabold text-slate-700">{campus.name || "Kampus baru"}</p></div><div className="flex items-center gap-3"><label className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={campus.active !== false} onChange={(event) => updateCampus(index, "active", event.target.checked)} className="h-4 w-4 accent-emerald-700" />Aktif</label>{campus._new ? <button type="button" onClick={() => removeNewCampus(index)} className="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Hapus baris</button> : null}</div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-[10px] font-bold text-slate-600">Kode kampus<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Gunakan huruf kecil, angka, dan tanda hubung." value={campus.id} onChange={(event) => updateCampus(index, "id", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} disabled={!campus._new} className={inputClass} /></label>
              <label className="text-[10px] font-bold text-slate-600">Nama resmi<input required maxLength={120} value={campus.name} onChange={(event) => updateCampus(index, "name", event.target.value)} className={inputClass} /></label>
              <label className="text-[10px] font-bold text-slate-600">Nama singkat<input required maxLength={32} value={campus.shortName} onChange={(event) => updateCampus(index, "shortName", event.target.value.toUpperCase())} className={inputClass} /></label>
              <label className="text-[10px] font-bold text-slate-600">Kode provinsi<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Gunakan huruf kecil, angka, dan tanda hubung." value={campus.provinceId} onChange={(event) => updateCampus(index, "provinceId", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className={inputClass} placeholder="contoh: sumatera-utara" /></label>
              <label className="text-[10px] font-bold text-slate-600 sm:col-span-2 lg:col-span-4">Domain email verifikasi (opsional)<input value={(campus.emailDomains || []).join(", ")} onChange={(event) => updateCampus(index, "emailDomains", event.target.value.split(",").map((domain) => domain.trim()).filter(Boolean))} className={inputClass} placeholder="usu.ac.id, contoh.ac.id" /><span className="mt-1 block font-normal text-slate-400">Tulis domain tanpa tanda @ dan pisahkan dengan koma.</span></label>
            </div>
          </article>)}
          {!form.campuses.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">Belum ada kampus. Tambahkan minimal satu kampus untuk mengatur cakupan.</div> : null}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="mb-4"><h3 className="text-sm font-black">Biaya dan masa tayang</h3><p className="mt-1 text-[11px] text-slate-500">Nominal dalam rupiah. Biaya tersimpan mengikuti pengaturan aktif platform.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[#f5f8f6] px-3 text-xs font-bold text-slate-700 sm:col-span-2 lg:col-span-3"><span>Mode gratis</span><input type="checkbox" checked={form.pricing.freeMode} onChange={(event) => updatePricing("freeMode", event.target.checked)} className="h-4 w-4 accent-emerald-700" /></label>
        <label className="text-xs font-bold text-slate-700">Masa tayang iklan (hari)<input type="number" min="1" max="365" value={form.pricing.listingDays} onChange={(event) => updatePricing("listingDays", Number(event.target.value))} className={inputClass} /></label>
        {MONEY_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-700">{label}<input type="number" min="0" max="100000000" step="1" value={form.pricing[key]} onChange={(event) => updatePricing(key, Number(event.target.value))} className={inputClass} /></label>)}
      </div></section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="mb-3"><h3 className="text-sm font-black">Area layanan</h3><p className="mt-1 text-[11px] text-slate-500">Pisahkan tiap area dengan koma. Maksimal 60 area.</p></div><textarea rows={4} value={areasText} onChange={(event) => setAreasText(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></section>
      <div className="sticky bottom-3 flex justify-end"><button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/10 hover:bg-emerald-900 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Menyimpan…" : "Simpan pengaturan"}</button></div>
    </>}
  </form>;
}
