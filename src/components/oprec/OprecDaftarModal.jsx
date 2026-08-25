"use client";

import { useState, useEffect } from "react";
import { formatWa } from "@/lib/constants";
import { toast } from "sonner";
import { Icon } from "@/components/Icons";

export default function OprecDaftarModal({ oprec, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    applicant_name: "",
    applicant_wa: "",
    nim: "",
    campus: oprec?.campus || "USU",
    faculty: "",
    batch: "2024",
    division_1: oprec?.divisions?.[0] || "Acara",
    division_2: oprec?.divisions?.[1] || "",
    reason: "",
    portfolio_url: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWa = localStorage.getItem("seller_wa");
      if (savedWa) {
        setForm((prev) => ({ ...prev, applicant_wa: savedWa }));
      }
    }
  }, []);

  if (!oprec) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.applicant_name.trim()) return toast.error("Nama lengkap wajib diisi.");
    if (!form.applicant_wa.trim()) return toast.error("Nomor WhatsApp wajib diisi.");
    if (!form.division_1) return toast.error("Pilihan divisi 1 wajib dipilih.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/oprec/${oprec.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pendaftaran.");

      setSubmittedData(data);
      toast.success("Pendaftaran Oprec Berhasil Dikirimkan! 🎉");
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err.message || "Gagal memproses pendaftaran.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center space-y-5 dark:bg-slate-900 border border-black/[0.06] dark:border-white/[0.08] z-10 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl text-emerald-600">
            🎉
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1">
              ✓ Formulir Diterima
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Pendaftaran Berhasil!
            </h3>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
              Terima kasih, <strong>{form.applicant_name}</strong>! Pendaftaran kamu untuk <strong>{oprec.title}</strong> di <strong>{oprec.ukm_name}</strong> telah berhasil masuk ke sistem pengurus.
            </p>
          </div>

          {oprec.wa_group_link && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30 text-left space-y-2">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                📲 Gabung Grup WhatsApp Peserta:
              </p>
              <a
                href={oprec.wa_group_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <span>Masuk ke Grup WhatsApp Oprec →</span>
              </a>
            </div>
          )}

          <button onClick={onClose} className="btn-outline w-full py-2.5 text-xs font-bold">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-black/[0.06] dark:border-white/[0.08] z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary dark:text-emerald-400">
              🏛️ {oprec.ukm_name}
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
              Formulir Pendaftaran Oprec
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
              {oprec.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* NAMA & NIM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.applicant_name}
                onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                placeholder="Contoh: Rian Pratama"
                className="input py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                NIM / Nomor Mahasiswa
              </label>
              <input
                type="text"
                value={form.nim}
                onChange={(e) => setForm({ ...form, nim: e.target.value })}
                placeholder="Contoh: 211401001"
                className="input py-2 text-xs font-mono"
              />
            </div>
          </div>

          {/* KAMPUS & FAKULTAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Kampus
              </label>
              <select
                value={form.campus}
                onChange={(e) => setForm({ ...form, campus: e.target.value })}
                className="input py-2 text-xs font-medium"
              >
                <option value="USU">USU</option>
                <option value="POLMED">POLMED</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Fakultas / Jurusan
              </label>
              <input
                type="text"
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                placeholder="Contoh: Fasilkom-TI / Elektro"
                className="input py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Angkatan
              </label>
              <select
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                className="input py-2 text-xs font-medium"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
          </div>

          {/* WHATSAPP */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.applicant_wa}
              onChange={(e) => setForm({ ...form, applicant_wa: e.target.value })}
              placeholder="Contoh: 081234567890"
              className="input py-2 text-xs font-mono"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">Pengurus akan menghubungi via WA untuk tahapan wawancara/seleksi.</p>
          </div>

          {/* PILIHAN DIVISI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Pilihan Divisi 1 <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.division_1}
                onChange={(e) => setForm({ ...form, division_1: e.target.value })}
                className="input py-2 text-xs font-medium"
              >
                {(oprec.divisions || ["Acara", "Humas", "Desain", "Perlengkapan", "Konsumsi"]).map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Pilihan Divisi 2 (Opsional)
              </label>
              <select
                value={form.division_2}
                onChange={(e) => setForm({ ...form, division_2: e.target.value })}
                className="input py-2 text-xs font-medium"
              >
                <option value="">-- Tidak Ada --</option>
                {(oprec.divisions || ["Acara", "Humas", "Desain", "Perlengkapan", "Konsumsi"]).map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ALASAN & PORTOFOLIO */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Alasan Bergabung / Pengalaman Terkait
            </label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ceritakan motivasimu atau pengalaman organisasi sebelumnya..."
              className="input py-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Link Portofolio / CV / Google Drive (Opsional)
            </label>
            <input
              type="url"
              value={form.portfolio_url}
              onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })}
              placeholder="https://drive.google.com/..."
              className="input py-2 text-xs font-mono"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? "Mengirimkan Formulir..." : "Kirimkan Formulir Pendaftaran"}
          </button>
        </form>
      </div>
    </div>
  );
}
