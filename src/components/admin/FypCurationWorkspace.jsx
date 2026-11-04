"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, LoaderCircle, Plus, Search, Sparkles, Trash2 } from "lucide-react";

const rupiah = (amount) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(Number(amount) || 0);

export default function FypCurationWorkspace() {
  const [provinces, setProvinces] = useState([]);
  const [provinceId, setProvinceId] = useState("");
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [maxFeatured, setMaxFeatured] = useState(12);

  const load = useCallback(async (selectedProvince = provinceId, search = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedProvince) params.set("provinceId", selectedProvince);
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/admin/fyp/curation?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kurasi FYP belum dapat dimuat.");
      setProvinces(data.provinces || []);
      setProvinceId(data.province?.id || selectedProvince);
      setItems(data.items || []);
      setFeatured(data.featured || []);
      setMaxFeatured(data.maxFeatured || 12);
    } catch (cause) {
      setError(cause.message || "Kurasi FYP belum dapat dimuat.");
      setItems([]);
      setFeatured([]);
    } finally {
      setLoading(false);
    }
  }, [provinceId]);

  useEffect(() => {
    load();
  // The selected province is set by the first response or by the selector.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  const featuredIds = useMemo(() => new Set(featured.map((item) => String(item.id))), [featured]);

  async function save(nextFeatured) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/fyp/curation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provinceId, listingIds: nextFeatured.map((item) => item.id) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Perubahan kurasi gagal disimpan.");
      setFeatured(nextFeatured);
    } catch (cause) {
      setError(cause.message || "Perubahan kurasi gagal disimpan.");
      await load(provinceId, query);
    } finally {
      setSaving(false);
    }
  }

  function move(index, delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= featured.length) return;
    const next = [...featured];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    save(next);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Sparkles className="h-4 w-4" /> Pilihan editorial wilayah
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Kurasi FYP provinsi</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Pilih listing aktif yang layak ditampilkan lebih dulu kepada pengguna saat mereka melihat FYP provinsi.
          </p>
        </div>
        {provinces.length > 1 && (
          <label className="grid min-w-56 gap-1.5 text-xs font-bold text-slate-600">
            Provinsi yang dikelola
            <select value={provinceId} onChange={(event) => setProvinceId(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15">
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
            </select>
          </label>
        )}
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]">
        <section aria-labelledby="fyp-candidates-heading" className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="fyp-candidates-heading" className="text-base font-extrabold text-slate-900">Listing aktif di provinsi ini</h3>
              <p className="mt-1 text-xs text-slate-500">Cari listing, lalu tambahkan sebagai pilihan FYP. Listing tetap mengikuti status moderasi.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); load(provinceId, query); }} className="flex gap-2">
              <label className="relative min-w-0 flex-1 sm:w-56">
                <span className="sr-only">Cari listing</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari barang…" className="min-h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
              </label>
              <button type="submit" className="min-h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700">Cari</button>
            </form>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Memuat listing</div>
              : items.length ? <ul className="divide-y divide-slate-100">{items.map((item) => {
                const selected = featuredIds.has(String(item.id));
                return <li key={item.id} className="flex min-w-0 items-center gap-3 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><span className="text-xs font-black">{String(item.category || "JB").slice(0, 2).toUpperCase()}</span></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{item.campus || "Wilayah umum"} · {item.category || "Lainnya"} · {rupiah(item.price)}</p>
                  </div>
                  <button type="button" disabled={saving || selected || featured.length >= maxFeatured} onClick={() => save([...featured, item])} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45">
                    {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{selected ? "Dipilih" : "Unggulkan"}
                  </button>
                </li>;
              })}</ul>
                : <div className="px-5 py-10 text-center"><p className="text-sm font-bold text-slate-800">Belum ada listing yang cocok</p><p className="mt-1 text-xs text-slate-500">Coba kata kunci lain atau periksa data provinsi listing.</p></div>}
          </div>
        </section>

        <section aria-labelledby="fyp-featured-heading" className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 id="fyp-featured-heading" className="text-base font-extrabold text-slate-900">Tampil lebih dulu</h3>
              <p className="mt-1 text-xs text-slate-500">Urutan ini dipakai oleh pengguna yang memilih FYP provinsi.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{featured.length}/{maxFeatured}</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {featured.length ? <ol className="divide-y divide-slate-100">{featured.map((item, index) => <li key={item.id} className="flex min-w-0 items-center gap-3 p-3.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-600">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.campus || "Wilayah umum"} · {rupiah(item.price)}</p></div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" aria-label={`Naikkan ${item.title}`} disabled={saving || index === 0} onClick={() => move(index, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" aria-label={`Turunkan ${item.title}`} disabled={saving || index === featured.length - 1} onClick={() => move(index, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" aria-label={`Hapus ${item.title} dari pilihan FYP`} disabled={saving} onClick={() => save(featured.filter((entry) => entry.id !== item.id))} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>)}</ol>
              : <div className="px-5 py-10 text-center"><Sparkles className="mx-auto h-5 w-5 text-emerald-700" /><p className="mt-2 text-sm font-bold text-slate-800">Belum ada pilihan FYP</p><p className="mt-1 text-xs leading-5 text-slate-500">Pilih listing aktif di sebelah kiri. Pilihan akan tampil saat pengguna membuka jangkauan provinsi.</p></div>}
            {saving && <div role="status" className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs font-semibold text-slate-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Menyimpan urutan</div>}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Jika listing tidak aktif atau tidak lagi terpetakan ke provinsi ini, listing akan otomatis berhenti tampil.</p>
        </section>
      </div>
    </div>
  );
}
