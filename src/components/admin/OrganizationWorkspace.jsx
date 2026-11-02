"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2, Check, CircleAlert, Camera, LoaderCircle, MapPin, Plus, Search,
  ShieldCheck, X, Pencil, Layers, Radio, ExternalLink, ChevronRight, CheckCircle2,
  AlertCircle, School, Eye
} from "lucide-react";

const EMPTY_CATALOG = { provinces: [], universities: [], catalogSource: "relational" };

const inputStyle =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function accountHandle(account) {
  return typeof account === "string" ? account : account?.handle || "";
}

function connectionStatus(account) {
  if (typeof account === "string") return account ? "Tercatat" : "Belum diatur";
  if (account?.status === "connected") return "Terhubung";
  if (account?.handle) return "Tercatat";
  return "Belum diatur";
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

export default function OrganizationWorkspace() {
  const [data, setData] = useState(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Tabs: "overview" (Ringkasan Hierarki), "campuses" (Universitas & Cabang), "provinces" (Provinsi)
  const [activeTab, setActiveTab] = useState("overview");

  // Filters & Search
  const [campusQuery, setCampusQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");

  // Modal State: null | { type: "add_campus" | "edit_campus" | "add_province" | "edit_province" | "manage_units", payload }
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await requestJson("/api/admin/organization", { cache: "no-store" });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeProvinces = useMemo(
    () => data.provinces.filter((p) => p.active !== false),
    [data.provinces]
  );
  const activeUniversities = useMemo(
    () => data.universities.filter((u) => u.active !== false),
    [data.universities]
  );
  const totalUnits = useMemo(
    () =>
      data.universities.reduce(
        (sum, u) => sum + (u.units || []).filter((un) => un.active !== false).length,
        0
      ),
    [data.universities]
  );

  const filteredUniversities = useMemo(() => {
    return data.universities.filter((u) => {
      const matchesProvince = provinceFilter === "all" || u.provinceId === provinceFilter;
      const haystack = `${u.name} ${u.code} ${accountHandle(u.accounts?.instagram)}`.toLowerCase();
      return matchesProvince && haystack.includes(campusQuery.trim().toLowerCase());
    });
  }, [data.universities, provinceFilter, campusQuery]);

  // Simpan perubahan ke backend
  async function persistCatalog(nextProvinces, nextUniversities, successMsg = "Struktur organisasi diperbarui.") {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        provinces: nextProvinces.map((p) => ({
          id: p.id,
          name: p.name,
          active: p.active !== false,
          accounts: {
            instagram: accountHandle(p.accounts?.instagram),
            whatsapp_channel: accountHandle(p.accounts?.whatsapp_channel),
          },
        })),
        universities: nextUniversities.map((u) => ({
          id: u.id,
          code: u.code,
          name: u.name,
          provinceId: u.provinceId,
          active: u.active !== false,
          accounts: {
            instagram: accountHandle(u.accounts?.instagram),
            whatsapp_channel: accountHandle(u.accounts?.whatsapp_channel),
          },
          emailDomains: u.emailDomains || [],
          units: (u.units || []).map((un) => ({
            id: un.id,
            code: un.code,
            name: un.name,
            active: un.active !== false,
          })),
        })),
      };

      await requestJson("/api/admin/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setData((prev) => ({
        ...prev,
        provinces: nextProvinces,
        universities: nextUniversities,
      }));
      setNotice(successMsg);
      setModal(null);
      await loadData();
    } catch (err) {
      if (modal) {
        setModalError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // Toggle Aktif Provinsi
  function toggleProvinceStatus(provinceId) {
    const updated = data.provinces.map((p) =>
      p.id === provinceId ? { ...p, active: !p.active } : p
    );
    persistCatalog(updated, data.universities, "Status provinsi diperbarui.");
  }

  // Toggle Aktif Universitas
  function toggleUniversityStatus(uniId) {
    const updated = data.universities.map((u) =>
      u.id === uniId ? { ...u, active: !u.active } : u
    );
    persistCatalog(data.provinces, updated, "Status universitas diperbarui.");
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">
            Kendali Jaringan Nasional
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Struktur Wilayah & Kampus
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Hierarki terstruktur Indonesia ➔ Provinsi ➔ Universitas ➔ Unit/Cabang. Pusat Single Source of Truth
            untuk penempatan produk, multi-account Instagram, dan routing komunikasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900 border border-emerald-200/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Superadmin Pusat
          </span>
        </div>
      </header>

      {/* ── STATS RINGKAS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-black text-slate-900">{activeProvinces.length}</p>
            <p className="text-[11px] font-bold text-slate-500">Provinsi Aktif</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-black text-slate-900">{activeUniversities.length}</p>
            <p className="text-[11px] font-bold text-slate-500">Universitas Terdaftar</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-black text-slate-900">{totalUnits}</p>
            <p className="text-[11px] font-bold text-slate-500">Unit / Cabang Kampus</p>
          </div>
        </div>
      </div>

      {/* ── NOTIFIKASI / ALERTS ── */}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-emerald-700 hover:text-emerald-950 p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── TAB NAVIGATION ── */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "overview"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Hierarki Nasional
        </button>
        <button
          onClick={() => setActiveTab("campuses")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "campuses"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <School className="h-4 w-4" />
          Universitas & Unit ({data.universities.length})
        </button>
        <button
          onClick={() => setActiveTab("provinces")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "provinces"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Provinsi & Kanal ({data.provinces.length})
        </button>
      </div>

      {loading ? (
        <div className="grid min-h-60 place-items-center rounded-2xl border border-slate-200/80 bg-white p-8">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <LoaderCircle className="h-6 w-6 animate-spin text-emerald-700" />
            <p className="text-xs font-bold">Memuat struktur wilayah...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════
              TAB 1: HIERARKI NASIONAL (VISUAL TREE VIEW)
             ══════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Peta Jaringan Kampus Nasional</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Struktur pohon organisasi dari tingkat provinsi hingga unit cabang kampus.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("campuses")}
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    Kelola Kampus <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {data.provinces.map((province) => {
                    const uniList = data.universities.filter((u) => u.provinceId === province.id);
                    const igProv = accountHandle(province.accounts?.instagram);
                    const waProv = accountHandle(province.accounts?.whatsapp_channel);

                    return (
                      <div
                        key={province.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-300"
                      >
                        {/* Provinsi Header Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-800 text-white font-black text-xs">
                              {province.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900">{province.name}</h4>
                                <span className="text-[10px] font-mono text-slate-400">({province.id})</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                    province.active !== false
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {province.active !== false ? "Aktif" : "Nonaktif"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Sosmed Provinsi */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                              <Camera className="h-3 w-3 text-pink-600" />
                              {igProv ? `@${igProv}` : <span className="text-slate-400">IG Belum diatur</span>}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700">
                              <Radio className="h-3 w-3 text-emerald-600" />
                              {waProv ? "Kanal WA Aktif" : <span className="text-slate-400">WA Belum diatur</span>}
                            </span>
                          </div>
                        </div>

                        {/* Kampus-kampus dalam provinsi */}
                        <div className="mt-3 pl-2 sm:pl-4 space-y-2.5">
                          {uniList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">
                              Belum ada universitas yang terdaftar pada provinsi ini.
                            </p>
                          ) : (
                            uniList.map((uni) => {
                              const igUni = accountHandle(uni.accounts?.instagram);
                              const waUni = accountHandle(uni.accounts?.whatsapp_channel);
                              const activeUnitsList = (uni.units || []).filter((un) => un.active !== false);

                              return (
                                <div
                                  key={uni.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-800">
                                      {uni.code || uni.id.toUpperCase().slice(0, 3)}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-xs font-black text-slate-900 truncate">{uni.name}</p>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                          {uni.code}
                                        </span>
                                        {!uni.active && (
                                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                            Nonaktif
                                          </span>
                                        )}
                                      </div>
                                      {/* Unit list */}
                                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                                        <span className="font-semibold text-slate-600">Cabang/Unit:</span>
                                        {activeUnitsList.length ? (
                                          activeUnitsList.map((un) => (
                                            <span
                                              key={un.id}
                                              className="rounded-sm bg-slate-50 border border-slate-200/60 px-1.5 py-0.2 text-[10px]"
                                            >
                                              {un.name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="italic text-slate-400">Hanya kampus utama</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto">
                                    {igUni && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                        <Camera className="h-2.5 w-2.5 text-pink-500" />
                                        @{igUni}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setModal({ type: "edit_campus", payload: { ...uni } })}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                                      title="Sunting data kampus"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: KELOLA UNIVERSITAS & UNIT
             ══════════════════════════════════════════════════ */}
          {activeTab === "campuses" && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={campusQuery}
                      onChange={(e) => setCampusQuery(e.target.value)}
                      placeholder="Cari universitas, kode, atau IG..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8.5 pr-3 text-xs outline-none focus:border-emerald-600"
                    />
                  </div>
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-emerald-600"
                  >
                    <option value="all">Semua Provinsi ({data.universities.length})</option>
                    {data.provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "add_campus",
                      payload: {
                        id: "",
                        code: "",
                        name: "",
                        provinceId: activeProvinces[0]?.id || "",
                        active: true,
                        accounts: { instagram: "", whatsapp_channel: "" },
                        emailDomains: [],
                        units: [],
                      },
                    })
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 text-xs font-extrabold text-white hover:bg-emerald-900 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Universitas
                </button>
              </div>

              {/* List Kartu Universitas Terbungkus */}
              <div className="grid grid-cols-1 gap-3">
                {filteredUniversities.map((uni) => {
                  const province = data.provinces.find((p) => p.id === uni.provinceId);
                  const ig = accountHandle(uni.accounts?.instagram);
                  const wa = accountHandle(uni.accounts?.whatsapp_channel);
                  const units = uni.units || [];

                  return (
                    <article
                      key={uni.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:border-slate-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs">
                            {uni.code || uni.id.toUpperCase().slice(0, 3)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{uni.name}</h4>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                                {uni.code}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  uni.active !== false
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {uni.active !== false ? "Aktif" : "Nonaktif"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Provinsi: <span className="font-semibold text-slate-700">{province?.name || uni.provinceId}</span> · ID:{" "}
                              <span className="font-mono">{uni.id}</span>
                            </p>

                            {/* Integrasi Sosmed & Kanal */}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                                <Camera className="h-3 w-3 text-pink-600" />
                                {ig ? `@${ig}` : <span className="text-slate-400">IG opsional (belum ada)</span>}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                                <Radio className="h-3 w-3 text-emerald-600" />
                                {wa ? "Kanal WA Khusus" : <span className="text-slate-400">WA opsional (belum ada)</span>}
                              </span>
                              {uni.emailDomains?.length ? (
                                <span className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-[11px] font-mono text-slate-600">
                                  {uni.emailDomains.join(", ")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => setModal({ type: "edit_campus", payload: { ...uni } })}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3 w-3" /> Sunting
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ type: "manage_units", payload: { ...uni } })}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                          >
                            <Layers className="h-3 w-3" /> Kelola Cabang ({units.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleUniversityStatus(uni.id)}
                            className={`text-[10px] font-bold px-2 py-1 transition hover:underline ${
                              uni.active !== false ? "text-slate-500" : "text-emerald-700"
                            }`}
                          >
                            {uni.active !== false ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </div>

                      {/* Display Units */}
                      {units.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                            Daftar Unit Kampus / Cabang ({units.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {units.map((unit) => (
                              <span
                                key={unit.id}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${
                                  unit.active !== false
                                    ? "bg-slate-50 border-slate-200 text-slate-700"
                                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                }`}
                              >
                                <span className="font-bold">{unit.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">({unit.code})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {filteredUniversities.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-400">
                    Tidak ada universitas yang cocok dengan filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: KELOLA PROVINSI & KANAL
             ══════════════════════════════════════════════════ */}
          {activeTab === "provinces" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Daftar Provinsi Resmi</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Setiap provinsi wajib memiliki akun Instagram resmi dan tautan/JID WhatsApp channel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "add_province",
                      payload: {
                        id: "",
                        name: "",
                        active: true,
                        accounts: { instagram: "", whatsapp_channel: "" },
                      },
                    })
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 text-xs font-extrabold text-white hover:bg-emerald-900 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Provinsi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.provinces.map((prov) => {
                  const ig = accountHandle(prov.accounts?.instagram);
                  const wa = accountHandle(prov.accounts?.whatsapp_channel);
                  const campusCount = data.universities.filter((u) => u.provinceId === prov.id).length;

                  return (
                    <article
                      key={prov.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100/60 font-black text-emerald-800 text-xs">
                            {prov.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{prov.name}</h4>
                            <p className="text-[11px] font-mono text-slate-400">Kode: {prov.id}</p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            prov.active !== false
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {prov.active !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Camera className="h-3.5 w-3.5 text-pink-600" /> Instagram:
                          </span>
                          <span className="font-mono text-slate-800">
                            {ig ? `@${ig}` : <span className="text-rose-500 font-sans">Belum diisi</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Radio className="h-3.5 w-3.5 text-emerald-600" /> Kanal WA:
                          </span>
                          <span className="truncate max-w-[200px] text-right font-mono text-slate-800">
                            {wa || <span className="text-rose-500 font-sans">Belum diisi</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                          <span>Universitas di provinsi:</span>
                          <span className="font-bold text-slate-800">{campusCount} Kampus</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => toggleProvinceStatus(prov.id)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                        >
                          {prov.active !== false ? "Nonaktifkan" : "Aktifkan"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setModal({ type: "edit_province", payload: { ...prov } })}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" /> Sunting
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: TAMBAH / SUNTING UNIVERSITAS
         ══════════════════════════════════════════════════ */}
      {(modal?.type === "add_campus" || modal?.type === "edit_campus") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {modal.type === "add_campus" ? "Tambah Universitas Baru" : "Sunting Data Universitas"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setModalError("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {modalError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = modal.payload;
                const nextUni =
                  modal.type === "add_campus"
                    ? [...data.universities, form]
                    : data.universities.map((u) => (u.id === form.id ? form : u));
                persistCatalog(data.provinces, nextUni, "Data universitas berhasil disimpan.");
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] font-bold text-slate-700">
                  Kode ID (Slug)
                  <input
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={modal.payload.id}
                    disabled={modal.type === "edit_campus"}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        payload: { ...modal.payload, id: slugify(e.target.value) },
                      })
                    }
                    placeholder="usu"
                    className={inputStyle}
                  />
                </label>

                <label className="block text-[11px] font-bold text-slate-700">
                  Nama Singkat
                  <input
                    required
                    maxLength={32}
                    value={modal.payload.code}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        payload: { ...modal.payload, code: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="USU"
                    className={inputStyle}
                  />
                </label>
              </div>

              <label className="block text-[11px] font-bold text-slate-700">
                Nama Resmi Universitas
                <input
                  required
                  maxLength={160}
                  value={modal.payload.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const id = modal.type === "add_campus" && !modal.payload.id ? slugify(name) : modal.payload.id;
                    setModal({ ...modal, payload: { ...modal.payload, name, id } });
                  }}
                  placeholder="Universitas Sumatera Utara"
                  className={inputStyle}
                />
              </label>

              <label className="block text-[11px] font-bold text-slate-700">
                Provinsi Wilayah
                <select
                  required
                  value={modal.payload.provinceId}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      payload: { ...modal.payload, provinceId: e.target.value },
                    })
                  }
                  className={inputStyle}
                >
                  <option value="">Pilih Provinsi</option>
                  {activeProvinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Instagram (Opsional)
                  <input
                    maxLength={31}
                    value={accountHandle(modal.payload.accounts?.instagram)}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        payload: {
                          ...modal.payload,
                          accounts: {
                            ...(modal.payload.accounts || {}),
                            instagram: e.target.value.replace(/^@/, "").toLowerCase(),
                          },
                        },
                      })
                    }
                    placeholder="usu.menfes"
                    className={inputStyle}
                  />
                </label>

                <label className="block text-[11px] font-bold text-slate-700">
                  Kanal WhatsApp (Opsional)
                  <input
                    maxLength={200}
                    value={accountHandle(modal.payload.accounts?.whatsapp_channel)}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        payload: {
                          ...modal.payload,
                          accounts: {
                            ...(modal.payload.accounts || {}),
                            whatsapp_channel: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://whatsapp.com/channel/..."
                    className={inputStyle}
                  />
                </label>
              </div>

              <label className="block text-[11px] font-bold text-slate-700">
                Domain Email Kampus (Dipisah Koma)
                <input
                  value={(modal.payload.emailDomains || []).join(", ")}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      payload: {
                        ...modal.payload,
                        emailDomains: e.target.value
                          .split(",")
                          .map((d) => d.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  placeholder="usu.ac.id, students.usu.ac.id"
                  className={inputStyle}
                />
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setModalError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Kampus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: TAMBAH / SUNTING PROVINSI
         ══════════════════════════════════════════════════ */}
      {(modal?.type === "add_province" || modal?.type === "edit_province") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {modal.type === "add_province" ? "Tambah Provinsi Baru" : "Sunting Data Provinsi"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setModalError("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {modalError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = modal.payload;
                const nextProv =
                  modal.type === "add_province"
                    ? [...data.provinces, form]
                    : data.provinces.map((p) => (p.id === form.id ? form : p));
                persistCatalog(nextProv, data.universities, "Data provinsi berhasil disimpan.");
              }}
              className="mt-4 space-y-3"
            >
              <label className="block text-[11px] font-bold text-slate-700">
                Kode ID Provinsi (Slug)
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={modal.payload.id}
                  disabled={modal.type === "edit_province"}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      payload: { ...modal.payload, id: slugify(e.target.value) },
                    })
                  }
                  placeholder="sumatera-utara"
                  className={inputStyle}
                />
              </label>

              <label className="block text-[11px] font-bold text-slate-700">
                Nama Resmi Provinsi
                <input
                  required
                  maxLength={100}
                  value={modal.payload.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const id = modal.type === "add_province" && !modal.payload.id ? slugify(name) : modal.payload.id;
                    setModal({ ...modal, payload: { ...modal.payload, name, id } });
                  }}
                  placeholder="Sumatera Utara"
                  className={inputStyle}
                />
              </label>

              <label className="block text-[11px] font-bold text-slate-700">
                Instagram Resmi Provinsi (Wajib untuk Akun Aktif)
                <input
                  required={modal.payload.active !== false}
                  maxLength={31}
                  value={accountHandle(modal.payload.accounts?.instagram)}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      payload: {
                        ...modal.payload,
                        accounts: {
                          ...(modal.payload.accounts || {}),
                          instagram: e.target.value.replace(/^@/, "").toLowerCase(),
                        },
                      },
                    })
                  }
                  placeholder="jualbelidikampus"
                  className={inputStyle}
                />
              </label>

              <label className="block text-[11px] font-bold text-slate-700">
                Kanal WhatsApp Provinsi (Wajib untuk Akun Aktif)
                <input
                  required={modal.payload.active !== false}
                  maxLength={200}
                  value={accountHandle(modal.payload.accounts?.whatsapp_channel)}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      payload: {
                        ...modal.payload,
                        accounts: {
                          ...(modal.payload.accounts || {}),
                          whatsapp_channel: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="https://whatsapp.com/channel/... atau @newsletter"
                  className={inputStyle}
                />
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setModalError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Provinsi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: KELOLA UNIT / CABANG KAMPUS
         ══════════════════════════════════════════════════ */}
      {modal?.type === "manage_units" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Kelola Cabang / Unit · {modal.payload.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cabang kampus menjadi unit di bawah universitas, bukan entitas duplikat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setModalError("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {modalError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {/* List unit yang sudah ada */}
              <div className="space-y-2">
                {(modal.payload.units || []).map((unit, uIdx) => (
                  <div
                    key={unit.id || uIdx}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{unit.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        Kode: {unit.code} · ID: {unit.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUnits = modal.payload.units.map((un, i) =>
                            i === uIdx ? { ...un, active: !un.active } : un
                          );
                          setModal({
                            ...modal,
                            payload: { ...modal.payload, units: updatedUnits },
                          });
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          unit.active !== false
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {unit.active !== false ? "Aktif" : "Nonaktif"}
                      </button>

                      {unit._isNew && (
                        <button
                          type="button"
                          onClick={() => {
                            const updatedUnits = modal.payload.units.filter((_, i) => i !== uIdx);
                            setModal({
                              ...modal,
                              payload: { ...modal.payload, units: updatedUnits },
                            });
                          }}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(modal.payload.units || []).length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400 italic">
                    Belum ada unit/cabang terdaftar. Tambahkan cabang pertama di bawah.
                  </p>
                )}
              </div>

              {/* Form tambah cabang baru */}
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 p-3 space-y-2">
                <p className="text-[11px] font-extrabold text-emerald-900">+ Tambah Cabang Baru</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="newUnitName"
                    placeholder="Nama Cabang (misal: Kampus Padang Bulan)"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-emerald-600"
                  />
                  <input
                    id="newUnitCode"
                    placeholder="Kode (misal: PADANG_BULAN)"
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-emerald-600 uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById("newUnitName");
                    const codeInput = document.getElementById("newUnitCode");
                    const name = nameInput.value.trim();
                    const code = (codeInput.value.trim() || slugify(name)).toUpperCase().replaceAll("-", "_");
                    if (!name) return;

                    const id = `${modal.payload.id}-${slugify(code || name)}`;
                    const newUnit = { id, code, name, active: true, _isNew: true };

                    setModal({
                      ...modal,
                      payload: {
                        ...modal.payload,
                        units: [...(modal.payload.units || []), newUnit],
                      },
                    });

                    nameInput.value = "";
                    codeInput.value = "";
                  }}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Tambahkan ke Daftar
                </button>
              </div>

              {/* Save changes to backend */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setModalError("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const nextUniversities = data.universities.map((u) =>
                      u.id === modal.payload.id ? modal.payload : u
                    );
                    persistCatalog(data.provinces, nextUniversities, "Cabang/Unit kampus berhasil diperbarui.");
                  }}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Perubahan Unit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
