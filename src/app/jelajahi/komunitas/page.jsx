"use client";

import { useState } from "react";
import Link from "next/link";

const COMMUNITIES = [
  {
    id: "psm-usu",
    name: "UKM Paduan Suara USU",
    category: "UKM",
    faculty: "Universitas",
    description: "Wadah pengembangan bakat mahasiswa di bidang seni tarik suara dan paduan suara tingkat nasional.",
    icon: "music_note",
    members: "140+ Anggota",
  },
  {
    id: "ukm-olahraga",
    name: "UKM Olahraga USU",
    category: "UKM",
    faculty: "Universitas",
    description: "Pengembangan minat dan prestasi olahraga mahasiswa: basket, futsal, badminton, dan atletik.",
    icon: "sports_basketball",
    members: "210+ Anggota",
  },
  {
    id: "hmif-usu",
    name: "Himpunan Mahasiswa Teknik Informatika",
    category: "Himpunan",
    faculty: "Fasilkom-TI",
    description: "Organisasi mahasiswa Program Studi Teknik Informatika & Ilmu Komputer untuk kolaborasi teknologi.",
    icon: "terminal",
    members: "320+ Anggota",
  },
  {
    id: "paguyuban-riau",
    name: "Paguyuban Riau USU",
    category: "Paguyuban Daerah",
    faculty: "Lintas Fakultas",
    description: "Wadah silaturahmi mahasiswa asal daerah Riau di lingkungan kampus USU & Polmed.",
    icon: "diversity_3",
    members: "180+ Anggota",
  },
  {
    id: "fotografi-usu",
    name: "Komunitas Fotografi USU",
    category: "Komunitas Minat",
    faculty: "Lintas Fakultas",
    description: "Komunitas penggemar fotografi analog maupun digital serta dokumentasi kegiatan kampus.",
    icon: "photo_camera",
    members: "95+ Anggota",
  },
];

const CATEGORIES = ["Semua", "UKM", "Himpunan", "Paguyuban Daerah", "Komunitas Minat"];
const FACULTIES = ["Semua Fakultas", "Universitas", "Fasilkom-TI", "Lintas Fakultas"];

export default function KomunitasPage() {
  const [category, setCategory] = useState("Semua");
  const [faculty, setFaculty] = useState("Semua Fakultas");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = COMMUNITIES.filter((c) => {
    if (category !== "Semua" && c.category !== category) return false;
    if (faculty !== "Semua Fakultas" && c.faculty !== faculty) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-16 font-sans text-[#101f15] dark:text-[#ecfeee]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#003622] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">groups</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">
                Komunitas & UKM
              </h1>
              <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-400">
                Jelajahi Unit Kegiatan Mahasiswa, himpunan, dan komunitas di lingkungan kampus.
              </p>
            </div>
          </div>

          <Link
            href="/organisasi"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-extrabold shadow-sm transition"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Daftarkan Komunitas
          </Link>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
                category === cat
                  ? "bg-[#003622] text-white"
                  : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 hover:bg-[#e6f8e8]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search + Faculty Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707972] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Cari UKM atau komunitas (mis. "Paduan Suara", "HMIF")'
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white dark:bg-[#112218] text-sm text-[#101f15] dark:text-white placeholder:text-[#707972] shadow-[0_2px_10px_-2px_rgba(19,78,53,0.06)] focus:outline-none focus:ring-2 focus:ring-[#134e35]"
            />
          </div>
          <select
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            className="sm:w-56 px-4 py-3 rounded-full bg-white dark:bg-[#112218] text-xs font-bold text-[#101f15] dark:text-white shadow-[0_2px_10px_-2px_rgba(19,78,53,0.06)] focus:outline-none"
          >
            {FACULTIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* 3-Col Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="bg-white dark:bg-[#112218] rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-44 bg-gradient-to-br from-[#003622] to-[#1b6345] flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-[64px] text-white/25 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#ceeb7a] text-[#003622] text-[11px] font-extrabold">
                    {item.category}
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-extrabold text-[#101f15] dark:text-white">{item.name}</h3>
                  <p className="text-xs text-[#404943] dark:text-slate-300 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5 pt-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#707972]">{item.members}</span>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#003622] dark:text-[#bef264] hover:underline"
                >
                  Lihat Profil
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
            </article>
          ))}

          {/* Open Recruitment Promo Card */}
          <div className="bg-[#ceeb7a] rounded-3xl p-6 flex flex-col justify-between text-[#003622] shadow-[0_4px_20px_-4px_rgba(19,78,53,0.08)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-white/70 text-[11px] font-extrabold">
                  Informasi Terkini
                </span>
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[#003622]">campaign</span>
                </div>
              </div>
              <h3 className="text-xl font-extrabold leading-snug">Open Recruitment UKM & Komunitas</h3>
              <p className="text-xs text-[#162b00] leading-relaxed">
                Lihat daftar UKM dan organisasi mahasiswa yang sedang membuka pendaftaran anggota baru untuk semester ini.
              </p>
            </div>
            <Link
              href="/organisasi"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#003622] text-white text-xs font-extrabold w-fit hover:bg-[#134e35] transition"
            >
              Lihat Sekarang
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-[#112218] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#ceeb7a] text-[#003622] text-xs font-extrabold">{selected.category}</span>
              <button type="button" onClick={() => setSelected(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <h3 className="text-lg font-extrabold text-[#003622] dark:text-white">{selected.name}</h3>
            <p className="text-sm text-[#404943] dark:text-slate-300 leading-relaxed">{selected.description}</p>
            <div className="rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-3.5 text-xs space-y-1">
              <p><b>Fakultas / Lingkup:</b> {selected.faculty}</p>
              <p><b>Keanggotaan:</b> {selected.members}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/organisasi"
                className="flex-1 text-center py-2.5 rounded-full bg-[#003622] text-white text-xs font-extrabold"
              >
                Portal Organisasi
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-5 py-2.5 rounded-full border border-[#e2f0e6] dark:border-white/10 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
