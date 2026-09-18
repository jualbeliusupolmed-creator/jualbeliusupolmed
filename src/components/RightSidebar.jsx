"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { CATEGORIES } from "@/lib/constants";
import { useState } from "react";

export default function RightSidebar({ config }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const cari = (event) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/jual-beli?q=${encodeURIComponent(value)}` : "/jual-beli");
  };

  return (
    <div className="hidden lg:block w-[300px] sticky top-0 h-screen bg-transparent px-4 py-6 overflow-y-auto">
      
      <form onSubmit={cari} className="mb-6 relative">
        <Icon.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari barang..." 
          aria-label="Cari barang di marketplace"
          className="w-full bg-black/[0.04] dark:bg-white/[0.06] border-none rounded-full py-3 pl-12 pr-4 text-[15px] focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
        />
      </form>

      <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-[20px] p-4 mb-6 border border-black/[0.04] dark:border-white/[0.05]">
        <h2 className="font-bold text-[18px] mb-4 text-[#1d1d1f] dark:text-[#f5f5f7]">Kategori Populer</h2>
        <div className="space-y-3">
          {CATEGORIES.slice(0, 5).map((cat) => (
            <Link key={cat.slug} href={`/jual-beli?cat=${encodeURIComponent(cat.slug)}`} className="block group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Trending di Kampus</p>
                  <p className="font-bold text-[15px] text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-primary transition-colors">{cat.name}</p>
                </div>
                <Icon.ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
        <Link href="/jual-beli" className="block mt-4 text-[14px] text-primary hover:underline">
          Tampilkan semua
        </Link>
      </div>

      {config?.bannerUrl && (
        <div className="rounded-[20px] overflow-hidden border border-black/[0.06] dark:border-white/[0.08] shadow-sm mb-6">
          <a href={config?.bannerLink || "#"} target="_blank" rel="noopener noreferrer">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={config.bannerUrl} alt="Sponsor" className="w-full h-auto object-cover hover:opacity-90 transition-opacity" />
          </a>
        </div>
      )}

      <div className="text-[12px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/cara-bergabung" className="hover:underline">Cara bergabung</Link>
        <Link href="/kebijakan-privasi" className="hover:underline">Privasi</Link>
        <Link href="/syarat-ketentuan" className="hover:underline">Syarat & Ketentuan</Link>
        <span>© {new Date().getFullYear()} JualBeli USU Polmed</span>
      </div>
    </div>
  );
}
