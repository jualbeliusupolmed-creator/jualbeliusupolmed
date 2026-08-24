"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { Icon } from "./Icons";
import { useRouter } from "next/navigation";

export default function MarketplaceInbox({ onSelectRoom }) {
  const [mounted, setMounted] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myWa, setMyWa] = useState(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    async function fetchInbox() {
      try {
        const res = await fetch("/api/chat/marketplace/inbox");
        if (res.status === 401) {
          setIsLoggedOut(true);
          setRooms([]);
          return;
        }
        const data = await res.json();
        if (data.ok) {
          setRooms(data.rooms || []);
          setMyWa(data.myWa);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInbox();
  }, [router]);

  if (!mounted || loading) {
    return <div className="text-center p-8 text-xs text-gray-500">Memuat kotak masuk...</div>;
  }

  if (isLoggedOut) {
    return (
      <div className="text-center p-6 bg-white dark:bg-[#1c1c1e] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] space-y-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <p className="text-xs text-gray-500 dark:text-gray-400">Masuk ke akunmu untuk melihat pesan jual beli.</p>
        <button
          onClick={() => router.push("/profil")}
          className="inline-flex items-center gap-1 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_2px_8px_rgba(83,43,152,0.25)] active:scale-[0.96] transition-transform"
        >
          Masuk Akun
        </button>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center p-8 space-y-3 bg-white dark:bg-[#1c1c1e] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08]">
        <div className="text-4xl">🛒</div>
        <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Belum Ada Transaksi</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          Kamu belum memiliki obrolan terkait jual beli barang. Mulai cari barang di Jual Beli!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
      {rooms.map((room) => {
        const isDirect = room.type === "direct";
        const isUser1 = room.user1_id === myWa;
        const partnerAlias = isUser1 ? room.user2_alias : room.user1_alias;
        const partnerFaculty = isUser1 ? room.user2_faculty : room.user1_faculty;
        const partnerRole = isDirect ? "Teman Kampus" : isUser1 ? "Penjual" : "Pembeli";
        const listing = room.listings;

        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id, partnerAlias, myWa)}
            className="w-full text-left p-3.5 flex gap-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all"
          >
            {/* Avatar / Thumbnail */}
            {isDirect ? (
              <div className="w-12 h-12 shrink-0 rounded-[16px] bg-gradient-to-br from-primary/15 to-emerald-500/15 border border-primary/20 flex items-center justify-center text-lg text-primary font-black shadow-xs">
                {partnerAlias ? partnerAlias[0].toUpperCase() : "💬"}
              </div>
            ) : (
              <div className="w-12 h-12 shrink-0 rounded-[16px] bg-black/[0.03] dark:bg-black/40 overflow-hidden border border-black/[0.04] dark:border-white/[0.06]">
                {listing?.image_url ? (
                  <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                )}
              </div>
            )}

            {/* Info Obrolan */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                  {partnerAlias}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDirect 
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                    : "bg-black/[0.04] dark:bg-white/[0.08] text-gray-500 dark:text-gray-400"
                }`}>
                  {isDirect ? "💬 DM Pribadi" : partnerRole}
                </span>
              </div>
              {isDirect ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {partnerFaculty && partnerFaculty !== "Umum" ? `Fakultas ${partnerFaculty}` : "Obrolan 1-on-1 Langsung"}
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                    {listing?.title || "Barang tidak diketahui"}
                  </p>
                  {listing?.price && (
                    <p className="text-xs text-primary font-bold mt-0.5">
                      {rupiah(listing.price)}
                    </p>
                  )}
                </>
              )}
            </div>
            
            {/* Arrow */}
            <div className="flex items-center justify-center">
               <Icon.ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
