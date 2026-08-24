"use client";

import { useState, useRef } from "react";
import Image from "next/image";
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

export default function PhotoUploadModal({
  isOpen,
  onClose,
  initialProfile = null,
  userId,
  onSuccess,
}) {
  const [photoUrl, setPhotoUrl] = useState(initialProfile?.photo_url || "");
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || "");
  const [campus, setCampus] = useState(initialProfile?.campus || "USU");
  const [faculty, setFaculty] = useState(initialProfile?.faculty || "Umum");
  const [batch, setBatch] = useState(initialProfile?.batch || "2024");
  const [intent, setIntent] = useState(initialProfile?.intent || "Teman Santai ☕");
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [instagram, setInstagram] = useState(initialProfile?.instagram || "");
  const [whatsapp, setWhatsapp] = useState(initialProfile?.whatsapp || "");
  
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
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
      
      // Upload via API upload
      const formData = new FormData();
      formData.append("file", compressedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        // Fallback convert to Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoUrl(reader.result);
          toast.success("Foto berhasil dipilih!");
        };
        reader.readAsDataURL(compressedFile);
      } else {
        const uploadData = await uploadRes.json();
        setPhotoUrl(uploadData.url || uploadData.image_url);
        toast.success("Foto profil berhasil diunggah! 📸");
      }
    } catch (err) {
      console.error("Compression/upload error:", err);
      toast.error("Gagal mengunggah foto, coba foto lain.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      toast.error("Foto profil wajib diunggah untuk membuka deck swipe!");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Nama panggilan wajib diisi");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId,
        photo_url: photoUrl,
        display_name: displayName,
        campus,
        faculty,
        batch,
        intent,
        bio,
        instagram,
        whatsapp,
      };

      const res = await fetch("/api/teman/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyimpan profil");
      }

      toast.success("Profil Teman berhasil disimpan! 🎉");
      onSuccess?.(data.profile);
      onClose();
    } catch (err) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const currentFaculties = campus === "Polmed" ? FACULTIES_POLMED : FACULTIES_USU;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#1c1c1e] p-6 shadow-2xl border border-black/[0.08] dark:border-white/[0.1]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <div>
              <h3 className="text-base font-black tracking-tight text-[#1d1d1f] dark:text-white">
                {initialProfile ? "Edit Profil Teman" : "Onboarding Teman Kampus"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lengkapi profil &amp; foto untuk mulai berkenalan
              </p>
            </div>
          </div>
          {initialProfile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Icon.X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* FOTO PROFIL SECTION */}
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
              Foto Profil Utama <span className="text-rose-500">* (Wajib)</span>
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] dark:border-violet-400/40 dark:bg-violet-500/10 flex items-center justify-center transition-all group"
              >
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <span className="text-2xl mb-0.5">📷</span>
                    <span className="text-[10px] font-bold text-primary dark:text-violet-300">
                      {compressing ? "Mengompres..." : "+ Upload"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Ganti
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-[#1d1d1f] dark:text-white">
                  Gunakan foto asli yang jelas ✨
                </p>
                <p className="text-[11px] leading-relaxed">
                  Foto akan otomatis dikompres ke format WebP hemat kuota.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="mt-1 text-xs font-bold text-primary dark:text-violet-400 hover:underline"
                >
                  {photoUrl ? "Pilih Foto Lain" : "Pilih dari Galeri"}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* NAMA & KAMPUS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Nama Panggilan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Contoh: Sarah / Budi"
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Kampus
              </label>
              <select
                value={campus}
                onChange={(e) => {
                  setCampus(e.target.value);
                  setFaculty("Umum");
                }}
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
              >
                <option value="USU">Universitas Sumatera Utara (USU)</option>
                <option value="Polmed">Politeknik Negeri Medan (Polmed)</option>
                <option value="Semua">Kampus Lainnya di Medan</option>
              </select>
            </div>
          </div>

          {/* FAKULTAS & ANGKATAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Fakultas / Jurusan
              </label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
              >
                {currentFaculties.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Angkatan
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
              >
                {["2026", "2025", "2024", "2023", "2022", "2021", "Alumni"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* INTENT / TUJUAN */}
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
              Tujuan Cari Teman
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INTENTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIntent(item)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    intent === item
                      ? "bg-primary text-white shadow-xs"
                      : "bg-black/[0.04] text-gray-700 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-gray-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* BIO */}
          <div>
            <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
              Bio / Cerita Singkat
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan hobi, tempat ngopi favorit, atau selera musik kamu..."
              className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* KONTAK (WHATSAPP & INSTAGRAM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                WhatsApp <span className="text-[10px] text-gray-400 font-normal">(Hanya dibagikan saat Match)</span>
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0812xxxx"
                className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] px-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Instagram <span className="text-[10px] text-gray-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="username_kamu"
                  className="w-full rounded-xl border border-black/[0.1] bg-black/[0.02] dark:border-white/[0.1] dark:bg-white/[0.04] pl-7 pr-3 py-2 text-xs text-[#1d1d1f] dark:text-white outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || compressing}
              className="w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? "Menyimpan Profil..." : "🚀 Simpan & Buka Deck Teman"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
