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

export default function SuperAppHome({ latestListings = [], madingPosts = [] }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24 font-sans selection:bg-primary/20 dark:bg-[#000000] overflow-x-hidden">
      
      {/* QUICK ACTIONS BAR — Apple Capsule Bar */}
      <div className="relative px-4 pt-3.5 pb-2 sm:px-6 md:px-10 lg:px-16">
        <div className="relative z-10">
          <div className="flex items-center gap-2 overflow-x-auto touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
            {/* Cari Barang */}
            <Link 
              href="/jual-beli" 
              className="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#1d1d1f] transition-all hover:bg-black/[0.03] active:scale-[0.96] whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:bg-white/[0.08]"
            >
              <Icon.Search className="w-3.5 h-3.5 text-primary dark:text-violet-400" />
              <span>Cari barang</span>
            </Link>

            {/* Jasa Mahasiswa */}
            <Link
              href="/jasa"
              className="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#1d1d1f] transition-all hover:bg-black/[0.03] active:scale-[0.96] whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:bg-white/[0.08]"
            >
              <span className="text-xs">⚡</span>
              <span>Jasa</span>
            </Link>

            {/* Menfess */}
            <Link
              href="/mading"
              className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/15 active:scale-[0.96] whitespace-nowrap dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-300"
            >
              <Icon.BookOpen className="h-3.5 w-3.5" />
              <span>Menfess</span>
            </Link>

            {/* Dicari */}
            <Link
              href="/dicari"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/8 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-500/15 active:scale-[0.96] whitespace-nowrap dark:border-amber-400/30 dark:bg-amber-500/15"
            >
              <span className="text-xs">🔍</span>
              <span>Dicari</span>
            </Link>

            {/* Cari Teman Swipe */}
            <Link 
              href="/teman" 
              className="flex items-center gap-1.5 rounded-full border border-pink-500/25 bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-3.5 py-1.5 text-xs font-black text-pink-700 dark:text-pink-300 transition-all hover:bg-pink-500/20 active:scale-[0.96] whitespace-nowrap shadow-2xs"
            >
              <span>🔥</span>
              <span>Cari Teman</span>
            </Link>

            {/* Obrolan Kampus */}
            <Link 
              href="/chat" 
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/15 active:scale-[0.96] whitespace-nowrap dark:border-emerald-400/30 dark:bg-emerald-500/15"
            >
              <Icon.MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Pusat Obrolan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* LATEST ADS (HORIZONTAL SCROLL) */}
      <div className="mt-2 mb-2">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Iklan Terbaru</h3>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
              Geser untuk melihat
            </span>
          </div>
          <Link href="/jual-beli" className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1 active:scale-[0.96] transition-transform">
            <span>Lihat Semua</span>
            <Icon.ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="relative">
          <div className="flex gap-3 xs:gap-3.5 overflow-x-auto pb-1.5 pt-0 px-4 sm:px-6 md:px-10 lg:px-16 snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {latestListings.slice(0, 30).map((ad) => (
              <Link 
                key={ad.id} 
                href={`/produk/${buildSlug(ad.title, ad.id)}`}
                className="flex-none w-[140px] xs:w-[155px] sm:w-[175px] overflow-hidden rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] snap-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-[0.97] dark:border-white/[0.08] dark:bg-[#1c1c1e] group no-tap-highlight"
              >
                <div className="relative aspect-square w-full bg-black/[0.03] dark:bg-black/40 overflow-hidden">
                  {ad.image_url ? (
                    <Image 
                      src={ad.image_url} 
                      alt={ad.title} 
                      fill 
                      sizes="(max-width: 640px) 160px, 180px"
                      className="object-cover group-hover:scale-104 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Icon.Package className="w-10 h-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-[#1d1d1f]/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {rupiah(ad.price || 0)}
                  </div>
                </div>
                <div className="p-2.5 xs:p-3">
                  <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {ad.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    by {ad.seller_name || "Seseorang"}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    <Icon.MapPin className="w-2.5 h-2.5" />
                    <span className="truncate">{ad.campus === "Semua" ? "Medan" : ad.campus}</span>
                  </p>
                </div>
              </Link>
            ))}
            
            {/* LIHAT SEMUA CARD */}
            <Link 
              href="/jual-beli"
              className="flex-none w-[125px] xs:w-[145px] sm:w-[170px] rounded-[20px] border border-dashed border-primary/30 bg-primary/[0.04] flex flex-col items-center justify-center snap-start hover:bg-primary/[0.08] active:scale-[0.96] transition-all group no-tap-highlight"
            >
              <div className="w-10 h-10 bg-primary/15 text-primary rounded-full flex items-center justify-center mb-2 group-hover:scale-108 transition-transform">
                <Icon.ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-primary">Lihat Semua</span>
              <span className="text-[10px] text-primary/70">Jelajahi Pasar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FEED MADING KAMPUS */}
      <section className="px-4 sm:px-6 md:px-10 lg:px-16 mt-3">
        <div className="flex items-baseline justify-between border-b border-black/[0.06] pb-2 dark:border-white/[0.08]">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Menfess &amp; Info</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cerita dan kabar dari kampus</p>
          </div>
          <Link href="/mading" className="text-xs font-bold text-primary hover:underline active:scale-[0.96] transition-transform">
            Lihat semua
          </Link>
        </div>
        
        {/* Postingan SUNGGUHAN dari database */}
        <div className="mt-3 space-y-3">
          {madingPosts.length === 0 && (
            <Link
              href="/mading"
              className="my-3 block rounded-[20px] border border-dashed border-black/[0.1] bg-white px-5 py-6 text-center text-sm text-gray-500 transition-colors hover:border-primary/50 dark:border-white/[0.1] dark:bg-[#1c1c1e]"
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
                className="group block rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-[0.98] dark:border-white/[0.08] dark:bg-[#1c1c1e]"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base ${isInfo ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                    {isInfo ? "📢" : "👤"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {post.sender_name || "Anonim"}
                      {post.faculty && post.faculty !== "Umum" ? ` (${post.faculty})` : ""}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className={`rounded-full px-2 py-0.2 text-[10px] font-semibold ${isInfo ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                        {isInfo ? "Info Kampus" : "Menfess"}
                      </span>
                      <span>•</span>
                      <span>{waktuLalu(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                {post.title && (
                  <p className="mb-1 mt-3 text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{post.title}</p>
                )}
                <p className={`text-sm leading-relaxed text-gray-700 dark:text-gray-300 ${post.title ? "" : "mt-2.5"} line-clamp-3`}>
                  {post.content}
                </p>
                {post.image_url && (
                  <div className="mt-2.5 rounded-[16px] overflow-hidden max-h-48 border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/30">
                    <img src={post.image_url} alt="Foto mading" className="w-full h-36 object-cover" loading="lazy" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-4 border-t border-black/[0.04] pt-2.5 text-xs text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Icon.Heart className="h-3.5 w-3.5 text-rose-500" /> {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon.MessageCircle className="h-3.5 w-3.5 text-primary" /> {post.comments_count || 0} komentar
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
