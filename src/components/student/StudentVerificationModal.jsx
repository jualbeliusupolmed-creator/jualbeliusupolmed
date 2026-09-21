"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { detectCampusFromEmail } from "@/lib/studentVerification";
import { useFocusTrap } from "@/lib/useFocusTrap";

export default function StudentVerificationModal({ isOpen, onClose, onVerified, initialData = null }) {
  const [campus, setCampus] = useState(initialData?.student_campus || "USU");
  const [nim, setNim] = useState(initialData?.student_nim || "");
  const [faculty, setFaculty] = useState(initialData?.student_faculty || "");
  const [email, setEmail] = useState(initialData?.student_email || "");
  const [ktmUrl, setKtmUrl] = useState(initialData?.student_ktm_url || "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const isEmailCampus = Boolean(detectCampusFromEmail(email));

  const handleUploadKtm = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Gagal mengunggah foto KTM");
      }

      setKtmUrl(data.url);
      toast.success("Foto KTM berhasil diunggah!");
    } catch (err) {
      toast.error(err.message || "Gagal upload KTM");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nim.trim()) {
      toast.error("NIM wajib diisi");
      return;
    }

    if (!isEmailCampus && !ktmUrl) {
      toast.error("Gunakan email resmi kampus atau unggah foto KTM!");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/student/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus,
          nim,
          faculty,
          email,
          ktm_url: ktmUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim verifikasi");
      }

      toast.success(data.message || "Pengajuan verifikasi berhasil dikirim!");
      if (onVerified) onVerified(data);
      onClose();
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-all dark:bg-[#18181b] border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
              <Icon.CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="verify-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                Verifikasi Mahasiswa Resmi
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Dapatkan lencana centang biru kampus untuk reputasi & kepercayaan pembeli
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Icon.X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
          {/* Pilihan Kampus */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Pilih Kampus <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2.5">
              {["USU", "POLMED"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCampus(c)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-2.5 font-medium transition-all ${
                    campus === c
                      ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
                  }`}
                >
                  <Icon.Building className="h-4 w-4" />
                  {c === "USU" ? "Univ. Sumatera Utara" : "Politeknik Negeri Medan"}
                </button>
              ))}
            </div>
          </div>

          {/* NIM */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Nomor Induk Mahasiswa (NIM) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 211401001 / 2205011002"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
            />
          </div>

          {/* Fakultas / Jurusan */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Fakultas / Program Studi
            </label>
            <input
              type="text"
              placeholder="Contoh: Fasilkom-TI / Teknik Elektro"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
            />
          </div>

          {/* Jalur Verifikasi: Email Kampus ATAU Foto KTM */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Pilih Salah Satu Metode Verifikasi:
            </h4>

            {/* Opsi 1: Email Resmi */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Opsi 1: Email Kampus (Verifikasi Instan ⚡)
              </label>
              <input
                type="email"
                placeholder="nama@students.usu.ac.id / nama@polmed.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              {isEmailCampus && (
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Domain resmi kampus terdeteksi! Akun akan otomatis terverifikasi langsung.
                </p>
              )}
            </div>

            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-700" />
              <span className="text-[10px] font-bold uppercase text-gray-400">atau</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-700" />
            </div>

            {/* Opsi 2: Upload KTM */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Opsi 2: Unggah Foto KTM (Tinjauan Admin 1×24 Jam)
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <Icon.Camera className="h-4 w-4 text-gray-500" />
                  <span>{uploading ? "Mengunggah..." : ktmUrl ? "Ganti Foto KTM" : "Pilih Foto KTM"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleUploadKtm}
                    className="hidden"
                  />
                </label>
                {ktmUrl && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Icon.Check className="h-3 w-3" /> Foto KTM Siap
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-center text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Memproses..." : "Kirim Pengajuan Verifikasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
