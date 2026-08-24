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

  // Load existing profile from /api/teman/profiles
  useEffect(() => {
    async function loadTemanProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/teman/profiles`);
        const data = await res.json();
        if (data.ok && data.myProfile) {
          const p = data.myProfile;
          setFormData((prev) => ({
            ...prev,
            photo_url: p.photo_url || prev.photo_url,
            display_name: p.display_name || prev.display_name,
            campus: p.campus || prev.campus,
            faculty: p.faculty || prev.faculty,
            batch: p.batch || prev.batch,
            intent: p.intent || prev.intent,
            bio: p.bio || prev.bio,
            instagram: p.instagram || prev.instagram,
            whatsapp: p.whatsapp || prev.whatsapp,
          }));
        }
      } catch (err) {
        console.error("Failed to load unified profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemanProfile();
  }, []);

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
        toast.success("Foto profil berhasil diunggah! 📸");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({ ...prev, photo_url: reader.result }));
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
      // 1. Simpan ke teman_profiles (yang otomatis mensinkronkan ke seller_profiles)
      const res = await fetch("/api/teman/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: formData.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
          display_name: formData.display_name,
          campus: formData.campus,
          faculty: formData.faculty,
          batch: formData.batch,
          intent: formData.intent,
          bio: formData.bio,
          instagram: formData.instagram,
          whatsapp: formData.whatsapp || wa,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyimpan biodata");
      }

      // 2. Simpan nama anonim jika ada perubahan
      if (formData.anonymous_name && formData.anonymous_name.trim().length >= 2) {
        await fetch("/api/profile/anonymous-name", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymousName: formData.anonymous_name.trim() }),
        });
      }

      toast.success("✅ Biodata & Profil Satu Pintu berhasil diperbarui!");
      onProfileUpdated?.();
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const currentFaculties = formData.campus === "Polmed" ? FACULTIES_POLMED : FACULTIES_USU;

  return (
    <div className="space-y-6 mt-4">
      {/* CARD SATU PINTU INFO */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-indigo-500/10 p-5 dark:border-violet-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="text-base font-black text-[#1d1d1f] dark:text-white">
                Satu Pintu: Biodata &amp; Profil Kampus
              </h2>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
              Biodata ini otomatis tersinkronisasi di seluruh ekosistem: <strong>Marketplace</strong>, <strong>Cari Teman Swipe</strong>, <strong>Pusat Obrolan</strong>, dan <strong>Menfess Kampus</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/teman"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>🔥 Buka Cari Teman</span>
              <Icon.ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Sync Badges */}
        <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
          <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 flex items-center gap-1 shadow-2xs">
            <span>🛍️ Marketplace</span>
          </span>
          <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 flex items-center gap-1 shadow-2xs">
            <span>🎴 Cari Teman</span>
          </span>
          <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 flex items-center gap-1 shadow-2xs">
            <span>💬 Pusat Obrolan</span>
          </span>
          <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 flex items-center gap-1 shadow-2xs">
            <span>📢 Menfess / Mading</span>
          </span>
        </div>
      </div>

      {/* FORM BIODATA */}
      <form onSubmit={handleSave} className="card p-6 space-y-6">
        <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          Informasi Pribadi &amp; Mahasiswa
        </h3>

        {/* FOTO PROFIL UTAMA */}
        <div>
          <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-2">
            Foto Profil Utama
          </label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] dark:border-violet-400/40 dark:bg-violet-500/10 flex items-center justify-center transition-all group shadow-sm"
            >
              {formData.photo_url ? (
                <Image
                  src={formData.photo_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <span className="text-2xl mb-0.5">📷</span>
                  <span className="text-[10px] font-bold text-primary dark:text-violet-300">
                    {compressing ? "Upload..." : "+ Ganti Foto"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                Ganti Foto
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p className="font-semibold text-[#1d1d1f] dark:text-white">
                Foto akan tampil di profil penjual dan deck Cari Teman ✨
              </p>
              <p className="text-[11px] leading-relaxed">
                Format didukung: JPG, PNG, WebP (otomatis dikompresi).
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="mt-1 text-xs font-bold text-primary dark:text-violet-400 hover:underline"
              >
                {formData.photo_url ? "Pilih Foto Baru" : "Pilih dari Galeri"}
              </button>
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

        {/* NAMA & NAMA ANONIM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Nama Lengkap / Nama Tampil <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
              placeholder="Contoh: Sarah Angelina"
              className="input w-full text-xs"
            />
            <p className="text-[11px] text-gray-400 mt-1">Ditampilkan di profil toko dan kartu Cari Teman.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Nama Anonim (Menfess)
            </label>
            <input
              type="text"
              value={formData.anonymous_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, anonymous_name: e.target.value }))}
              placeholder="Contoh: Kucing Kampus"
              className="input w-full text-xs"
            />
            <p className="text-[11px] text-gray-400 mt-1">Nama samaran khusus posting/komentar di Menfess.</p>
          </div>
        </div>

        {/* KAMPUS, FAKULTAS, ANGKATAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Kampus
            </label>
            <select
              value={formData.campus}
              onChange={(e) => setFormData((prev) => ({ ...prev, campus: e.target.value, faculty: "Umum" }))}
              className="input w-full text-xs"
            >
              <option value="USU">Universitas Sumatera Utara (USU)</option>
              <option value="Polmed">Politeknik Negeri Medan (Polmed)</option>
              <option value="Semua">Kampus Lainnya di Medan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Fakultas / Jurusan
            </label>
            <select
              value={formData.faculty}
              onChange={(e) => setFormData((prev) => ({ ...prev, faculty: e.target.value }))}
              className="input w-full text-xs"
            >
              {currentFaculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Angkatan
            </label>
            <select
              value={formData.batch}
              onChange={(e) => setFormData((prev) => ({ ...prev, batch: e.target.value }))}
              className="input w-full text-xs"
            >
              {["2026", "2025", "2024", "2023", "2022", "2021", "Alumni"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* INTENT / TUJUAN CARI TEMAN */}
        <div>
          <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-2">
            Tujuan Cari Teman Kampus (Intent)
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
        <div>
          <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
            Bio / Deskripsi Profil
          </label>
          <textarea
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Ceritakan tentang tokomu, barang yang kamu jual, atau hobi & selera musik kamu..."
            className="input w-full text-xs"
          />
        </div>

        {/* KONTAK (WHATSAPP & INSTAGRAM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              WhatsApp Utama
            </label>
            <input
              type="text"
              readOnly
              value={formData.whatsapp || wa}
              className="input w-full text-xs bg-black/[0.03] dark:bg-white/[0.04] text-gray-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Nomor akun aktif Anda.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-white mb-1.5">
              Instagram
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">@</span>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData((prev) => ({ ...prev, instagram: e.target.value.replace(/^@/, "") }))}
                placeholder="username_kamu"
                className="input w-full text-xs pl-7"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Opsional, untuk memudahkan teman kampus menyapa.</p>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving || compressing}
            className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
          >
            {saving ? "Menyimpan Biodata..." : "💾 Simpan Biodata Kampus"}
          </button>
        </div>
      </form>
    </div>
  );
}
