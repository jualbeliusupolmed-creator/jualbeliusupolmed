"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { UKM_CATEGORIES, KAMPUS_OPTIONS, DEFAULT_INVITE_CODE } from "@/lib/organisasi";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { useSesi } from "@/components/SesiProvider";

function DaftarOrganisasiForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    ukm_name: "",
    ukm_category: "bem_hima",
    campus: "USU",
    faculty: "",
    ukm_instagram: "",
    contact_name: "",
    contact_wa: "",
    email: "",
    password: "",
    bio: "",
    photo_url: "",
    invite_code: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const invite = searchParams.get("invite") || searchParams.get("code") || DEFAULT_INVITE_CODE;
    const campus = searchParams.get("campus");
    setForm((prev) => ({
      ...prev,
      invite_code: invite,
      campus: campus && KAMPUS_OPTIONS.includes(campus.toUpperCase()) ? campus.toUpperCase() : prev.campus,
    }));
  }, [searchParams]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      // Kompresi WebP
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const fd = new FormData();
      fd.append("file", compressed, "logo_ukm.webp");
      fd.append("bucket", "profiles");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah logo.");

      setForm((prev) => ({ ...prev, photo_url: data.url }));
      toast.success("Logo organisasi berhasil diunggah!");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah foto.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ukm_name.trim()) return toast.error("Nama Organisasi / UKM wajib diisi.");
    if (!form.contact_name.trim()) return toast.error("Nama PIC / Pengurus wajib diisi.");
    if (!form.contact_wa.trim()) return toast.error("Nomor WhatsApp wajib diisi.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/organisasi/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftarkan organisasi.");

      // Simpan cermin identitas, lalu segarkan sesi bersama supaya Navbar dan
      // halaman lain langsung mengenali akun baru ini tanpa muat ulang.
      if (data.wa) {
        localStorage.setItem("seller_wa", data.wa);
        localStorage.setItem("seller_name", data.organization?.ukm_name || form.ukm_name);
        segarkanSesi();
      }

      setSuccessData(data);
      toast.success("Akun Organisasi Resmi Berhasil Didaftarkan! 🎉");
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successData) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="card p-8 text-center space-y-6 border-2 border-emerald-500/20 shadow-xl dark:bg-slate-900">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-4xl text-emerald-600">
            🏛️
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-2">
              ✓ Akun Resmi Terverifikasi
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {form.ukm_name}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Selamat! Akun resmi UKM/Organisasi kamu telah aktif. Kamu sekarang bisa login kapan saja menggunakan <strong>Email &amp; Password</strong> atau <strong>WhatsApp</strong> tanpa ribet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/mading?buat=1&tab=organisasi"
              className="btn-primary w-full sm:w-auto py-3 px-6 text-sm flex items-center justify-center gap-2"
            >
              <span>📢 Buat Postingan / Oprec di Mading</span>
            </Link>
            <Link
              href="/organisasi"
              className="btn-outline w-full sm:w-auto py-3 px-6 text-sm flex items-center justify-center gap-2"
            >
              <span>🌐 Lihat Direktori UKM</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* HEADER */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary border border-primary/20">
          <span>🏛️ Portal Khusus Pengurus UKM / HIMA / BEM</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Pendaftaran Akun Resmi Organisasi
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-lg mx-auto">
          Dapatkan lencana resmi terverifikasi, publikasikan oprec kepanitiaan, info lomba, tiket konser kampus, dan merchandise resmi UKM di USU &amp; POLMED.
        </p>
      </div>

      {/* FORM CARD */}
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6 shadow-xl border border-black/[0.04] dark:border-white/[0.06]">
        {/* LOGO UPLOAD */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-2">
            Logo / Lambang Resmi Organisasi
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
              {form.photo_url ? (
                <Image src={form.photo_url} alt="Logo Preview" fill className="object-cover" />
              ) : (
                <span className="text-2xl text-gray-400">🏛️</span>
              )}
            </div>
            <div className="flex-1">
              <label className="btn-outline cursor-pointer inline-flex items-center gap-2 text-xs py-2 px-4">
                <span>{uploadingLogo ? "Mengunggah..." : form.photo_url ? "Ganti Logo" : "Unggah Logo UKM"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-[11px] text-gray-400">Format JPG/PNG/WebP, rasio persegi disarankan.</p>
            </div>
          </div>
        </div>

        {/* NAMA ORGANISASI */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
            Nama Resmi Organisasi / UKM <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.ukm_name}
            onChange={(e) => setForm({ ...form, ukm_name: e.target.value })}
            placeholder="Contoh: BEM Fasilkom-TI USU / UKM Robotika USU"
            className="input text-sm font-medium"
          />
        </div>

        {/* KAMPUS & KATEGORI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
              Kampus <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {KAMPUS_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, campus: c })}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    form.campus === c
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
              Kategori Organisasi <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.ukm_category}
              onChange={(e) => setForm({ ...form, ukm_category: e.target.value })}
              className="input text-xs font-medium"
            >
              {UKM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FAKULTAS & INSTAGRAM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
              Fakultas / Tingkat Unit
            </label>
            <input
              type="text"
              value={form.faculty}
              onChange={(e) => setForm({ ...form, faculty: e.target.value })}
              placeholder="Contoh: Tingkat Universitas / Fakultas Teknik"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
              Instagram Resmi (@username)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400">@</span>
              <input
                type="text"
                value={form.ukm_instagram}
                onChange={(e) => setForm({ ...form, ukm_instagram: e.target.value })}
                placeholder="nama_ukm_resmi"
                className="input pl-7 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* EMAIL & PASSWORD LOGIN AKUN ORGANISASI */}
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 dark:border-primary/30 dark:bg-slate-800/40 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            🔐 Akses Login Akun (Email &amp; Password)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Email Organisasi / Akun
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contoh: bem.fasilkom@gmail.com"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Password Akun (Min 6 Karakter)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Ketik password organisasi..."
                  className="input text-xs pr-16"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400"
                >
                  {showPassword ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            Digunakan untuk login langsung menggunakan Email &amp; Password tanpa perlu OTP.
          </p>
        </div>

        {/* DESKRIPSI SINGKAT */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 mb-1.5">
            Deskripsi / Profil Singkat Organisasi
          </label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tuliskan tentang organisasi, kegiatan rutin, atau visi misi singkat..."
            className="input text-xs"
          />
        </div>

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* DATA NARAHUBUNG / PIC */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            👤 Data Penanggung Jawab / Narahubung (PIC)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Nama Lengkap PIC / Jabatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Contoh: Budi Santoso (Ketua)"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Nomor WhatsApp PIC <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={form.contact_wa}
                onChange={(e) => setForm({ ...form, contact_wa: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="input text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* KODE UNDANGAN PRIVATE */}
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">
            Kode Undangan / Token Akses Private
          </label>
          <input
            type="text"
            value={form.invite_code}
            onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
            placeholder="Kode akses verifikasi organisasi"
            className="input text-xs font-mono bg-gray-50 dark:bg-slate-800"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Kode undangan otomatis terverifikasi untuk pengurus resmi kampus.
          </p>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting || uploadingLogo}
          className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span>Memproses Pendaftaran...</span>
          ) : (
            <span>🏛️ Daftarkan Akun Resmi Organisasi</span>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          Sudah punya akun? <Link href="/dashboard" className="text-primary font-semibold hover:underline">Buka Dashboard</Link>
        </p>
      </form>
    </div>
  );
}

export default function DaftarOrganisasiPage() {
  const { segarkan: segarkanSesi } = useSesi();
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Memuat formulir pendaftaran...</div>}>
      <DaftarOrganisasiForm />
    </Suspense>
  );
}
