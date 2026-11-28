"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    title: "Agenda Kampus",
    badge: "3 Event Hari Ini",
    badgeTone: "bg-[#e8f7d9] text-[#3f6212]",
    desc: "Jadwal batas KRS, wisuda periode I, seminar nasional rektorat, dan agenda akademik berjalan.",
    metaIcon: "schedule",
    meta: "Kalender Akademik & Event",
    cta: "Lihat Kalender",
    href: "/jelajahi/agenda",
    icon: "event",
  },
  {
    title: "Direktori Kampus",
    badge: "16 Fakultas",
    badgeTone: "bg-[#f1f5f2] text-[#4b6053]",
    desc: "Buku kontak resmi dekanat, tata usaha, unit perpustakaan pusat, klinik, hingga laboratorium.",
    metaIcon: "verified",
    meta: "Ekstensi Terverifikasi",
    cta: "Cari Kontak",
    href: "/jelajahi/direktori",
    icon: "apartment",
  },
  {
    title: "Lost & Found",
    badge: "Lapor Cepat",
    badgeTone: "bg-[#bef264] text-[#134e35] font-bold",
    desc: "Kehilangan tumbler, KTM, atau flashdisk di area kampus? Buat laporan atau cek temuan satpam.",
    metaIcon: "inventory_2",
    meta: "Posko Terpadu",
    cta: "Buka Portal",
    href: "/jelajahi/lost-found",
    icon: "manage_search",
  },
  {
    title: "Komunitas & UKM",
    badge: "42 Klub Aktif",
    badgeTone: "bg-[#f1f5f2] text-[#4b6053]",
    desc: "Eksplorasi himpunan jurusan, unit kegiatan mahasiswa, robotik, pecinta alam, & study group.",
    metaIcon: "how_to_reg",
    meta: "Open Recruitment",
    cta: "Gabung UKM",
    href: "/jelajahi/komunitas",
    icon: "groups",
  },
  {
    title: "Pusat Bantuan",
    badge: "Helpdesk",
    badgeTone: "bg-[#f1f5f2] text-[#4b6053]",
    desc: "FAQ pembayaran UKT, reset akun portal akademik, aduan fasilitas rusak, dan konseling mahasiswa.",
    metaIcon: "forum",
    meta: "Respon < 2 Jam",
    cta: "Buat Tiket",
    href: "/jelajahi/bantuan",
    icon: "support_agent",
  },
];

const FAQS = [
  {
    q: "Bagaimana cara meminjam ruang seminar?",
    a: "Ajukan surat peminjaman ruangan melalui biro administrasi fakultas atau melalui menu Pusat Bantuan minimal H-7 sebelum acara.",
  },
  {
    q: "Di mana lokasi pengambilan barang hilang?",
    a: "Barang temuan dapat diambil di Posko Satpam Gerbang Utama dengan menunjukkan KTM atau bukti kepemilikan.",
  },
  {
    q: "Kapan operasional shuttle bus LINUSKU?",
    a: "Senin–Jumat pukul 07.00–18.00 WIB dan Sabtu pukul 07.00–13.00 WIB.",
  },
];

