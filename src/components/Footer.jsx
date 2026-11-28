"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="hidden lg:block w-full bg-white/90 dark:bg-[#112218] border-t border-[#134e35]/10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#003622] flex items-center justify-center text-[#ceeb7a]">
            <span className="material-symbols-outlined text-[17px]">local_library</span>
          </div>
          <span className="text-sm font-bold text-[#003622] dark:text-white tracking-tight">
            Kampus Kita • Universitas Sumatera Utara
          </span>
        </div>

        <nav aria-label="Bantuan dan informasi" className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#404943] dark:text-[#99d3b2]">
          <Link href="/jelajahi/bantuan" className="hover:text-[#003622] dark:hover:text-white transition-colors">
            Pusat Bantuan
          </Link>
          <Link href="/syarat-ketentuan" className="hover:text-[#003622] dark:hover:text-white transition-colors">
            Ketentuan Layanan
          </Link>
          <Link href="/kebijakan-privasi" className="hover:text-[#003622] dark:hover:text-white transition-colors">
            Privasi Mahasiswa
          </Link>
          <Link href="/panduan-aman" className="hover:text-[#003622] dark:hover:text-white transition-colors">
            Panduan Aman COD
          </Link>
        </nav>

        <p className="text-xs text-[#707972] dark:text-[#85be9e]">
          © {new Date().getFullYear()} Kampus Kita. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
