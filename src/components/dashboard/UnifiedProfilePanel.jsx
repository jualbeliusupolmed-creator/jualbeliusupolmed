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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
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

      {/* FORM CARD */}
      <form onSubmit={handleSave} className="rounded-[22px] bg-white dark:bg-[#1c1c1e] p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* FOTO PROFIL SECTION */}
        <div className="pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Foto Profil Utama
          </label>
          
          <div className="flex items-center gap-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-primary/30 bg-primary/5 hover:border-primary transition-all group"
            >
              {formData.photo_url ? (
                <Image
                  src={formData.photo_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  👤
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                Ganti
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] px-3.5 py-1.5 text-xs font-bold text-[#1d1d1f] dark:text-white transition-all active:scale-95"
              >
                {compressing ? "Mengompres..." : formData.photo_url ? "Ganti Foto" : "Unggah Foto"}
              </button>
              <p className="text-[11px] text-gray-400">
                Otomatis dikompresi ke WebP agar hemat kuota.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* NAMA LENGKAP & ANONIM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Nama Lengkap / Nama Tampil <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              placeholder="Contoh: Sarah Angelina"
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-[10px] text-gray-400">Ditampilkan di toko dan kartu Cari Teman.</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Nama Samaran (Anonim)
            </label>
            <input
              type="text"
              value={formData.anonymous_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, anonymous_name: e.target.value }))}
              placeholder="Contoh: Kucing Kampus"
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-[10px] text-gray-400">Dipakai saat posting &amp; komentar di Menfess.</p>
          </div>
        </div>

        {/* KAMPUS, FAKULTAS, ANGKATAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Kampus
            </label>
            <select
              value={formData.campus}
              onChange={(e) => setFormData((prev) => ({ ...prev, campus: e.target.value, faculty: "Umum" }))}
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
            >
              <option value="USU">Universitas Sumatera Utara (USU)</option>
              <option value="Polmed">Politeknik Negeri Medan (Polmed)</option>
              <option value="Semua">Kampus Lainnya di Medan</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Fakultas / Jurusan
            </label>
            <select
              value={formData.faculty}
              onChange={(e) => setFormData((prev) => ({ ...prev, faculty: e.target.value }))}
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
            >
              {currentFaculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Angkatan
            </label>
            <select
              value={formData.batch}
              onChange={(e) => setFormData((prev) => ({ ...prev, batch: e.target.value }))}
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
            >
              {["2026", "2025", "2024", "2023", "2022", "2021", "Alumni"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* INTENT / TUJUAN CARI TEMAN */}
        <div className="space-y-2 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
            Tujuan Cari Teman Kampus
          </label>
          <div className="flex flex-wrap gap-2">
            {INTENTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, intent: item }))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  formData.intent === item
                    ? "bg-primary text-white shadow-xs"
                    : "bg-black/[0.04] text-gray-700 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-gray-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* BIO & CERITA */}
        <div className="space-y-1.5 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
            Bio / Deskripsi Profil
          </label>
          <textarea
            rows={2}
            value={formData.bio}
            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Ceritakan tentang tokomu, barang yang kamu jual, atau hobi & selera musik kamu..."
            className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {/* KONTAK (WHATSAPP & INSTAGRAM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              WhatsApp Utama
            </label>
            <input
              type="text"
              readOnly
              value={formData.whatsapp || wa}
              className="w-full rounded-xl border border-black/[0.06] bg-black/[0.04] dark:border-white/[0.06] dark:bg-white/[0.06] px-3.5 py-2.5 text-xs text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white">
              Instagram <span className="text-gray-400 font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">@</span>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData((prev) => ({ ...prev, instagram: e.target.value.replace(/^@/, "") }))}
                placeholder="username_kamu"
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] pl-8 pr-3.5 py-2.5 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || compressing}
            className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Menyimpan Biodata..." : "💾 Simpan Biodata Kampus"}
          </button>
        </div>
      </form>
    </div>
  );
}
