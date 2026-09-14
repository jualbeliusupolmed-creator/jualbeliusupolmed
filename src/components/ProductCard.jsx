import Link from "next/link";
import Image from "next/image";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";
import { buildSlug } from "@/lib/slug";

function waktuLalu(dateStr) {
  if (!dateStr) return "baru saja";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function ProductCard({ listing, tanpaPenjual = false }) {
  const sold = listing.status === "sold";
  const isNew = listing.created_at &&
    (Date.now() - new Date(listing.created_at).getTime()) < 24 * 60 * 60 * 1000;
  const isRental = listing.type === "sewa";
  const isConditionNew = listing.condition === "new";
  const isNego = listing.is_negotiable ||
    String(listing.description || "").toLowerCase().includes("nego") ||
    String(listing.title || "").toLowerCase().includes("nego");
  const isDistributor = !!listing.seller_profiles?.distributor;

  return (
    <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-white/[0.08] last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors relative group bg-white dark:bg-[#1e293b]">
      {/* Absolute top-right Favorite Button (floating above everything) */}
      <div className="absolute right-3 sm:right-4 top-3 sm:top-4 z-10">
        <FavoriteButton listing={listing} />
      </div>

      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="block no-tap-highlight">
        {/* Top Header: Seller & Metadata */}
        <div className="flex items-center gap-2 mb-1 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 overflow-hidden">
            {listing.seller_profiles?.avatar_url ? (
              <img src={listing.seller_profiles.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon.User className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="truncate text-[14px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {!tanpaPenjual ? listing.seller_name || "Penjual" : "Toko Ini"}
              </p>
              {listing.seller_profiles?.subscription_tier === "pro" && (
                <Icon.Sparkles className="h-3 w-3 text-amber-500" />
              )}
              {listing.seller_profiles?.trusted_seller && (
                <Icon.ShieldCheck className="h-3 w-3 text-blue-500" />
              )}
              <span className="text-slate-500 dark:text-slate-400">·</span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {waktuLalu(listing.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-0.5 font-medium">
                <Icon.MapPin className="h-3 w-3" />
                {listing.campus === "Semua" ? "Medan" : listing.campus}
              </span>
              <span>·</span>
              <span className="font-medium bg-black/[0.04] dark:bg-white/[0.08] px-1.5 rounded-sm">
                {listing.category}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-2 text-[#1d1d1f] dark:text-gray-200">
          <h3 className="text-[15px] sm:text-[16px] font-bold leading-snug tracking-tight group-hover:text-primary transition-colors mb-1">
            {listing.title}
          </h3>
          <div className="text-[18px] sm:text-[20px] font-black text-primary dark:text-violet-400">
            {listing.type === "jasa" && <span className="text-[12px] font-semibold text-slate-500 mr-1">Mulai</span>}
            {rupiah(listing.price)}
            {isRental && listing.rental_period && (
              <span className="text-[12px] font-semibold text-slate-500 ml-1">/{listing.rental_period}</span>
            )}
          </div>
        </div>

        {/* Badges / Labels */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sold && (
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
              TERJUAL
            </span>
          )}
          {!sold && isNew && (
            <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold flex items-center gap-0.5">
              <Icon.Sparkles className="h-2.5 w-2.5" /> Baru
            </span>
          )}
          {!sold && isNego && (
            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold">
              Nego
            </span>
          )}
          {!sold && isRental && (
            <span className="rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 text-[10px] font-bold">
              Sewa
            </span>
          )}
          {!sold && isConditionNew && !isNew && (
            <span className="rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 text-[10px] font-bold">
              Kondisi Baru
            </span>
          )}
        </div>

        {/* Attached Image (Feed Style) */}
        <div className="mt-3 relative">
          {listing.image_url ? (
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-80 overflow-hidden rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/30">
              <img
                src={listing.image_url}
                alt={listing.title}
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                loading="lazy"
              />
              {sold && (
                <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm">
                  <span className="rounded-full bg-white px-4 py-1.5 text-sm font-extrabold tracking-wide text-[#1d1d1f] shadow-lg">
                    SUDAH TERJUAL
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative aspect-[16/6] w-full overflow-hidden rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-black/40 flex items-center justify-center">
              <Icon.Package className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-3.5 flex items-center gap-6 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Icon.MessageCircle className="h-4 w-4" />
            <span>Chat Penjual</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Icon.Eye className="h-4 w-4" />
            <span>{listing.views || 0}x dilihat</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
