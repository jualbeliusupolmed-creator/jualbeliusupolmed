"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

const INTENTS = [
  "Teman Santai ☕",
  "Belajar Bareng 📚",
  "Teman Olahraga 🏃‍♂️",
  "Teman Event / Konser 🎟️",
  "Ngobrol Seru 💬",
  "Cari Relasi Karir 💼",
];

const FACULTIES_USU = [
  "Kedokteran",
  "Hukum",
  "Pertanian",
  "Teknik",
  "Ekonomi & Bisnis",
  "Kedokteran Gigi",
  "Ilmu Budaya",
  "MIPA",
  "ISIP",
  "Kesehatan Masyarakat",
  "Farmasi",
  "Psikologi",
  "Keperawatan",
  "Fasilkom-TI",
  "Kehutanan",
  "Vokasi",
  "Umum",
];

const FACULTIES_POLMED = [
  "Teknik Mesin",
  "Teknik Sipil",
  "Teknik Elektro",
  "Akuntansi",
  "Administrasi Niaga",
  "Teknik Komputer & Informatika",
  "Umum",
];

export default function UnifiedProfilePanel({ sellerProfile, wa, onProfileUpdated }) {
  const [formData, setFormData] = useState({
    photo_url: sellerProfile?.photo_url || "",
    display_name: sellerProfile?.name || "",
    campus: sellerProfile?.campus || "USU",
    faculty: sellerProfile?.faculty || "Umum",
    batch: "2024",
    intent: "Teman Santai ☕",
    bio: sellerProfile?.bio || "",
    instagram: "",
    whatsapp: wa || "",
    anonymous_name: sellerProfile?.anonymous_name || "Anonim",
  });

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    async function loadTemanProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/teman/profiles?wa=${encodeURIComponent(wa || "")}`, {
          headers: { "x-seller-wa": wa || "" },
        });
        const data = await res.json();
        if (data.ok) {
          const p = data.myProfile || {};
          const s = data.sellerProfile || {};
          const mergedName = p.display_name || s.name || sellerProfile?.name || "";
          const mergedPhoto = p.photo_url || s.photo_url || sellerProfile?.photo_url || "";
          const mergedBio = p.bio || s.bio || sellerProfile?.bio || "";
          const mergedCampus = p.campus || s.campus || sellerProfile?.campus || "USU";
          const mergedFaculty = p.faculty || s.faculty || sellerProfile?.faculty || "Umum";
          const mergedAnon = s.anonymous_name || sellerProfile?.anonymous_name || "Anonim";

          setFormData({
            photo_url: mergedPhoto,
            display_name: mergedName,
            campus: mergedCampus,
            faculty: mergedFaculty,
            batch: p.batch || "2024",
            intent: p.intent || "Teman Santai ☕",
            bio: mergedBio,
            instagram: p.instagram || "",
            whatsapp: wa || p.whatsapp || "",
            anonymous_name: mergedAnon,
          });
        }
      } catch (err) {
        console.error("Failed to load unified profile:", err);
      } finally {
        setLoading(false);
      }
    }
    if (wa) {
      loadTemanProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wa]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      const options = {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: "image/webp",
      };

      const compressedFile = await imageCompression(file, options);
      const fd = new FormData();
      fd.append("file", compressedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const url = uploadData.url || uploadData.image_url;
        setFormData((prev) => ({ ...prev, photo_url: url }));
        // Live preview on parent
        onProfileUpdated?.({ photo_url: url });
        toast.success("Foto profil berhasil diunggah! 📸");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, photo_url: reader.result }));
          onProfileUpdated?.({ photo_url: reader.result });
          toast.success("Foto lokal dipilih.");
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengompres/mengunggah foto.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.display_name.trim()) {
      toast.error("Nama lengkap / nama tampil wajib diisi");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId: wa,
        photo_url: formData.photo_url || "",
        display_name: formData.display_name.trim(),
        campus: formData.campus,
        faculty: formData.faculty,
        batch: formData.batch,
        intent: formData.intent,
        bio: formData.bio,
        instagram: formData.instagram,
        whatsapp: wa || formData.whatsapp,
      };

      const res = await fetch("/api/teman/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-seller-wa": wa || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyimpan biodata");
      }

      if (formData.anonymous_name && formData.anonymous_name.trim().length >= 2) {
        await fetch("/api/profile/anonymous-name", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymousName: formData.anonymous_name.trim() }),
        });
      }

      // Immediately propagate to parent header & views
      onProfileUpdated?.({
        name: formData.display_name.trim(),
        photo_url: formData.photo_url,
        bio: formData.bio,
        campus: formData.campus,
        faculty: formData.faculty,
      });

      toast.success("✅ Biodata Satu Pintu berhasil diperbarui!");
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const currentFaculties = formData.campus === "Polmed" ? FACULTIES_POLMED : FACULTIES_USU;

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]" />
        <div className="h-96 rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-base font-black text-[#1d1d1f] dark:text-white">
              Biodata &amp; Profil Satu Pintu
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
            Data ini tersinkronisasi otomatis di <strong>Marketplace</strong>, <strong>Cari Teman Swipe</strong>, <strong>Pusat Obrolan</strong>, dan <strong>Menfess Kampus</strong>.
          </p>
        </div>

        <Link
          href="/teman"
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>🔥 Buka Cari Teman</span>
          <Icon.ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* FORM CARD (iOS Settings Style) */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* FOTO PROFIL SECTION */}
        <div className="flex flex-col items-center justify-center space-y-3 pb-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.1] transition-all hover:opacity-80"
          >
            {formData.photo_url ? (
              <Image src={formData.photo_url} alt="Avatar" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
              Edit
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
            className="text-[15px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {compressing ? "Menyiapkan..." : formData.photo_url ? "Edit Foto" : "Tambah Foto"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Group 1: Informasi Dasar */}
        <div className="rounded-[12px] bg-white dark:bg-[#1c1c1e] overflow-hidden border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="w-1/3 shrink-0 text-[15px] text-[#1d1d1f] dark:text-white">Nama</label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              placeholder="Nama Lengkap"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="w-1/3 shrink-0 text-[15px] text-[#1d1d1f] dark:text-white">Anonim</label>
            <input
              type="text"
              value={formData.anonymous_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, anonymous_name: e.target.value }))}
              placeholder="Kucing Kampus"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="block text-[15px] text-[#1d1d1f] dark:text-white mb-1.5">Bio</label>
            <textarea
              rows={2}
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Ceritakan sedikit tentang dirimu..."
              className="w-full bg-transparent text-[15px] text-[#86868b] outline-none dark:text-slate-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none"
            />
          </div>
        </div>

        {/* Group 2: Edukasi */}
        <div className="rounded-[12px] bg-white dark:bg-[#1c1c1e] overflow-hidden border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="text-[15px] text-[#1d1d1f] dark:text-white">Kampus</label>
            <select
              value={formData.campus}
              onChange={(e) => setFormData((prev) => ({ ...prev, campus: e.target.value, faculty: "Umum" }))}
              className="bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400"
            >
              <option value="USU">USU</option>
              <option value="Polmed">Polmed</option>
              <option value="Semua">Lainnya</option>
            </select>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="text-[15px] text-[#1d1d1f] dark:text-white">Fakultas</label>
            <select
              value={formData.faculty}
              onChange={(e) => setFormData((prev) => ({ ...prev, faculty: e.target.value }))}
              className="bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400 max-w-[200px]"
            >
              {currentFaculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="text-[15px] text-[#1d1d1f] dark:text-white">Angkatan</label>
            <select
              value={formData.batch}
              onChange={(e) => setFormData((prev) => ({ ...prev, batch: e.target.value }))}
              className="bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400"
            >
              {["2026", "2025", "2024", "2023", "2022", "2021", "Alumni"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Group 3: Kontak & Intent */}
        <div className="rounded-[12px] bg-white dark:bg-[#1c1c1e] overflow-hidden border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="w-1/3 shrink-0 text-[15px] text-[#1d1d1f] dark:text-white">WhatsApp</label>
            <input
              type="text"
              readOnly
              value={formData.whatsapp || wa}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-gray-400 text-right outline-none"
            />
          </div>
          <div className="flex items-center px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.08]">
            <label className="w-1/3 shrink-0 text-[15px] text-[#1d1d1f] dark:text-white">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => setFormData((prev) => ({ ...prev, instagram: e.target.value.replace(/^@/, "") }))}
              placeholder="username"
              className="flex-1 min-w-0 bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="px-4 py-3">
            <label className="block text-[15px] text-[#1d1d1f] dark:text-white mb-2">Tujuan Cari Teman</label>
            <div className="flex flex-wrap gap-1.5">
              {INTENTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, intent: item }))}
                  className={`rounded-full px-3 py-1 text-[13px] transition-all ${
                    formData.intent === item
                      ? "bg-[#1d1d1f] text-white dark:bg-white dark:text-black"
                      : "bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || compressing}
            className="w-full rounded-[14px] bg-primary px-4 py-3.5 text-[15px] font-bold text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Biodata"}
          </button>
        </div>
      </form>
    </div>
  );
}
