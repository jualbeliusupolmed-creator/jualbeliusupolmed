import Link from "next/link";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";
import { buildSlug } from "@/lib/slug";

/**
 * ProductCard: Kartu produk marketplace yang ringkas, modern, dan nyaman ditelusuri.
 * Dirancang untuk grid responsif (2 kolom di HP, 3-4 kolom di desktop/tablet).
 * 
 * @param {object} listing - Objek data iklan produk
 * @param {boolean} tanpaPenjual - Sembunyikan nama penjual jika di halaman profil toko
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
    <div className="group relative flex flex-col overflow-hidden rounded-[20px] sm:rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 no-tap-highlight">
      {/* Floating favorite button */}
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10 !bg-white/85 dark:!bg-black/60 backdrop-blur-md hover:!bg-white dark:hover:!bg-black shadow-sm" />

      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="flex flex-col flex-1">
        {/* Gambar Produk: Aspect Square */}
        <div className="relative aspect-square w-full overflow-hidden bg-black/[0.02] dark:bg-black/40">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-300 dark:text-slate-600">
              <Icon.Package className="h-10 w-10 opacity-60" />
            </div>
          )}

          {/* Badge / Pill di atas gambar */}
          <div className="absolute left-2 top-2 flex flex-col gap-1 items-start pointer-events-none">
            {isRental && !sold && (
              <span className="rounded-full bg-teal-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                Sewa
              </span>
            )}
            {!isRental && isSponsored && !sold && (
              <span className="rounded-full bg-indigo-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                Sponsor
              </span>
            )}
            {!isRental && !isSponsored && listing.featured && !sold && (
              <span className="rounded-full bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#1d1d1f] dark:text-white shadow-sm">
                Unggulan
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isNew && !sold && (
              <span className="rounded-full bg-emerald-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm flex items-center gap-0.5">
                <Icon.Sparkles className="h-2.5 w-2.5" /> Baru
              </span>
            )}
            {!isRental && !isSponsored && !listing.featured && isConditionNew && !isNew && !sold && (
              <span className="rounded-full bg-sky-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                Baru
              </span>
            )}
          </div>

          {/* Stok Tipis */}
          {isLowStock && !sold && (
            <span className="absolute bottom-2 left-2 rounded-full bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              Stok Tipis
            </span>
          )}

          {/* Overlay Terjual */}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[2px]">
              <span className="rounded-full bg-white dark:bg-[#1c1c1e] px-3.5 py-1 text-[11px] font-black tracking-wider text-[#1d1d1f] dark:text-white shadow-lg">
                TERJUAL
              </span>
            </span>
          )}
        </div>

        {/* Info Konten */}
        <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between">
          <div>
            {/* Kategori & Lokasi */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.08] px-1.5 py-0.5 rounded-md truncate max-w-[85px] sm:max-w-none">
                {listing.category}
              </span>
              {listing.listing_code && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-white text-gray-600 dark:bg-slate-900 dark:text-slate-300 font-semibold hidden xs:flex items-center gap-0.5 border border-black/[0.06] dark:border-white/[0.08]">
                  <Icon.Hash className="h-2.5 w-2.5 shrink-0" />
                  {listing.listing_code}
                </span>
              )}
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-primary/[0.07] text-primary dark:bg-violet-500/15 dark:text-violet-300 font-semibold max-w-[110px] truncate flex items-center gap-0.5">
                <Icon.MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{listing.campus === "Semua" ? "Medan" : listing.campus}</span>
              </span>
            </div>

            {/* Judul Produk */}
            <h3 className="mt-1.5 line-clamp-2 text-[12px] sm:text-[13.5px] font-semibold leading-snug text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-primary dark:group-hover:text-violet-400 transition-colors min-h-[2rem] sm:min-h-[2.3rem] tracking-tight">
              {listing.title}
            </h3>

            {/* Harga */}
            <div className="mt-1 text-[14px] sm:text-[16px] font-black tracking-tight text-primary dark:text-violet-400">
              {listing.type === "jasa" && (
                <span className="text-[10px] sm:text-[11px] font-normal text-gray-500 dark:text-gray-400 mr-1">Mulai</span>
              )}
              {rupiah(listing.price)}
              {isRental && listing.rental_period && (
                <span className="text-[10px] sm:text-[11px] font-semibold text-teal-600 dark:text-teal-400 ml-1">/{listing.rental_period}</span>
              )}
            </div>

            {isDistributor && distributorFee > 0 && (
              <p className="text-[9px] sm:text-[10px] text-orange-500 dark:text-orange-400 font-semibold mt-0.5">
                Fee: {rupiah(distributorFee)}
              </p>
            )}
          </div>

          {/* Footer Card: Seller info & View/Nego */}
          <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 gap-1.5">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <span className="truncate max-w-[80px] sm:max-w-[120px]">{!tanpaPenjual ? listing.seller_name || "Penjual" : ""}</span>
              {listing.seller_profiles?.subscription_tier === "pro" && (
                <Icon.Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0" title="Penjual Pro" />
              )}
              {listing.seller_profiles?.trusted_seller && (
                <Icon.Check className="h-2.5 w-2.5 text-blue-500 shrink-0" title="Penjual Terpercaya" />
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {isNego && (
                <span className="rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1 py-0.2 text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider">
                  Nego
                </span>
              )}
              <span className="flex items-center gap-0.5 opacity-70 text-[9px] sm:text-[10px]">
                <Icon.Eye className="h-2.5 w-2.5" /> {listing.views || 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