export default function JelajahiPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const filteredModules = MODULES.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${m.title} ${m.desc} ${m.meta}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f4f8f5] lg:bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      {/* ==================== MOBILE VIEW (< lg) — 100% STITCH jelajahi_discovery_hub ==================== */}
      <div className="lg:hidden max-w-md mx-auto px-4 pt-3 pb-28 flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight text-[#0f3d2a] dark:text-white">Jelajahi Kampus</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#14532d] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                Terpadu
              </span>
            </div>
            <p className="text-xs text-[#52665a] dark:text-[#99d3b2] leading-relaxed">
              Pusat layanan, direktori resmi &amp; ekosistem civitas akademika
            </p>
          </div>

          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71877a] text-[19px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari layanan, gedung, lab, kontak..."
              className="w-full bg-white dark:bg-[#112218] text-[#111827] dark:text-white text-[13px] placeholder-[#8a9f93] pl-10 pr-4 py-2.5 rounded-xl border border-[#e2ece5] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#134e35]/20 shadow-xs"
            />
          </div>
        </section>

        {/* Emergency / Siaga 24/7 */}
        <section className="w-full bg-[#134e35] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#bef264] text-[#134e35] text-[11px] font-bold">
                <span className="material-symbols-outlined text-[13px]">local_police</span>
                Siaga 24/7
              </span>
              <span className="text-xs text-[#a7d7be] font-medium">Kanal Tanggap Cepat</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ada Kendala atau Situasi Darurat?</h2>
              <p className="text-[12px] text-[#cfead9] mt-0.5 leading-snug">
                Akses cepat posko pengamanan gerbang utama &amp; ambulans klinik kampus.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="tel:0618210000"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#bef264] text-[#134e35] text-xs font-bold active:scale-95 transition-transform shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">call</span>
                <span>Posko Satpam</span>
              </a>
              <a
                href="tel:118"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e6b4a] text-white hover:bg-[#25825a] text-xs font-medium active:scale-95 transition-transform border border-white/10"
              >
                <span className="material-symbols-outlined text-[15px] text-[#bef264]">emergency</span>
                <span>Ambulans</span>
              </a>
            </div>
          </div>
          <div className="absolute -right-3 -bottom-5 text-white/10 pointer-events-none">
            <span className="material-symbols-outlined text-[110px]">verified_user</span>
          </div>
        </section>

        {/* 5 Modul Layanan Utama */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#134e35] dark:text-white">Layanan Utama</h2>
            <span className="text-[11px] font-semibold text-[#5d7567] bg-[#e4ede7] px-2 py-0.5 rounded-full">
              {filteredModules.length} Modul Aktif
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredModules.map((mod) => (
              <Link
                key={mod.title}
                href={mod.href}
                className="bg-white dark:bg-[#112218] rounded-xl p-3.5 border border-[#e3ece6] dark:border-white/10 shadow-xs hover:border-[#134e35]/30 transition-all flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#eef7f1] text-[#134e35] flex items-center justify-center shrink-0 border border-[#ddede3]">
                  <span className="material-symbols-outlined text-[22px]">{mod.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-bold text-[#111827] dark:text-white truncate">{mod.title}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] shrink-0 font-semibold", mod.badgeTone)}>
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#607368] dark:text-[#99d3b2] line-clamp-2 mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f6f3] dark:border-white/10">
                    <span className="flex items-center gap-1 text-[11px] text-[#6b7280]">
                      <span className="material-symbols-outlined text-[13px] text-[#8ca395]">{mod.metaIcon}</span>
                      {mod.meta}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#134e35] dark:text-[#bef264]">
                      {mod.cta}
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Fasilitas Populer */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#134e35] dark:text-white">Fasilitas Populer</h2>
            <Link href="/jelajahi/direktori" className="text-[11px] font-semibold text-[#134e35] flex items-center gap-0.5 hover:underline">
              Semua Denah
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/jelajahi/direktori" className="bg-white dark:bg-[#112218] rounded-xl p-3 border border-[#e3ece6] space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-[#134e35] text-white text-[10px] font-bold">Buka</span>
              <h3 className="text-xs font-bold text-[#101f15] dark:text-white">Perpustakaan USU</h3>
              <p className="text-[10px] text-[#607368]">08.00 - 20.00 WIB</p>
              <p className="text-[10px] text-[#134e35] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">wifi</span> Free Eduroam
              </p>
            </Link>
            <Link href="/jelajahi/direktori" className="bg-white dark:bg-[#112218] rounded-xl p-3 border border-[#e3ece6] space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-[#bef264] text-[#134e35] text-[10px] font-bold">Tersedia</span>
              <h3 className="text-xs font-bold text-[#101f15] dark:text-white">Gelanggang Remaja</h3>
              <p className="text-[10px] text-[#607368]">Booking Online UKM</p>
              <p className="text-[10px] text-[#134e35] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">sports_tennis</span> 3 Lapangan
              </p>
            </Link>
          </div>
        </section>

        {/* Tanya Jawab Singkat */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#134e35] dark:text-white">Tanya Jawab Singkat</h2>
            <Link href="/jelajahi/bantuan" className="text-[11px] font-semibold text-[#52665a]">Panduan Cepat</Link>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="bg-white dark:bg-[#112218] rounded-xl border border-[#e3ece6] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full px-3.5 py-3 text-left flex items-center justify-between gap-2 text-xs font-semibold text-[#101f15] dark:text-white"
                  >
                    <span>{f.q}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#134e35]">
                      {open ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {open && <div className="px-3.5 pb-3 text-[11px] text-[#404943] dark:text-[#99d3b2]">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ==================== DESKTOP VIEW (lg+) — 100% STITCH jelajahi / jelajahi_beranda ==================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 pb-16 space-y-6">
        {/* Header Banner */}
        <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-stitch-card flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e6f8e8] text-[#003622] flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">explore</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">Jelajahi</h1>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2] mt-0.5">
                Temukan berbagai layanan dan fasilitas terpadu di lingkungan kampus.
              </p>
            </div>
          </div>

          <div className="relative w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707972] text-[18px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari agenda, gedung, UKM, atau bantuan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#e6f8e8] dark:bg-[#183022] text-xs text-[#101f15] dark:text-white outline-none"
            />
          </div>
        </div>

        {/* 5-Card Grid Layanan Terpadu */}
        <div>
          <h2 className="text-lg font-extrabold text-[#003622] dark:text-white mb-4">Layanan &amp; Fasilitas Terpadu</h2>
          <div className="grid grid-cols-3 gap-5">
            {filteredModules.map((mod) => (
              <Link
                key={`desk-${mod.title}`}
                href={mod.href}
                className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-stitch-card hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#e6f8e8] text-[#003622] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">{mod.icon}</span>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold", mod.badgeTone)}>
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#101f15] dark:text-white group-hover:text-[#003622]">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-[#404943] dark:text-[#99d3b2] leading-relaxed">{mod.desc}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-semibold text-[#707972]">{mod.meta}</span>
                  <span className="w-8 h-8 rounded-full bg-[#003622] text-[#ceeb7a] flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
