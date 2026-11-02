"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Building2,
  Package,
  TrendingUp,
  Share2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  MapPin,
  ChevronRight,
  Layers,
  Sparkles,
  Check,
  FileText,
  CheckCheck,
  Filter,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

export default function NationalAnalyticsWorkspace({ superadmin = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'regions' | 'social_health' | 'rollout'
  const [updatingChecklist, setUpdatingChecklist] = useState(null);
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState("all");
  const [editingNotesStage, setEditingNotesStage] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/national", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setData(json);
      } else {
        toast.error(json.error || "Gagal memuat analitik nasional.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleChecklist = async (provinceId, itemKey, currentValue) => {
    setUpdatingChecklist(`${provinceId}:${itemKey}`);
    try {
      const res = await fetch("/api/admin/analytics/national", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_checklist",
          provinceId,
          itemKey,
          value: !currentValue,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Checklist berhasil diperbarui.");
        loadData();
      } else {
        toast.error(json.error || "Gagal memperbarui checklist.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setUpdatingChecklist(null);
    }
  };

  const handleUpdateStageStatus = async (provinceId, newStatus) => {
    try {
      const res = await fetch("/api/admin/analytics/national", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_stage_status",
          provinceId,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Status peluncuran wilayah diubah ke: ${newStatus}`);
        loadData();
      } else {
        toast.error(json.error || "Gagal memperbarui status peluncuran.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  const handleMarkAllSop = async (provinceId, value) => {
    try {
      const res = await fetch("/api/admin/analytics/national", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_all_sop",
          provinceId,
          value,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(value ? "Semua SOP berhasil ditandai terpenuhi." : "Status SOP berhasil direset.");
        loadData();
      } else {
        toast.error(json.error || "Gagal mengubah status SOP.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  const handleSaveNotes = async (provinceId) => {
    try {
      const res = await fetch("/api/admin/analytics/national", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_notes",
          provinceId,
          notes: notesDraft,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Catatan lapangan peluncuran berhasil disimpan.");
        setEditingNotesStage(null);
        loadData();
      } else {
        toast.error(json.error || "Gagal menyimpan catatan.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  const handleStartEditNotes = (stage) => {
    setEditingNotesStage(stage.province_id);
    setNotesDraft(stage.notes || "");
  };

  if (loading && !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-400">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-bold text-slate-700">Memuat Dashboard Analitik Nasional...</p>
          <p className="mt-1 text-xs text-slate-400">Menghubungkan data multi-provinsi dan performa saluran.</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const channelPerformance = data?.channelPerformance || [];
  const provincesBreakdown = data?.provincesBreakdown || [];
  const universitiesBreakdown = data?.universitiesBreakdown || [];
  const socialHealth = data?.socialHealth || [];
  const rolloutRoadmap = data?.rolloutRoadmap || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Utama */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
              {superadmin ? "National Central Command" : "Regional Command"}
            </span>
            <span className="text-xs font-semibold text-slate-400">v2.0 Social Commerce</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Analitik Nasional JualBeliDiKampus
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Pusat kendali metrik pertumbuhan sosial commerce kampus, konversi omnichannel, dan rollout multi-provinsi.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Cards Ringkasan Nasional */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Provinsi Aktif</span>
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.totalProvinces || 0}{" "}
            <span className="text-xs font-normal text-slate-400">Provinsi</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-emerald-600">8 Terdaftar di Sistem</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Kampus Terdaftar</span>
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.totalUniversities || 0}{" "}
            <span className="text-xs font-normal text-slate-400">Kampus</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-indigo-600">Tersebar di 6 Wilayah</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Produk Aktif</span>
            <Package className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.activeListings || 0}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Total {summary.totalListings || 0} listing
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Estimasi GMV</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-800">
            Rp {(summary.totalGmv || 0).toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            {summary.totalTransactions || 0} barang terjual
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Integrasi Sosial</span>
            <ShieldCheck className="h-4 w-4 text-teal-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.healthyAccountsCount || 0} / {summary.socialAccountsCount || 0}
          </p>
          <p className="mt-1 text-[11px] font-medium text-teal-600">Akun IG & WA Terhubung</p>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Kesiapan Rollout</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700">
            {summary.nationalRolloutReadiness || 0}%
          </p>
          <p className="mt-1 text-[11px] font-medium text-purple-600">SOP 6 Wilayah Terpenuhi</p>
        </div>
      </div>

      {/* Navigasi Tab Workspace */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold whitespace-nowrap transition ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Share2 className="h-4 w-4" />
          Performa Saluran (Omnichannel)
        </button>

        <button
          onClick={() => setActiveTab("regions")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold whitespace-nowrap transition ${
            activeTab === "regions"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Peta & Distribusi Wilayah
        </button>

        <button
          onClick={() => setActiveTab("social_health")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold whitespace-nowrap transition ${
            activeTab === "social_health"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Health Check Integrasi Sosial
        </button>

        <button
          onClick={() => setActiveTab("rollout")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold whitespace-nowrap transition ${
            activeTab === "rollout"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Roadmap Rollout Nasional (6 Tahap)
        </button>
      </div>

      {/* Tab 1: Performa Omnichannel */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Performa Distribusi & Konversi Kanal (Omnichannel Conversion)
                </h3>
                <p className="text-xs text-slate-500">
                  Tingkat keberhasilan publikasi produk di seluruh ekosistem: Website, Instagram, dan WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {channelPerformance.map((ch) => (
                <div
                  key={ch.channelType}
                  className="rounded-2xl border border-slate-200 p-5 bg-slate-50/40 hover:bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">{ch.label}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {ch.successRate}% Sukses
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{ch.published}</span>
                    <span className="text-xs text-slate-500">dari {ch.total} penyiaran</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${ch.successRate}%` }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-[11px] text-slate-500">
                    <span>Terbit: {ch.published}</span>
                    <span>Terjadwal: {ch.scheduled}</span>
                    <span className={ch.failed > 0 ? "font-bold text-rose-600" : ""}>
                      Gagal: {ch.failed}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Peta & Distribusi Wilayah */}
      {activeTab === "regions" && (() => {
        const filteredProvinces = selectedProvinceFilter === "all"
          ? provincesBreakdown
          : provincesBreakdown.filter((p) => p.id === selectedProvinceFilter);

        const currentProvObj = provincesBreakdown.find((p) => p.id === selectedProvinceFilter);
        const filteredUniversities = selectedProvinceFilter === "all"
          ? universitiesBreakdown
          : universitiesBreakdown.filter(
              (u) =>
                u.provinceId === selectedProvinceFilter ||
                u.provinceName?.toLowerCase() === currentProvObj?.name?.toLowerCase()
            );

        return (
          <div className="space-y-6">
            {/* Toolbar Filter & Cetak Laporan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Filter Wilayah:</span>
                <select
                  value={selectedProvinceFilter}
                  onChange={(e) => setSelectedProvinceFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500"
                >
                  <option value="all">Semua Provinsi ({provincesBreakdown.length})</option>
                  {provincesBreakdown.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.universitiesCount} Kampus)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Cetak / Ekspor PDF</span>
                </button>
              </div>
            </div>

            {/* Breakdown Provinsi */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">Distribusi Produk per Provinsi</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tinjauan volume bursa kampus, universitas terafiliasi, dan GMV per provinsi di Indonesia.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Provinsi</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Kampus</th>
                      <th className="py-3 px-4 text-center">Total Listing</th>
                      <th className="py-3 px-4 text-center">Aktif</th>
                      <th className="py-3 px-4">Kategori Unggulan</th>
                      <th className="py-3 px-4 text-right">Estimasi GMV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProvinces.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === "active"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {p.universitiesCount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {p.totalListings}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                          {p.activeListings}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">{p.topCategory}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          Rp {Number(p.gmv || 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Breakdown Kampus & Produk Populer */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">Performa per Universitas / Kampus</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volume listing aktif dan sampel produk unggulan per kampus.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUniversities.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400">
                    Tidak ada universitas yang sesuai dengan filter wilayah ini.
                  </div>
                ) : (
                  filteredUniversities.map((u) => (
                    <div
                      key={u.code}
                      className="rounded-2xl border border-slate-200 p-5 bg-white hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-black text-indigo-700">
                          {u.code}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {u.activeListings} Aktif
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900 truncate">{u.name}</h4>
                      <p className="text-[11px] text-slate-500">Provinsi: {u.provinceName}</p>

                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400 font-semibold">Produk Populer:</span>
                        {u.topProducts.length === 0 ? (
                          <p className="mt-1 text-[11px] text-slate-400 italic">Belum ada listing aktif.</p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {u.topProducts.map((p) => (
                              <li key={p.id} className="truncate text-slate-700 font-medium">
                                • {p.title} <span className="text-slate-400">(Rp {Number(p.price).toLocaleString("id-ID")})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab 3: Health Check Integrasi Sosial */}
      {activeTab === "social_health" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Health Check Integrasi Sosial Media Wilayah
              </h3>
              <p className="text-xs text-slate-500">
                Monitoring status otentikasi Meta Graph API (Instagram) dan Baileys Gateway (WhatsApp) di setiap daerah.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {socialHealth.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl text-white ${
                      acc.provider === "instagram" ? "bg-pink-600" : "bg-emerald-600"
                    }`}
                  >
                    {acc.provider === "instagram" ? <Share2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{acc.handle}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                        {acc.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cakupan: {acc.regionName || acc.scopeType} ·{" "}
                      {acc.lastCheckedAt
                        ? `Diperiksa: ${new Date(acc.lastCheckedAt).toLocaleTimeString("id-ID")}`
                        : "Belum pernah diperiksa"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {acc.isHealthy ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Terkoneksi Sehat
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                      <Clock className="h-4 w-4 text-amber-600" /> Butuh Autentikasi
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Roadmap & Checklist Rollout Multi-Provinsi (Tahap 1–6) */}
      {activeTab === "rollout" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Roadmap Peluncuran Multi-Provinsi Nasional (Tahap 1 – 6)
                </h3>
                <p className="text-xs text-slate-500">
                  Standar Operasional Prosedur (SOP) 7 poin verifikasi kesiapan provinsi sebelum peluncuran resmi.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200">
                <Sparkles className="h-4 w-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-900">
                  Kesiapan Nasional: {summary.nationalRolloutReadiness || 0}%
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {rolloutRoadmap.map((stage) => {
                const isFullyLaunched = stage.status === "fully_launched";
                const isPilotActive = stage.status === "pilot_active";
                const isOnboarding = stage.status === "onboarding";

                const checklistItems = [
                  { key: "instagram_setup", label: "Setup Instagram Resmi Provinsi" },
                  { key: "whatsapp_channel_setup", label: "Setup WhatsApp Channel Provinsi" },
                  { key: "admin_assigned", label: "Penunjukan & Aktivasi Admin Provinsi" },
                  { key: "first_university_verified", label: "Verifikasi Universitas Pertama" },
                  { key: "dm_routing_tested", label: "Pengujian Routing DM Inbound" },
                  { key: "channel_posting_tested", label: "Pengujian Siaran ke Saluran" },
                  { key: "bursa_transaction_tested", label: "Uji Coba Transaksi Bursa Kampus" },
                ];

                const completedCount = checklistItems.filter((item) => stage[item.key]).length;
                const readinessPct = Math.round((completedCount / 7) * 100);
                const isEditingNotes = editingNotesStage === stage.province_id;

                return (
                  <div
                    key={stage.id}
                    className="rounded-2xl border border-slate-200 p-6 bg-white hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-black text-white">
                            Tahap {stage.stage_number}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900">
                            {stage.provinces?.name || stage.province_id}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isFullyLaunched
                                ? "bg-emerald-100 text-emerald-800"
                                : isPilotActive
                                ? "bg-indigo-100 text-indigo-800"
                                : isOnboarding
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {stage.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Anchor Universities */}
                        {stage.anchorUniversities && stage.anchorUniversities.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-400">Kampus Anchor:</span>
                            {stage.anchorUniversities.map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
                                title={u.name}
                              >
                                <Building2 className="h-3 w-3" />
                                {u.code} · {u.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 max-w-md">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>SOP Kesiapan Wilayah:</span>
                            <span className="font-extrabold text-slate-800">{readinessPct}% ({completedCount}/7)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                readinessPct === 100
                                  ? "bg-emerald-600"
                                  : readinessPct >= 50
                                  ? "bg-indigo-600"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${readinessPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2.5">
                        {/* Selector Status Peluncuran */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Status Wilayah:</span>
                          <select
                            value={stage.status}
                            onChange={(e) => handleUpdateStageStatus(stage.province_id, e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 focus:border-emerald-500 shadow-xs"
                          >
                            <option value="draft">Draft Persiapan</option>
                            <option value="onboarding">Onboarding</option>
                            <option value="pilot_active">Pilot Aktif</option>
                            <option value="fully_launched">Peluncuran Penuh (Live)</option>
                          </select>
                        </div>

                        {/* Superadmin Bulk SOP Action */}
                        {superadmin && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkAllSop(stage.province_id, true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-xs"
                            >
                              <CheckCheck className="h-3.5 w-3.5" /> Semua Lolos
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkAllSop(stage.province_id, false)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checklist 7 Poin */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {checklistItems.map((item) => {
                        const isChecked = stage[item.key];
                        const isUpdating = updatingChecklist === `${stage.province_id}:${item.key}`;
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleToggleChecklist(stage.province_id, item.key, isChecked)}
                            className={`cursor-pointer rounded-xl border p-3 transition flex items-center justify-between ${
                              isChecked
                                ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-xs font-bold leading-snug">{item.label}</span>
                            <div
                              className={`grid h-5 w-5 place-items-center rounded-md border ${
                                isChecked
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isUpdating ? (
                                <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                              ) : isChecked ? (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Catatan Lapangan / Progress Rollout */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>Catatan Lapangan &amp; Partnership:</span>
                        </div>
                        {!isEditingNotes && (
                          <button
                            type="button"
                            onClick={() => handleStartEditNotes(stage)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            {stage.notes ? "Edit Catatan" : "+ Tambah Catatan"}
                          </button>
                        )}
                      </div>

                      {isEditingNotes ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={3}
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Tuliskan catatan kemajuan partnership BEM, perekrutan admin kampus, atau jadwal launching..."
                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNotesStage(null)}
                              className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveNotes(stage.province_id)}
                              className="px-3.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                            >
                              Simpan Catatan
                            </button>
                          </div>
                        </div>
                      ) : stage.notes ? (
                        <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                          {stage.notes}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400 italic">
                          Belum ada catatan lapangan untuk tahap ini.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

