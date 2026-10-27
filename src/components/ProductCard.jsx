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
  const isLowStock = typeof listing.stock === "number" && listing.stock > 1 && listing.stock <= 3;
  const isSponsored = listing.sponsored_until && new Date(listing.sponsored_until) > new Date();
  const isRental = listing.type === "sewa";
  const isConditionNew = listing.condition === "new";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:shadow-md transition-all duration-200">
      {/* Floating favorite button */}
      <FavoriteButton
        listing={listing}
        className="absolute right-2.5 top-2.5 z-10 !w-7 !h-7 !rounded-full !bg-white/90 dark:!bg-black/60 shadow-xs hover:!bg-white dark:hover:!bg-black flex items-center justify-center"
      />

      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="flex flex-col flex-1">
        {/* Gambar Produk: h-48 */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Icon.Package className="w-10 h-10 text-slate-300 stroke-[1.2]" />
              <span className="text-[10px] font-medium text-slate-400 mt-1">Foto dari Penjual</span>
            </div>
          )}

          {/* Badge Prioritas */}
          {!sold && (
            <div className="absolute left-2.5 top-2.5 z-10 pointer-events-none">
              {isRental ? (
                <span className="bg-teal-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                  Sewa
                </span>
              ) : isSponsored ? (
                <span className="bg-indigo-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                  Sponsor
                </span>
              ) : listing.featured ? (
                <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                  Unggulan
                </span>
              ) : (isNew || isConditionNew) ? (
                <span className="bg-emerald-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center gap-0.5">
                  Baru
                </span>
              ) : isLowStock ? (
                <span className="bg-amber-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs">
                  Sisa {listing.stock}
                </span>
              ) : null}
            </div>
          )}

          {/* Overlay Terjual */}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-black/50 z-20">
              <span className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-extrabold tracking-wider text-slate-900 dark:text-white shadow-md">
                TERJUAL
              </span>
            </span>
          )}
        </div>

        {/* Info Konten: Judul, Harga, Seller & Lokasi */}
        <div className="p-3.5 flex-1 flex flex-col justify-between">
          <div>
            {/* Judul Produk */}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {listing.title}
            </h3>

            {/* Harga */}
            <p className="text-base font-extrabold text-slate-900 dark:text-emerald-400 mt-1">
              {listing.type === "jasa" && (
                <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400 mr-1">Mulai</span>
              )}
              {rupiah(listing.price)}
              {isRental && listing.rental_period && (
                <span className="text-[12px] font-semibold text-teal-600 dark:text-teal-400 ml-1">/{listing.rental_period}</span>
              )}
            </p>
          </div>

          {/* Footer Card: Seller & Lokasi COD */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              {!tanpaPenjual && (
                <span className="w-4 h-4 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {(listing.seller_name || "M").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate font-medium text-slate-700 dark:text-slate-300 text-xs">
                {!tanpaPenjual ? (
                  listing.seller_name && listing.seller_name.trim().length > 2 && !/^User\s+\d+$/i.test(listing.seller_name)
                    ? listing.seller_name
                    : listing.campus && listing.campus !== "Semua"
                    ? `Mhs ${listing.campus}`
                    : "Mahasiswa"
                ) : ""}
              </span>
            </div>
            <span className="flex items-center gap-1 shrink-0 text-slate-400 text-[11px]" title={listing.area ? `COD: ${listing.area}` : undefined}>
              <Icon.MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[90px]">{listing.area || (listing.campus === "Semua" ? "USU" : listing.campus)}</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
