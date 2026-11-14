"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, Ban, CheckCircle2, Megaphone, ShieldAlert, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";

export default function EmergencyCockpitPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    emergencyBanner: { active: false, text: "", level: "warning", link: "" },
    platformLockdown: { active: false, message: "" },
    blacklist: [],
    totalActiveListings: 0,
  });

  const [savingBanner, setSavingBanner] = useState(false);
  const [savingLockdown, setSavingLockdown] = useState(false);
  const [addingWa, setAddingWa] = useState("");
  const [addingReason, setAddingReason] = useState("");
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/emergency", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat status darurat");
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveBanner(e) {
    e.preventDefault();
    try {
      setSavingBanner(true);
      const res = await fetch("/api/admin/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_banner",
          active: data.emergencyBanner.active,
          text: data.emergencyBanner.text,
          level: data.emergencyBanner.level,
          link: data.emergencyBanner.link,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan banner");
      toast.success("Pengumuman darurat berhasil diperbarui");
      setData((prev) => ({ ...prev, emergencyBanner: json.emergencyBanner }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingBanner(false);
    }
  }

  async function handleToggleLockdown() {
    const nextState = !data.platformLockdown.active;
    const confirmText = nextState
      ? "PERINGATAN: Mengaktifkan mode lockdown akan membekukan pembuatan postingan dan pembayaran baru untuk seluruh pengguna platform. Lanjutkan?"
      : "Nonaktifkan mode lockdown dan pulihkan operasi normal platform?";

    if (!window.confirm(confirmText)) return;

    try {
      setSavingLockdown(true);
      const res = await fetch("/api/admin/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lockdown",
          active: nextState,
          message: data.platformLockdown.message,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengubah mode lockdown");
      toast.success(nextState ? "Platform berada dalam mode LOCKDOWN!" : "Mode lockdown telah dicabut. Operasi normal.");
      setData((prev) => ({ ...prev, platformLockdown: json.platformLockdown }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingLockdown(false);
    }
  }

  async function handleAddBlacklist(e) {
    e.preventDefault();
    if (!addingWa.trim()) return toast.error("Masukkan nomor WhatsApp");

    try {
      setSubmittingBlacklist(true);
      const res = await fetch("/api/admin/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_blacklist",
          wa: addingWa,
          reason: addingReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambahkan nomor");
      toast.success("Nomor berhasil diblacklist dan iklan aktifnya telah dibekukan");
      setAddingWa("");
      setAddingReason("");
      loadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmittingBlacklist(false);
    }
  }

  async function handleRemoveBlacklist(id, wa) {
    if (!window.confirm(`Hapus nomor ${wa} dari daftar hitam?`)) return;

    try {
      const res = await fetch("/api/admin/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_blacklist", id, wa }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Nomor dihapus dari daftar hitam");
      setData((prev) => ({
        ...prev,
        blacklist: prev.blacklist.filter((item) => item.id !== id),
      }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  const filteredBlacklist = data.blacklist.filter((item) =>
    (item.wa || "").includes(searchFilter) || (item.reason || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900">Pusat Kendali Darurat & Blacklist</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Kendali pertahanan instan: Siaran ticker darurat, penguncian transaksi platform, dan pembekuan nomor penipu.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600 active:opacity-85"
        >
          {loading ? "Memuat..." : "Segarkan Status"}
        </button>
      </div>

      {/* Status Badges Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4.5 transition ${data.platformLockdown.active ? "border-rose-300 bg-rose-50" : "border-slate-200/80 bg-white"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Mode Operasi</span>
            <AlertOctagon className={`h-4 w-4 ${data.platformLockdown.active ? "text-rose-600" : "text-emerald-600"}`} />
          </div>
          <p className={`mt-2 text-xl font-black ${data.platformLockdown.active ? "text-rose-700" : "text-slate-900"}`}>
            {data.platformLockdown.active ? "LOCKDOWN AKTIF" : "Normal"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {data.platformLockdown.active ? "Pemasangan iklan & bayar dibekukan" : "Seluruh jalur transaksi berjalan lancar"}
          </p>
        </div>

        <div className={`rounded-2xl border p-4.5 transition ${data.emergencyBanner.active ? "border-amber-300 bg-amber-50" : "border-slate-200/80 bg-white"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Banner Pengumuman</span>
            <Megaphone className={`h-4 w-4 ${data.emergencyBanner.active ? "text-amber-600" : "text-slate-400"}`} />
          </div>
          <p className={`mt-2 text-xl font-black ${data.emergencyBanner.active ? "text-amber-900" : "text-slate-900"}`}>
            {data.emergencyBanner.active ? "Siaran Live" : "Mati / Senyap"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {data.emergencyBanner.active ? `Level: ${data.emergencyBanner.level}` : "Tidak ada banner darurat yang tampil"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Daftar Hitam</span>
            <UserX className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">{data.blacklist.length} Nomor</p>
          <p className="mt-1 text-[11px] text-slate-400">Nomor WA penipu yang diblokir permanen</p>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Ticker & Platform Lockdown */}
        <div className="space-y-6">
          {/* Emergency Ticker Form */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Megaphone className="h-4 w-4 text-emerald-800" />
              <h2 className="text-sm font-black text-slate-900">Banner Pengumuman Situs</h2>
            </div>

            <form onSubmit={handleSaveBanner} className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <span className="text-xs font-bold text-slate-900">Aktifkan Banner di Header Publik</span>
                  <p className="text-[11px] text-slate-500">Tampil mencolok di bagian paling atas untuk semua pengunjung</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={data.emergencyBanner.active}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        emergencyBanner: { ...prev.emergencyBanner, active: e.target.checked },
                      }))
                    }
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Tingkat Peringatan</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    { id: "info", label: "Info (Biru)", color: "border-sky-300 bg-sky-50 text-sky-900" },
                    { id: "warning", label: "Waspada (Kuning)", color: "border-amber-300 bg-amber-50 text-amber-900" },
                    { id: "danger", label: "Bahaya (Merah)", color: "border-rose-300 bg-rose-50 text-rose-900" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          emergencyBanner: { ...prev.emergencyBanner, level: lvl.id },
                        }))
                      }
                      className={`rounded-xl border py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-emerald-600 active:opacity-85 ${
                        data.emergencyBanner.level === lvl.id ? `${lvl.color} ring-2 ring-emerald-600/30` : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Teks Pengumuman</label>
                <textarea
                  rows={3}
                  value={data.emergencyBanner.text}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      emergencyBanner: { ...prev.emergencyBanner, text: e.target.value },
                    }))
                  }
                  placeholder="Contoh: Waspada penipuan modus sewa kos di sekitar USU. Selalu transaksi langsung (COD) di area kampus."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Tautan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={data.emergencyBanner.link}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      emergencyBanner: { ...prev.emergencyBanner, link: e.target.value },
                    }))
                  }
                  placeholder="https://... atau /panduan-cod"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={savingBanner}
                className="w-full rounded-xl bg-emerald-800 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-600 active:opacity-85 disabled:opacity-50"
              >
                {savingBanner ? "Menyimpan..." : "Simpan & Terapkan Pengumuman"}
              </button>
            </form>
          </div>

          {/* Platform Lockdown Box */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-black text-rose-950">Platform Lockdown (Saklar Darurat)</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-rose-900">
              Gunakan hanya saat insiden kritis (misal: serangan bot penipuan massal, investigasi pihak kampus/kepolisian). Saat aktif, pengguna umum tidak dapat membuat listing atau membayar QRIS, sedangkan panel admin tetap dapat diakses penuh.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Pesan Alasan untuk Pengunjung</label>
              <input
                type="text"
                value={data.platformLockdown.message}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    platformLockdown: { ...prev.platformLockdown, message: e.target.value },
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleLockdown}
              disabled={savingLockdown}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black text-white transition focus-visible:outline-2 active:opacity-85 disabled:opacity-50 ${
                data.platformLockdown.active ? "bg-slate-800 hover:bg-slate-900" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <Ban className="h-4 w-4" />
              {savingLockdown
                ? "Memproses..."
                : data.platformLockdown.active
                ? "CABUT LOCKDOWN (PULIHKAN)"
                : "AKTIFKAN LOCKDOWN SEKARANG"}
            </button>
          </div>
        </div>

        {/* Right Column: Central Blacklist Manager */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-black text-slate-900">Daftar Hitam Penipu (Blacklist)</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {filteredBlacklist.length} terdaftar
            </span>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddBlacklist} className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <p className="text-xs font-bold text-slate-800">Tambah ke Daftar Hitam</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={addingWa}
                onChange={(e) => setAddingWa(e.target.value)}
                placeholder="Nomor WA (contoh: 0812...)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
              <input
                type="text"
                value={addingReason}
                onChange={(e) => setAddingReason(e.target.value)}
                placeholder="Alasan (contoh: Penipu DP Kos)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submittingBlacklist}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600 active:opacity-85 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              {submittingBlacklist ? "Menyimpan..." : "Blacklist & Bekukan Iklan"}
            </button>
          </form>

          {/* Filter Search */}
          <div className="mt-4">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cari nomor atau alasan..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Blacklist Items Table */}
          <div className="mt-3 max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {filteredBlacklist.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {searchFilter ? "Tidak ada nomor yang cocok." : "Daftar hitam masih bersih."}
              </div>
            ) : (
              filteredBlacklist.map((item) => (
                <div key={item.id || item.wa} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.wa}</span>
                      <a
                        href={`https://wa.me/${item.wa.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-emerald-800 hover:underline"
                      >
                        Buka WA ↗
                      </a>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-rose-600 font-medium">
                      {item.reason || "Pelanggaran ketentuan"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlacklist(item.id, item.wa)}
                    title="Hapus dari blacklist"
                    className="ml-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-rose-600 active:opacity-85"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
