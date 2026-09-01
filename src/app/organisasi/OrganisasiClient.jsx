"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { UKM_CATEGORIES } from "@/lib/organisasi";
import { Icon } from "@/components/Icons";

export default function OrganisasiClient({ initialOrganisasi = [] }) {
  const [organisasi, setOrganisasi] = useState(initialOrganisasi);
  const [loading, setLoading] = useState(initialOrganisasi.length === 0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCampus, setSelectedCampus] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedCampus !== "Semua") params.set("campus", selectedCampus);
        if (searchQuery) params.set("q", searchQuery);

        const res = await fetch(`/api/organisasi?${params.toString()}`);
        const data = await res.json();
        setOrganisasi(data.organisasi || []);
      } catch (err) {
        console.error("Gagal memuat direktori organisasi:", err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, selectedCampus, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0b0b0f] pb-[calc(6.5rem+env(safe-area-inset-bottom))] font-sans selection:bg-primary/20">
      {/* HEADER SECTION */}
      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary border border-primary/20">
                <Icon.Landmark className="h-4 w-4" /><span>Ekosistem Komunitas Mahasiswa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Direktori UKM & Organisasi Kampus
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-2xl">
                Temukan dan ikuti kegiatan BEM, HIMA, lembaga, dan Unit Kegiatan Mahasiswa resmi di Universitas Sumatera Utara (USU) & Politeknik Negeri Medan (POLMED).
              </p>
            </div>

            <Link
              href="/organisasi/daftar"
              className="btn-primary py-2.5 px-4 text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 shrink-0 self-start md:self-auto"
            >
              <span>+ Daftarkan Akun Organisasi</span>
            </Link>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama UKM, organisasi, atau fakultas..."
                className="input py-2.5 pl-9 pr-4 text-xs shadow-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800"
              />
              <Icon.Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>

            {/* Campus Selector */}
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
              {["Semua", "USU", "POLMED"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCampus(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCampus === c
                      ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* CATEGORIES PILLS */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === "all"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50"
              }`}
            >
              Semua Kategori
            </button>
            {UKM_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label.replace(/^[^\w]+/, "").trim()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DIRECTORY GRID CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-3xl bg-gray-200/70 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : organisasi.length === 0 ? (
          <div className="card p-12 text-center max-w-md mx-auto space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">
              <Icon.Landmark className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Organisasi Tidak Ditemukan
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Belum ada organisasi yang cocok dengan saringan atau kata kunci pencarian.
              </p>
            </div>
            <Link href="/organisasi/daftar" className="btn-primary inline-flex text-xs py-2 px-4">
              <span>+ Daftarkan Organisasimu Sekarang</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {organisasi.map((org) => {
              const catObj = UKM_CATEGORIES.find((c) => c.id === org.ukm_category);
              const igClean = org.ukm_instagram?.replace(/^@/, "");

              return (
                <div
                  key={org.id}
                  className="card p-5 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Logo, Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-slate-800 shadow-sm">
                        {org.photo_url ? (
                          <Image
                            src={org.photo_url}
                            alt={org.ukm_name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">
                            <Icon.Landmark className="h-7 w-7" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* Lencana ini dulu menempel di SEMUA kartu tanpa membaca
                            ukm_verified — termasuk enam contoh etalase yang tak
                            pernah mendaftar. Sekarang ia menyatakan sesuatu. */}
                        {org.is_demo ? (
                          <span
                            title="Belum mendaftar — ditampilkan sebagai contoh direktori"
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
                          >
                            Contoh
                          </span>
                        ) : org.ukm_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                             Resmi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            Terdaftar
                          </span>
                        )}
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:text-emerald-400">
                          {org.campus}
                        </span>
                      </div>
                    </div>

                    {/* Org Name & Faculty */}
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors leading-tight">
                        {org.ukm_name}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        {(() => { const CategoryIcon = Icon[catObj?.icon] || Icon.Box; return <CategoryIcon className="h-4 w-4" />; })()}
                        <span>{org.faculty || "Tingkat Universitas"}</span>
                      </p>
                    </div>

                    {/* Bio / Description */}
                    <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {org.bio || "Organisasi mahasiswa resmi di lingkungan kampus USU & POLMED."}
                    </p>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {igClean ? (
                      <a
                        href={`https://instagram.com/${igClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-gray-700 dark:text-slate-200 hover:text-primary flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Icon.Instagram className="h-4 w-4" />
                        <span>@{igClean}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400">Official Partner</span>
                    )}

                    <Link
                      href={`/mading?tab=organisasi`}
                      className="btn-outline text-[11px] py-1 px-3 rounded-xl flex items-center gap-1 font-semibold"
                    >
                      <span>Lihat Postingan</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
