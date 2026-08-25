"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function BuatOprecModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    campus: "USU",
    faculty: "Universitas",
    deadline: "",
    requirements: "",
    wa_group_link: "",
    banner_url: "",
  });

  const [divisions, setDivisions] = useState([
    "Acara & Talent",
    "Humas & Publikasi",
    "Kreatif & Desain",
    "Perlengkapan & Logistik",
    "Konsumsi",
    "Dokumentasi & Media",
  ]);
  const [newDiv, setNewDiv] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addDivision() {
    if (!newDiv.trim()) return;
    if (divisions.includes(newDiv.trim())) return toast.error("Divisi sudah ada dalam daftar.");
    setDivisions([...divisions, newDiv.trim()]);
    setNewDiv("");
  }

  function removeDivision(index) {
    if (divisions.length <= 1) return toast.error("Minimal harus ada 1 divisi.");
    setDivisions(divisions.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Judul Oprec wajib diisi.");
    if (!form.deadline) return toast.error("Batas waktu (deadline) wajib diisi.");
    if (divisions.length === 0) return toast.error("Minimal tambahkan 1 pilihan divisi.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/oprec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, divisions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat formulir Oprec.");

      toast.success("Formulir Oprec berhasil dipublikasikan! 🎉");
      if (onCreated) onCreated(data.oprec);
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal membuat oprec.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-black/[0.06] dark:border-white/[0.08] z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Buka Formulir Open Recruitment Baru
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Formulir in-app untuk kepanitiaan acara atau anggota baru UKM
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
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Judul Oprec / Nama Acara <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Oprec Panitia Dies Natalis / Anggota Baru 2026"
              className="input py-2 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Batas Waktu (Deadline) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input py-2 text-xs"
              />
            </div>

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
          </div>

          {/* DAFTAR DIVISI YANG DIBUKA */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Daftar Divisi / Posisi yang Dibuka
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {divisions.map((div, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 bg-primary/10 text-primary dark:text-emerald-400 border border-primary/20 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                >
                  <span>{div}</span>
                  <button
                    type="button"
                    onClick={() => removeDivision(index)}
                    className="hover:text-rose-500 text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDiv}
                onChange={(e) => setNewDiv(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDivision();
                  }
                }}
                placeholder="Ketik nama divisi lalu tekan tambah..."
                className="input py-1.5 text-xs flex-1"
              />
              <button
                type="button"
                onClick={addDivision}
                className="btn-outline py-1.5 px-3 text-xs shrink-0 font-bold"
              >
                + Tambah
              </button>
            </div>
          </div>

          {/* DESKRIPSI & PERSYARATAN */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Deskripsi Acara / Posisi
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Jelaskan tentang kegiatan atau kepanitiaan ini..."
              className="input py-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Persyaratan & Kualifikasi Pendaftar
            </label>
            <textarea
              rows={2}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Contoh: 1. Mahasiswa aktif USU/Polmed, 2. Komitmen, 3. Mau belajar..."
              className="input py-2 text-xs"
            />
          </div>

          {/* LINK GRUP WHATSAPP PESERTA */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Link Grup WhatsApp Peserta (Opsional)
            </label>
            <input
              type="url"
              value={form.wa_group_link}
              onChange={(e) => setForm({ ...form, wa_group_link: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
              className="input py-2 text-xs font-mono"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">
              Pendaftar yang berhasil submit akan langsung diarahkan ke grup WhatsApp ini.
            </p>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? "Mempublikasikan Oprec..." : "🚀 Publikasikan Formulir Oprec"}
          </button>
        </form>
      </div>
    </div>
  );
}
