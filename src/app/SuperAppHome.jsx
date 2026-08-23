"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";

// Umur relatif singkat untuk kartu mading di beranda.
function waktuLalu(dateStr) {
  const detik = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export default function SuperAppHome({ latestListings = [], madingPosts = [], heroTitle, heroSubtitle }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans selection:bg-primary/20 overflow-x-hidden">
      
      {/* HEADER / HERO — marketplace task first, community discovery second. */}
      <div className="relative px-4 pb-5 pt-5 sm:px-6 md:px-10 lg:px-16 overflow-hidden">
        {/* Soft blob backgrounds for premium feel */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-300/20 rounded-full blur-[80px]" />
        <div className="absolute top-[20%] left-[-10%] w-72 h-72 bg-purple-400/15 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 xs:gap-2 mb-2.5 overflow-x-auto touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Paling Kiri: Cari Barang */}
            <Link 
              href="/jual-beli" 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-xs border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-primary active:scale-95 transition-all whitespace-nowrap"
            >
              <Icon.Search className="w-3.5 h-3.5 text-primary dark:text-emerald-400" />
              <span>Cari barang</span>
            </Link>

            {/* Menfess tetap mudah dijangkau dari beranda. */}
            <Link
              href="/mading"
              className="flex items-center gap-1.5 rounded-full border border-polmed/20 bg-white px-3 py-1.5 text-xs font-bold text-polmed shadow-xs transition-all active:scale-95 whitespace-nowrap dark:border-violet-400/30 dark:bg-slate-800 dark:text-violet-300"
            >
              <span className="text-xs">✍️</span>
              <span>Menfess</span>
            </Link>

            {/* Kanan: Cari Teman */}
            <Link 
              href="/chat" 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-polmed/10 dark:from-primary/20 dark:to-polmed/20 rounded-full shadow-xs border border-primary/20 dark:border-emerald-400/20 text-xs font-black text-primary dark:text-emerald-400 active:scale-95 transition-all whitespace-nowrap"
            >
              <span className="text-xs">🎭</span>
              <span>Cari temen</span>
            </Link>
          </div>

          <h1 className="max-w-xl text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {heroTitle || "Cari barang kampus. Jual tanpa ribet."}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {heroSubtitle || "Temukan kebutuhanmu dari sesama mahasiswa USU dan POLMED, atau pasang iklan dalam beberapa menit."}
          </p>
        </div>
      </div>

      {/* LATEST ADS (HORIZONTAL SCROLL) */}
      <div className="mt-2.5 mb-1">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Iklan Terbaru</h3>
            <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              👉 Geser ke samping
            </span>
          </div>
          <Link href="/jual-beli" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1 active:scale-95 transition-transform">
            <span>Lihat Semua</span>
            <Icon.ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="relative">
          <div className="flex gap-3 xs:gap-3.5 overflow-x-auto pb-1 pt-0 px-4 sm:px-6 md:px-10 lg:px-16 snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {latestListings.slice(0, 30).map((ad) => (
              <Link 
                key={ad.id} 
                href={`/produk/${buildSlug(ad.title, ad.id)}`}
                className="flex-none w-[140px] xs:w-[155px] sm:w-[175px] bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden snap-start hover:shadow-md active:scale-95 transition-all group no-tap-highlight"
              >
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {ad.image_url ? (
                    <Image 
                      src={ad.image_url} 
                      alt={ad.title} 
                      fill 
                      sizes="(max-width: 640px) 160px, 180px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Icon.Package className="w-10 h-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/65 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {rupiah(ad.price || 0)}
                  </div>
                </div>
                <div className="p-2.5 xs:p-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {ad.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    by {ad.seller_name || "Seseorang"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Icon.MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">{ad.campus === "Semua" ? "Medan" : ad.campus}</span>
                  </p>
                </div>
              </Link>
            ))}
            
            {/* LIHAT SEMUA CARD */}
            <Link 
              href="/jual-beli"
              className="flex-none w-[125px] xs:w-[145px] sm:w-[170px] bg-primary/5 dark:bg-primary/10 rounded-2xl border border-dashed border-primary/30 flex flex-col items-center justify-center snap-start hover:bg-primary/10 active:scale-95 transition-all group no-tap-highlight"
            >
              <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Icon.ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-primary">Lihat Semua</span>
              <span className="text-[10px] text-primary/70">Jelajahi Pasar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FEED MADING KAMPUS */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 mt-1">
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Menfess &amp; Info</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Cerita dan kabar dari kampus</p>
          </div>
          <Link href="/mading" className="text-xs font-semibold text-primary hover:text-primary/75">
            Lihat semua
          </Link>
        </div>
        
        {/* Postingan SUNGGUHAN dari database — bukan mockup. Versi awal bagian
            ini memajang menfess karangan dan pengumuman palsu atas nama BEM KM
            USU; barang karangan di halaman depan menipu pengunjung pertama dan
            mencatut nama organisasi nyata. Kalau madingnya kosong, katakan
            kosong — itu ajakan yang jujur. */}
        <div className="mt-3 space-y-3">
          {madingPosts.length === 0 && (
            <Link
              href="/mading"
              className="my-3 block rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-500 transition-colors hover:border-primary/50 dark:border-slate-700 dark:bg-slate-900"
            >
              Menfess & Info masih sepi — jadilah yang pertama menulis menfess atau info kampus ✍️
            </Link>
          )}
          {madingPosts.map((post) => {
            const isInfo = post.type === "info";
            return (
              <Link
                key={post.id}
                href={isInfo ? "/mading?tab=info" : "/mading"}
                className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ring-1 ring-inset ${isInfo ? "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/20" : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20"}`}>
                    {isInfo ? "📢" : "👤"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {post.sender_name || "Anonim"}
                      {post.faculty && post.faculty !== "Umum" ? ` (${post.faculty})` : ""}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className={`rounded-md px-1.5 py-0.5 font-medium ${isInfo ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                        {isInfo ? "Info Kampus" : "Menfess"}
                      </span>
                      <span>•</span>
                      <span>{waktuLalu(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                {post.title && (
                  <p className="mb-1 mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{post.title}</p>
                )}
                <p className={`text-sm leading-6 text-slate-700 dark:text-slate-300 ${post.title ? "" : "mt-3"} line-clamp-3`}>
                  {post.content}
                </p>
                {post.image_url && (
                  <div className="mt-2.5 rounded-xl overflow-hidden max-h-48 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <img src={post.image_url} alt="Foto mading" className="w-full h-36 object-cover" loading="lazy" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Icon.Heart className="h-3.5 w-3.5" /> {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon.MessageCircle className="h-3.5 w-3.5" /> {post.comments_count || 0} komentar
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
