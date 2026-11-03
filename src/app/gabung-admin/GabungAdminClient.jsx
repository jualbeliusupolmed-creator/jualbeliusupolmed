"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/Icons";
import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
} from "lucide-react";

export default function GabungAdminClient() {
  const [provinces, setProvinces] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loadingKatalog, setLoadingKatalog] = useState(true);

  const [form, setForm] = useState({
    provinceId: "",
    universityId: "",
    name: "",
    email: "",
    wa: "",
    instagram: "",
    motivation: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUserLoggedIn(Boolean(data?.loggedIn));
        if (data?.loggedIn && data?.wa) setForm((prev) => ({ ...prev, wa: data.wa }));
      })
      .catch(() => setUserLoggedIn(false))
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    fetch("/api/kampus", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok) {
          if (Array.isArray(data.provinces)) setProvinces(data.provinces);
          if (Array.isArray(data.campuses)) {
            setCampuses(data.campuses);
            if (data.campuses.length > 0) {
              const first = data.campuses[0];
              setForm((prev) => ({
                ...prev,
                provinceId: first.provinceId || "sumatera-utara",
                universityId: first.id,
              }));
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingKatalog(false));
  }, []);

  const availableCampuses = campuses.filter(
    (c) => !form.provinceId || c.provinceId === form.provinceId
  );

  const handleProvinceChange = (pId) => {
    setForm((prev) => {
      const filtered = campuses.filter((c) => c.provinceId === pId);
      return {
        ...prev,
        provinceId: pId,
        universityId: filtered[0]?.id || "",
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userLoggedIn) return toast.error("Masuk ke akun Jual Beli Kampus Kita terlebih dahulu.");
    if (!form.name.trim()) return toast.error("Nama lengkap wajib diisi.");
    if (!form.email.trim()) return toast.error("Alamat email wajib diisi.");
    if (!form.wa.trim()) return toast.error("Nomor WhatsApp wajib diisi.");
    if (!form.universityId) return toast.error("Pilih universitas tujuan.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin-requests/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim formulir.");

      const selectedUniv = campuses.find((c) => c.id === form.universityId);
      setSuccessInfo({
        univName: selectedUniv ? `${selectedUniv.name} (${selectedUniv.shortName})` : "Kampus Pilihan",
        email: form.email,
      });
      setSubmitted(true);
      toast.success("Pengajuan berhasil dikirim!");
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && successInfo) {
    return (
      <main className="min-h-screen bg-[#fbfbfa] dark:bg-[#0f172a] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-800">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
            Pengajuan Berhasil Dikirim!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Aplikasi kamu untuk menjadi pengelola resmi di{" "}
            <span className="font-bold text-emerald-800 dark:text-emerald-400">
              {successInfo.univName}
            </span>{" "}
            telah masuk ke antrean kurasi tim regional.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs text-slate-600 dark:border-white/5 dark:bg-slate-900/50 dark:text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Langkah Selanjutnya:
            </div>
            <p>1. Tim Admin Provinsi / Superadmin akan meninjau profil dan visimu dalam 1x24 jam.</p>
            <p>2. Jika disetujui, tautan undangan aktivasi akun admin resmi akan dikirim otomatis ke email: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{successInfo.email}</span>.</p>
            <p>3. Kamu dapat langsung masuk ke Workspace Admin untuk mengelola listing, kurasi konten, dan saluran sosial kampusmu.</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/cara-bergabung"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Pelajari Ekosistem
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbfa] dark:bg-[#0f172a] py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Hero */}
        <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-900 to-slate-900 p-8 sm:p-10 text-white shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-emerald-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Program Kemitraan & Ekspansi Kampus Nasional
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
            Pimpin Ekosistem Jual Beli & Komunitas di Kampusmu
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-emerald-100/90">
            Bantu ribuan mahasiswa di universitasmu bertransaksi aman, hemat, dan terpercaya. Jadilah perwakilan resmi pengelola marketplace, akun media sosial, dan saluran siaran kampus.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-white/10 pt-6">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-bold">Otoritas Workspace</p>
                <p className="text-[11px] text-emerald-200/80">Hak akses resmi mengelola marketplace dan kurasi barang kampus.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                <Icon.Instagram className="h-5 w-5 text-pink-300" />
              </div>
              <div>
                <p className="text-xs font-bold">Instagram & WA Channel</p>
                <p className="text-[11px] text-emerald-200/80">Kelola akun resmi <span className="font-mono">@jualbelidikampus.[univ]</span>.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                <Users className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold">Bagi Hasil & Komunitas</p>
                <p className="text-[11px] text-emerald-200/80">Dukungan penuh tim teknis dan peluang bagi hasil fee transaksi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulir Pendaftaran */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm dark:border-white/10 dark:bg-slate-800">
          <div className="border-b border-slate-100 pb-5 dark:border-white/10">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Formulir Permohonan Pengelola Kampus
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Terbuka untuk pengurus BEM, HIMA, aktivis kampus, maupun mahasiswa kreatif yang ingin membangun bursa kampus mandiri.
            </p>
            {sessionChecked && !userLoggedIn && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                <p>Masuk ke akun Jual Beli Kampus Kita dulu agar pengajuan tercatat atas identitasmu sendiri.</p>
                <Link href="/masuk?next=%2Fgabung-admin" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 font-bold text-white hover:bg-amber-800">
                  Masuk akun <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Wilayah & Universitas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Provinsi Kampus <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={loadingKatalog}
                  value={form.provinceId}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Universitas / Perguruan Tinggi <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={loadingKatalog || availableCampuses.length === 0}
                  value={form.universityId}
                  onChange={(e) => setForm((prev) => ({ ...prev, universityId: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >
                  {availableCampuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nama & Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Nama Lengkap Pemohon <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Budi Pratama"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Alamat Email (untuk login admin) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@kampus.ac.id atau email aktif"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* WhatsApp & Instagram */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                </label>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Masuk terlebih dahulu. Nomor ini harus sama dengan WhatsApp yang terhubung ke akunmu.
                </p>
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={form.wa}
                  onChange={(e) => setForm((prev) => ({ ...prev, wa: e.target.value }))}
                  readOnly={userLoggedIn}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Akun Instagram Pribadi / Organisasi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: budipratama_ atau bem_ftui"
                  value={form.instagram}
                  onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Motivasi & Rencana */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Alasan / Rencana Mengembangkan Komunitas Kampus
              </label>
              <textarea
                rows={3}
                placeholder="Ceritakan singkat latar belakangmu (misal: pengurus BEM, punya komunitas jual beli di kampus, dsb.) dan bagaimana rencanamu mengembangkannya."
                value={form.motivation}
                onChange={(e) => setForm((prev) => ({ ...prev, motivation: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !sessionChecked || !userLoggedIn}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 py-3.5 text-xs font-black text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim Pengajuan...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Kirim Permohonan Admin Kampus
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
