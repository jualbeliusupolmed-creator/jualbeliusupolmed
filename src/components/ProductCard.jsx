import Link from "next/link";
import Image from "next/image";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";
import { buildSlug } from "@/lib/slug";

/**
 * @param tanpaPenjual  Sembunyikan nama penjual di kaki kartu. Dipakai di
 *   halaman toko: di sana SEMUA kartu milik penjual yang sama, dan mengulang
 *   namanya dua belas kali cuma memakan ruang yang seharusnya jadi judul barang.
 */
export default function ProductCard({ listing, tanpaPenjual = false }) {
  const sold = listing.status === "sold";
  const isNew = listing.created_at &&
    (Date.now() - new Date(listing.created_at).getTime()) < 24 * 60 * 60 * 1000;
  const isLowStock = listing.stock === 1;
  const isSponsored = listing.sponsored_until && new Date(listing.sponsored_until) > new Date();
  const isRental = listing.type === "sewa";
  const isConditionNew = listing.condition === "new";
  const isNego = listing.is_negotiable ||
    String(listing.description || "").toLowerCase().includes("nego") ||
    String(listing.title || "").toLowerCase().includes("nego");
  const isDistributor = !!listing.seller_profiles?.distributor;
  const distributorFee = listing.distributor_fee || 0;
  return (
    <div className="card group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] hover:border-primary/30 hover:shadow-glow dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-primary/40 dark:hover:bg-slate-900/60 no-tap-highlight">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-950">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] animate-shimmer" />
          )}
          
          <div className="absolute left-1.5 xs:left-2 top-1.5 xs:top-2 flex flex-col gap-1 items-start">
            {isRental && !sold && (
              <span className="rounded-md bg-teal-600/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[10px] xs:text-[11px] font-bold text-white shadow-soft">
                🔑 SEWA
              </span>
            )}
            {!isRental && isSponsored && !sold && (
              <span className="rounded-md bg-indigo-600/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[10px] xs:text-[11px] font-bold text-white shadow-soft">
                📢 Sponsor
              </span>
            )}
            {!isRental && !isSponsored && listing.featured && (
              <span className="rounded-md bg-white/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[10px] xs:text-[11px] font-semibold text-gray-900 shadow-soft dark:bg-slate-900/95 dark:text-slate-100">
                Unggulan
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isNew && !sold && (
              <span className="rounded-md bg-emerald-500/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[10px] xs:text-[11px] font-bold text-white shadow-soft flex items-center gap-1">
                <Icon.Star className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> BARU
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isConditionNew && !isNew && !sold && (
              <span className="rounded-md bg-sky-500/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[10px] xs:text-[11px] font-bold text-white shadow-soft">
                Baru
              </span>
            )}
          </div>
          
          {isLowStock && !sold && (
            <span className="absolute bottom-1.5 xs:bottom-2 left-1.5 xs:left-2 rounded-md bg-amber-500/95 backdrop-blur-sm px-1.5 xs:px-2 py-0.5 text-[9px] xs:text-[10px] font-bold text-white shadow-soft">
              Stok Tipis
            </span>
          )}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px]">
              <span className="rounded-full bg-gray-900 px-3 xs:px-4 py-1 xs:py-1.5 text-[10px] xs:text-xs font-bold tracking-wide text-white dark:bg-white dark:text-gray-900 shadow-soft">
                TERJUAL
              </span>
            </span>
          )}
        </div>
        <div className="p-2.5 xs:p-3.5">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] xs:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500 bg-gray-100/60 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-sm truncate max-w-[80px] xs:max-w-none">
              {listing.category}
            </span>
            <span className="text-[9px] xs:text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/5 text-primary dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold max-w-[100px] xs:max-w-[140px] truncate flex items-center gap-0.5">
              <Icon.MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{listing.campus === "Semua" ? "Medan" : listing.campus}
              {listing.area ? ` (${listing.area})` : ""}</span>
            </span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-xs xs:text-sm font-semibold leading-snug text-gray-900 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors min-h-[2rem] xs:min-h-[2.5rem]">
            {listing.title}
          </h3>
          <p className="mt-1 text-sm xs:text-base font-extrabold tracking-tight text-gray-900 dark:text-white">
            {listing.type === "jasa" && (
              <span className="text-[10px] xs:text-xs font-medium text-gray-500 dark:text-slate-400 mr-1">Mulai</span>
            )}
            {rupiah(listing.price)}
            {listing.type === "sewa" && listing.rental_period && (
              <span className="text-[10px] xs:text-xs font-semibold text-teal-600 dark:text-teal-400 ml-1">/{listing.rental_period}</span>
            )}
          </p>
          {isDistributor && distributorFee > 0 && (
            <p className="text-[9px] xs:text-[10px] text-orange-500 dark:text-orange-400 font-semibold mt-0.5">
              Fee: {rupiah(distributorFee)}
            </p>
          )}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] xs:text-[11px] text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-1 min-w-0 pr-1">
              <span className="truncate opacity-80">{!tanpaPenjual ? listing.seller_name || "Penjual" : ""}</span>
              {listing.seller_profiles?.subscription_tier === "pro" &&
                new Date(listing.seller_profiles?.subscription_expires_at) > new Date() && (
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-100 p-0.5 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" title="Penjual Pro">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>
              )}
              {listing.seller_profiles?.trusted_seller && (
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 p-0.5 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400" title="Penjual Terpercaya">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {isNego && (
                <span className="rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.2 text-[8px] xs:text-[9px] font-bold uppercase tracking-wider">
                  Nego
                </span>
              )}
              <span className="flex items-center gap-0.5 opacity-80 text-[9px] xs:text-[10px]">
                <Icon.Eye className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> {listing.views || 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
