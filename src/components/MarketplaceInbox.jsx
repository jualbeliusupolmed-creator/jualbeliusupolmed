"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { Icon } from "./Icons";
import { useRouter } from "next/navigation";

export default function MarketplaceInbox({ onSelectRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myWa, setMyWa] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchInbox() {
      try {
        const res = await fetch("/api/chat/marketplace/inbox");
        if (res.status === 401) {
          router.push("/dashboard/login");
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

  if (loading) {
    return <div className="text-center p-8 text-gray-500">Memuat kotak masuk...</div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center p-8 space-y-3">
        <div className="text-4xl">🛒</div>
        <h3 className="font-bold text-gray-900 dark:text-white">Belum Ada Transaksi</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Kamu belum memiliki obrolan terkait jual beli barang. Mulai cari barang di Jual Beli!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rooms.map((room) => {
        const isBuyer = room.user1_id === myWa;
        const partnerAlias = isBuyer ? room.user2_alias : room.user1_alias;
        const partnerRole = isBuyer ? "Penjual" : "Pembeli";
        const listing = room.listings;

        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id, partnerAlias, myWa)}
            className="w-full text-left bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-2xl flex gap-4 hover:border-primary/50 transition-colors shadow-sm"
          >
            {/* Thumbnail Barang */}
            <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-100 dark:bg-slate-800 overflow-hidden">
              {listing?.image_url ? (
                <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>

            {/* Info Obrolan */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {partnerAlias}
                </span>
                <span className="text-[10px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {partnerRole}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                {listing?.title || "Barang tidak diketahui"}
              </p>
              {listing?.price && (
                <p className="text-xs text-primary font-medium mt-0.5">
                  {rupiah(listing.price)}
                </p>
              )}
            </div>
            
            {/* Status (Optional) */}
            <div className="flex items-center justify-center">
               <Icon.ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
