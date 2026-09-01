"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { Icon } from "@/components/Icons";

export default function BuatOprecModal({ onClose, onCreated, isUkmAccount = true }) {
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

  // Inputan Kustom Tambahan (Tulisan, Paragraf, Upload Gambar/KTM, Link)
  const [customFields, setCustomFields] = useState([
    { id: "ktm_foto", label: "Upload Foto KTM / Bukti Mahasiswa Aktif", type: "image", required: true },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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

  function addCustomField(type) {
    const id = "field_" + Date.now();
    let defaultLabel = "";
    if (type === "text") defaultLabel = "Username Instagram Pribadi / Keahlian";
    else if (type === "textarea") defaultLabel = "Ceritakan studi kasus / essay singkat...";
    else if (type === "image") defaultLabel = "Upload Foto KTM / Bukti Follow IG";
    else if (type === "url") defaultLabel = "Link Portofolio / Google Drive";

    setCustomFields([
      ...customFields,
      { id, label: defaultLabel, type, required: false },
    ]);
  }

  function updateCustomField(index, key, val) {
    const updated = [...customFields];
    updated[index][key] = val;
    setCustomFields(updated);
  }

  function removeCustomField(index) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const fd = new FormData();
      fd.append("file", compressed, "oprec_banner.webp");
      fd.append("bucket", "banners");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah banner.");

      setForm((prev) => ({ ...prev, banner_url: data.url }));
      toast.success("Poster/Banner Oprec berhasil diunggah!");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah foto poster.");
    } finally {
      setUploadingBanner(false);
    }
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
        body: JSON.stringify({ ...form, divisions, custom_fields: customFields }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsUkmRegister) {
          toast.error(data.error, {
            action: {
              label: "Daftar Akun UKM",
              onClick: () => (window.location.href = "/organisasi/daftar"),
            },
          });
          return;
        }
        throw new Error(data.error || "Gagal membuat formulir Oprec.");
      }

      toast.success("Formulir Oprec berhasil dipublikasikan! ");
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
      
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-black/[0.06] dark:border-white/[0.08] z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              <Icon.Landmark className="h-3.5 w-3.5" /><span>Khusus Pengurus UKM &amp; PIC</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Buka Formulir Open Recruitment Baru
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Kustomisasi pertanyaan, divisi, dan kolom upload gambar/dokumen untuk calon pendaftar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400"
          >
            <Icon.X className="h-4 w-4" />
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
                + Tambah Divisi
              </button>
            </div>
          </div>

          {/* INPUTAN KUSTOM DINAMIS (TULISAN & GAMBAR) */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/30 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span> Kolom Inputan Kustom Tambahan</span>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Tambahkan pertanyaan teks, essay, atau kolom unggah foto/KTM yang wajib diisi calon pendaftar.
                </p>
              </div>
            </div>

            {/* DAFTAR FIELD KUSTOM */}
            {customFields.length > 0 && (
              <div className="space-y-2 pt-1">
                {customFields.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800"
                  >
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      <span className="inline-flex items-center gap-1">{field.type === "image" ? <Icon.Photo className="h-3 w-3" /> : field.type === "url" ? <Icon.ExternalLink className="h-3 w-3" /> : <Icon.PencilSquare className="h-3 w-3" />}{field.type === "image" ? "Upload Foto/Gambar" : field.type === "textarea" ? "Tulisan Paragraf" : field.type === "url" ? "Link/URL" : "Teks Singkat"}</span>
                    </span>

                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateCustomField(idx, "label", e.target.value)}
                      placeholder="Judul / Pertanyaan untuk pendaftar..."
                      className="input py-1 text-xs flex-1"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateCustomField(idx, "required", e.target.checked)}
                          className="rounded text-primary"
                        />
                        <span>Wajib</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 font-bold text-xs"
                        title="Hapus kolom ini"
                      >
                        <Icon.Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOMBOL TAMBAH INPUTAN */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => addCustomField("image")}
                className="btn-outline py-1 px-2.5 text-[11px] font-bold bg-white dark:bg-slate-900 flex items-center gap-1"
              >
                <Icon.Photo className="h-4 w-4" /><span>Upload Foto / Gambar (KTM)</span>
              </button>
              <button
                type="button"
                onClick={() => addCustomField("text")}
                className="btn-outline py-1 px-2.5 text-[11px] font-bold bg-white dark:bg-slate-900 flex items-center gap-1"
              >
                <Icon.PencilSquare className="h-4 w-4" /><span>Teks Singkat</span>
              </button>
              <button
                type="button"
                onClick={() => addCustomField("textarea")}
                className="btn-outline py-1 px-2.5 text-[11px] font-bold bg-white dark:bg-slate-900 flex items-center gap-1"
              >
                <span>+  Tulisan Panjang / Essay</span>
              </button>
              <button
                type="button"
                onClick={() => addCustomField("url")}
                className="btn-outline py-1 px-2.5 text-[11px] font-bold bg-white dark:bg-slate-900 flex items-center gap-1"
              >
                <span>+  Link / URL</span>
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
              Persyaratan &amp; Kualifikasi Pendaftar
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
              Pendaftar yang berhasil submit akan langsung diarahkan ke tautan grup WhatsApp ini.
            </p>
          </div>

          {/* POSTER / BANNER OPREC */}
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
              Poster / Banner Oprec (Opsional)
            </label>
            <div className="flex items-center gap-3">
              <label className="btn-outline cursor-pointer py-1.5 px-3 text-xs font-bold shrink-0">
                <span>{uploadingBanner ? "Mengunggah..." : form.banner_url ? "Ganti Poster" : "Unggah Poster"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="hidden"
                />
              </label>
              {form.banner_url && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                   Poster siap dipasang
                </span>
              )}
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting || uploadingBanner}
            className="btn-primary w-full py-3 text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? "Mempublikasikan Oprec..." : " Publikasikan Formulir Oprec"}
          </button>
        </form>
      </div>
    </div>
  );
}
