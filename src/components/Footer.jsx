"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Icon } from "@/components/Icons";
import { terapkanTema } from "@/lib/tampilan";

export default function Footer({ config }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const handleThemeChange = (e) => {
      setDark(e.detail?.dark ?? document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("theme:change", handleThemeChange);
    return () => window.removeEventListener("theme:change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const isDark = !dark;
    setDark(isDark);
    terapkanTema(isDark ? "gelap" : "terang");
  };

  return (
    <footer className="w-full bg-white dark:bg-[#0f172a] border-t border-[#E2E8F0] dark:border-white/[0.08] mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* 4-Column Master Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12">
          {/* Kolom 1: Identitas & Visi */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-sm font-bold text-sm">
                <Icon.GraduationCap className="w-5 h-5 text-emerald-200" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-[#0F172A] dark:text-white tracking-tight leading-none font-sans">
                  Kampus Kita
                </span>
                <span className="text-[11px] font-semibold text-[#047857] dark:text-emerald-400 tracking-wider uppercase leading-tight mt-0.5">
                  Untuk Mahasiswa Indonesia
                </span>
              </div>
            </div>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed font-sans">
              Platform digital untuk mahasiswa lintas kampus di Indonesia: jual-beli preloved, Open PO, dan ruang berbagi komunitas.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-300 text-xs font-semibold border border-emerald-600/20">
                <Icon.ShieldCheck className="w-3.5 h-3.5" />
                Komunitas Mahasiswa
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 text-xs font-medium">
                <Icon.MapPin className="w-3.5 h-3.5" />
                Lintas Kampus
              </span>
            </div>
          </div>

          {/* Kolom 2: Panduan Titik Temu COD */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 font-sans">
              <Icon.MapPin className="text-[#047857] w-4 h-4" />
              Pilih Titik Temu COD
            </span>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Saat bertemu, utamakan lokasi yang:
            </p>
            <ul className="text-xs text-[#0F172A] dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#047857] mt-1.5 shrink-0" />
                <span className="text-[#64748B] dark:text-slate-400">Ramai dan terbuka untuk umum</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#047857] mt-1.5 shrink-0" />
                <span className="text-[#64748B] dark:text-slate-400">Mudah dijangkau kedua pihak</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span className="text-[#64748B] dark:text-slate-400">Disepakati melalui chat sebelum berangkat</span>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Protokol Keamanan */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 font-sans">
              <Icon.ShieldCheck className="text-[#047857] w-4 h-4" />
              Protokol Keamanan COD
            </span>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-white/[0.06] flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Icon.User className="text-[#047857] w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">Periksa Profil Penjual</p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Tinjau informasi dan riwayat akun sebelum menyepakati transaksi.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Icon.CheckCircle className="text-[#047857] w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">Cek Barang Sebelum Bayar</p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Periksa kondisi dan fungsi barang sebelum melakukan pembayaran.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Icon.Clock className="text-[#F59E0B] w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#0F172A] dark:text-white">Jam COD Aman</p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Pilih waktu yang nyaman dan lokasi publik yang ramai.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom 4: Legalitas & Komunitas */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 font-sans">
              <Icon.HelpCircle className="text-[#047857] w-4 h-4" />
              Bantuan &amp; Panduan
            </span>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Rujukan keselamatan &amp; etika komunitas:
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/panduan-aman" className="text-[#047857] dark:text-emerald-400 hover:underline flex items-center gap-1.5 font-medium">
                <Icon.ArrowRight className="w-3.5 h-3.5" />
                Panduan Aman Transaksi COD
              </Link>
              <Link href="/syarat-ketentuan" className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white flex items-center gap-1.5 transition-colors">
                <Icon.FileText className="w-3.5 h-3.5" />
                Ketentuan &amp; Etika Menfess
              </Link>
              <Link href="/kebijakan-privasi" className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white flex items-center gap-1.5 transition-colors">
                <Icon.ShieldCheck className="w-3.5 h-3.5" />
                Kebijakan Privasi
              </Link>
              <Link href="/faq" className="text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white flex items-center gap-1.5 transition-colors">
                <Icon.HelpCircle className="w-3.5 h-3.5" />
                Pusat Bantuan / FAQ
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#E2E8F0] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748B] dark:text-slate-500 text-center sm:text-left">
            © 2026 Kampus Kita. Hak cipta dilindungi.
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-white/[0.12] bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
            >
              {dark ? (
                <>
                  <Icon.Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Icon.Moon className="h-3.5 w-3.5 text-slate-600" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
