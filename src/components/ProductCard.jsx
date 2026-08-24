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
    <div className="group relative overflow-hidden rounded-[24px] bg-white border border-black/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-[0.97] active:shadow-none dark:bg-[#1c1c1e] dark:border-white/[0.08] dark:hover:border-white/[0.16] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] no-tap-highlight">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-black/[0.03] dark:bg-black/40 rounded-t-[24px]">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 animate-shimmer" />
          )}
          
          <div className="absolute left-2 top-2 flex flex-col gap-1 items-start">
            {isRental && !sold && (
              <span className="rounded-full bg-teal-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Sewa
              </span>
            )}
            {!isRental && isSponsored && !sold && (
              <span className="rounded-full bg-indigo-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Sponsor
              </span>
            )}
            {!isRental && !isSponsored && listing.featured && (
              <span className="rounded-full bg-white/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-[#1d1d1f] shadow-sm dark:bg-[#1c1c1e]/95 dark:text-white">
                Unggulan
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isNew && !sold && (
              <span className="rounded-full bg-emerald-500/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                <Icon.Star className="h-2.5 w-2.5" /> Baru
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isConditionNew && !isNew && !sold && (
              <span className="rounded-full bg-sky-500/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Baru
              </span>
            )}
          </div>
          
          {isLowStock && !sold && (
            <span className="absolute bottom-2 left-2 rounded-full bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              Stok Tipis
            </span>
          )}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-black/70 backdrop-blur-sm">
              <span className="rounded-full bg-[#1d1d1f] px-3.5 py-1 text-[11px] font-bold tracking-wide text-white dark:bg-white dark:text-[#1d1d1f] shadow-sm">
                TERJUAL
              </span>
            </span>
          )}
        </div>
        <div className="p-3 xs:p-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.08] px-2 py-0.5 rounded-full truncate max-w-[80px] xs:max-w-none">
              {listing.category}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/[0.08] text-primary dark:bg-violet-500/15 dark:text-violet-300 font-semibold max-w-[100px] xs:max-w-[140px] truncate flex items-center gap-0.5">
              <Icon.MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{listing.campus === "Semua" ? "Medan" : listing.campus}
              {listing.area ? ` (${listing.area})` : ""}</span>
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[13px] xs:text-sm font-semibold leading-snug text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-primary dark:group-hover:text-violet-400 transition-colors min-h-[2rem] xs:min-h-[2.5rem] tracking-tight">
            {listing.title}
          </h3>
          <p className="mt-1.5 text-sm xs:text-[15px] font-black tracking-tight text-[#1d1d1f] dark:text-white">
            {listing.type === "jasa" && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mr-1">Mulai</span>
            )}
            {rupiah(listing.price)}
            {listing.type === "sewa" && listing.rental_period && (
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 ml-1">/{listing.rental_period}</span>
            )}
          </p>
          {isDistributor && distributorFee > 0 && (
            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-semibold mt-0.5">
              Fee: {rupiah(distributorFee)}
            </p>
          )}
          <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 min-w-0 pr-1">
              <span className="truncate">{!tanpaPenjual ? listing.seller_name || "Penjual" : ""}</span>
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
            <div className="shrink-0 flex items-center gap-1.5">
              {isNego && (
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                  Nego
                </span>
              )}
              <span className="flex items-center gap-0.5 opacity-70 text-[10px]">
                <Icon.Eye className="h-2.5 w-2.5" /> {listing.views || 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

