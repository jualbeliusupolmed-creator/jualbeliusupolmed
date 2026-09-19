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

          {/* Satu Badge Prioritas */}
          {!sold && (
            <div className="absolute left-2 top-2 z-10 pointer-events-none">
              {isRental ? (
                <span className="rounded-full bg-teal-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                  Sewa
                </span>
              ) : isSponsored ? (
                <span className="rounded-full bg-indigo-600/90 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                  Sponsor
                </span>
              ) : listing.featured ? (
                <span className="rounded-full bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#1d1d1f] dark:text-white shadow-sm">
                  Unggulan
                </span>
              ) : (isNew || isConditionNew) ? (
                <span className="rounded-full bg-emerald-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm flex items-center gap-0.5">
                  <Icon.Sparkles className="h-2.5 w-2.5" /> Baru
                </span>
              ) : isLowStock ? (
                <span className="rounded-full bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm">
                  Stok Tipis
                </span>
              ) : null}
            </div>
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

        {/* Info Konten: Judul, Harga, Seller & Lokasi */}
        <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5">
          <div>
            {/* Judul Produk */}
            <h3 className="line-clamp-2 text-[13px] sm:text-[14px] font-semibold leading-snug text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-primary dark:group-hover:text-violet-400 transition-colors min-h-[2.1rem] sm:min-h-[2.4rem] tracking-tight">
              {listing.title}
            </h3>

            {/* Harga */}
            <div className="mt-1 text-[15px] sm:text-[16px] font-black tracking-tight text-primary dark:text-violet-400">
              {listing.type === "jasa" && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mr-1">Mulai</span>
              )}
              {rupiah(listing.price)}
              {isRental && listing.rental_period && (
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 ml-1">/{listing.rental_period}</span>
              )}
            </div>
          </div>

          {/* Footer Card: Seller/Trust Indicator & Lokasi */}
          <div className="mt-1 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 gap-1.5">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <span className="truncate max-w-[85px] sm:max-w-[125px] font-medium text-slate-700 dark:text-slate-300">
                {!tanpaPenjual ? listing.seller_name || "Penjual" : ""}
              </span>
              {listing.seller_profiles?.subscription_tier === "pro" && (
                <Icon.Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0" title="Penjual Pro" />
              )}
              {listing.seller_profiles?.trusted_seller && (
                <Icon.Check className="h-2.5 w-2.5 text-blue-500 shrink-0" title="Penjual Terpercaya" />
              )}
            </div>
            <span className="shrink-0 flex items-center gap-0.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 max-w-[90px] sm:max-w-[110px] truncate">
              <Icon.MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
              <span className="truncate">{listing.campus === "Semua" ? "Medan" : listing.campus}</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
