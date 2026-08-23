"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";

function GridItem({ href, icon, label, colorClass, delay }) {
  const Comp = icon;
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center justify-start p-2 rounded-2xl ${colorClass} shadow-sm border border-white/40 backdrop-blur-md hover:scale-95 transition-transform animate-in fade-in zoom-in duration-500`}
      style={{ animationDelay: delay }}
    >
      <div className="bg-white/80 p-2 rounded-full shadow-inner mb-2">
        <Comp className="w-6 h-6 opacity-90" strokeWidth="2" />
      </div>
      <span className="text-[11px] font-bold text-gray-800 tracking-tight text-center leading-tight">{label}</span>
    </Link>
  );
}

export default function SuperAppHome({ latestListings = [], heroTitle, heroSubtitle }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans selection:bg-primary/20 overflow-x-hidden">
      
      {/* HEADER / HERO */}
      <div className="relative pt-10 pb-6 px-5 sm:px-6 md:px-10 lg:px-16 overflow-hidden">
        {/* Soft blob backgrounds for premium feel */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300/30 rounded-full blur-[80px]" />
        <div className="absolute top-[20%] left-[-10%] w-72 h-72 bg-blue-400/20 rounded-full blur-[80px]" />
        
        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-extrabold text-primary tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded">
              KAMPUS HUB
            </span>
            <Link href="/jual-beli" className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              <Icon.Search className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
            {heroTitle || "Halo, Mahasiswa!"}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug pr-4 line-clamp-2">
            {heroSubtitle || "Pusat info, jual beli, dan obrolan seru anak kampus."}
          </p>
        </div>

        {/* 4 GRID MENU */}
        <div className="grid grid-cols-4 gap-3 mt-6 relative z-10">
          <GridItem 
            href="/jual-beli" 
            icon={Icon.Package} 
            label="Pasar" 
            colorClass="bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/40 dark:to-green-800/40" 
            delay="0ms" 
          />
          <GridItem 
            href="/chat" 
            icon={Icon.User} 
            label="Teman" 
            colorClass="bg-gradient-to-br from-blue-100 to-sky-200 dark:from-blue-900/40 dark:to-sky-800/40" 
            delay="100ms" 
          />
          <GridItem 
            href="/mading" 
            icon={Icon.BookOpen} 
            label="Mading" 
            colorClass="bg-gradient-to-br from-orange-100 to-amber-200 dark:from-orange-900/40 dark:to-amber-800/40" 
            delay="200ms" 
          />
          <GridItem 
            href="/mading?tab=info" 
            icon={Icon.Info} 
            label="Info" 
            colorClass="bg-gradient-to-br from-purple-100 to-fuchsia-200 dark:from-purple-900/40 dark:to-fuchsia-800/40" 
            delay="300ms" 
          />
        </div>
      </div>

      {/* LATEST ADS (HORIZONTAL SCROLL) */}
      <div className="mt-6 mb-10">
        <div className="flex items-center justify-between px-5 sm:px-6 md:px-10 lg:px-16 mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Iklan Terbaru</h3>
          <Link href="/jual-beli" className="text-sm font-semibold text-primary hover:underline">
            Lihat Semua
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-6 px-5 sm:px-6 md:px-10 lg:px-16 snap-x snap-mandatory hide-scrollbar">
          {latestListings.slice(0, 30).map((ad, idx) => (
            <Link 
              key={ad.id} 
              href={`/produk/${buildSlug(ad.title, ad.id)}`}
              className="flex-none w-[140px] sm:w-[180px] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden snap-start hover:shadow-md transition-shadow group"
            >
              <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {ad.image_url ? (
                  <Image 
                    src={ad.image_url} 
                    alt={ad.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Icon.Package className="w-10 h-10 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  {rupiah(ad.price || 0)}
                </div>
              </div>
              <div className="p-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                  {ad.title}
                </h4>
                <p className="text-[10px] text-slate-500 truncate">
                  by {ad.seller_name || "Seseorang"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Baru Saja
                </p>
              </div>
            </Link>
          ))}
          
          {/* LIHAT SEMUA CARD */}
          <Link 
            href="/jual-beli"
            className="flex-none w-[140px] sm:w-[180px] bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex flex-col items-center justify-center snap-start hover:bg-primary/10 transition-colors group"
          >
            <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Icon.ArrowUp className="w-6 h-6 rotate-90" />
            </div>
            <span className="text-sm font-bold text-primary">Lihat 400+</span>
            <span className="text-[10px] text-primary/70">Barang Lainnya</span>
          </Link>
        </div>
      </div>

      {/* FEED MADING KAMPUS */}
      <div className="px-5 sm:px-6 md:px-10 lg:px-16">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mading & Menfess</h3>
          <Link href="/mading" className="text-xs font-bold text-primary hover:underline">
            Buka Mading →
          </Link>
        </div>
        
        <div className="space-y-4">
          {/* MOCKUP MENFESS 1 */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-amber-400" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg">
                👤
              </div>
              <div>
                <p className="text-sm font-bold">Anonim (FIB)</p>
                <p className="text-[10px] text-slate-500">Menfess • 10 menit lalu</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Tadi pagi jam 10 di perpus ketemu cowok pakai jaket himpunan mesin, manis banget senyumnya. Kalau ada yang tau ignya, bisikin dong 😆
            </p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 text-slate-500 text-xs font-medium">
              <button className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                <Icon.Heart className="w-4 h-4" /> 12
              </button>
              <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                <Icon.MessageCircle className="w-4 h-4" /> 4 Komentar
              </button>
            </div>
          </div>

          {/* MOCKUP INFO KAMPUS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-fuchsia-500" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold text-lg">
                📢
              </div>
              <div>
                <p className="text-sm font-bold">BEM KM USU</p>
                <p className="text-[10px] text-slate-500">Info Kampus • 2 jam lalu</p>
              </div>
            </div>
            <p className="text-sm font-bold mb-1 dark:text-slate-200">Open Recruitment Panitia PORSENI 2026!</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              Halo sobat USU! PORSENI kembali hadir. Buat kamu yang ingin melatih leadership dan nambah relasi, yuk daftar jadi panitia sekarang juga. Slot terbatas!
            </p>
            <button className="mt-3 text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
              Baca Selengkapnya
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
