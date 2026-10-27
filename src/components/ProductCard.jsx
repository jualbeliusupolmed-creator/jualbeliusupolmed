import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";
import FavoriteButton from "@/components/FavoriteButton";
import { buildSlug } from "@/lib/slug";

/**
 * ProductCard: Kartu produk marketplace yang ultra-efisien, ringkas, padat, dan cepat di-scroll.
 * Mengeliminasi tombol berlebihan dan kotak kosong agar layar mobile bisa menampilkan banyak produk sekaligus.
 *
 * @param {object} listing - Objek data iklan produk
 * @param {boolean} tanpaPenjual - Sembunyikan nama penjual jika di halaman profil toko
 */
export default function ProductCard({ listing, tanpaPenjual = false }) {
  if (!listing) return null;

  const isSold = listing.status === "sold";
  const condLabel = listing.condition === "new" ? "Baru" : "Preloved";
  const detailUrl = `/produk/${buildSlug(listing.title, listing.id)}`;

  const sellerName =
    listing.seller_name && listing.seller_name.trim().length > 2 && !/^User\s+\d+$/i.test(listing.seller_name)
      ? listing.seller_name
      : listing.campus && listing.campus !== "Semua"
      ? `Mhs ${listing.campus}`
      : "Mhs";

  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 transition-all hover:border-emerald-500/40 hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-slate-900 sm:p-2.5">
      <Link href={detailUrl} className="flex h-full flex-col justify-between rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
      <div>
        {/* Gambar Produk: 4:3 Aspect Ratio (Kompak, Ramping & Ringan) */}
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-white/5">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px] text-slate-300">
                inventory_2
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                Foto Penjual
              </span>
            </div>
          )}

          {/* Favorite Button in Top-Right */}
          {/* Status Badge in Bottom-Left */}
          {isSold ? (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white font-extrabold text-[8px] tracking-wider shadow-xs backdrop-blur-xs">
              TERJUAL
            </span>
          ) : listing.type === "sewa" ? (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-teal-800/90 text-white font-bold text-[8px] shadow-xs backdrop-blur-xs">
              Sewa
            </span>
          ) : listing.featured ? (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-emerald-900/90 text-white font-bold text-[8px] flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
              <span className="material-symbols-outlined text-[9px]">verified</span>
              Unggulan
            </span>
          ) : (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-emerald-800/90 text-white font-semibold text-[8px] flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
              <span className="material-symbols-outlined text-[9px]">verified</span>
              COD
            </span>
          )}
        </div>

        {/* Info Konten: Harga, Kondisi, Judul & Lokasi Ringkas */}
        <div className="pt-1.5 px-0.5">
          {/* Baris Harga & Kondisi */}
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <span className="text-sm sm:text-base font-extrabold text-emerald-800 dark:text-emerald-400 truncate tracking-tight">
              {rupiah(listing.price)}
              {listing.type === "sewa" && listing.rental_period && (
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-0.5">
                  /{listing.rental_period}
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
              {condLabel}
            </span>
          </div>

          {/* Judul Produk */}
          <h3
            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug"
            title={listing.title}
          >
            {listing.title}
          </h3>

          {/* Lokasi & Penjual (1 Baris Bersih Tanpa Box Berat) */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-2 gap-1">
            <span className="truncate flex items-center gap-0.5 min-w-0">
              <span className="material-symbols-outlined text-[13px] text-emerald-600 shrink-0">
                location_on
              </span>
              <span className="truncate">{listing.area || (listing.campus === "Semua" ? "Sekitar Kampus" : listing.campus) || "Sekitar Kampus"}</span>
            </span>
            {!tanpaPenjual && (
              <span               className="shrink-0 font-medium text-slate-400 text-[10px] truncate max-w-[90px]">
                {sellerName}
              </span>
            )}
          </div>
        </div>
      </div>
      </Link>
      {formatWa(listing.seller_wa) && !isSold && (
        <a
          href={`https://wa.me/${formatWa(listing.seller_wa)}?text=${encodeURIComponent(`Halo, saya tertarik dengan ${listing.title}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          Tanya lewat WhatsApp
        </a>
      )}
      <FavoriteButton
        listing={listing}
        className="!absolute !right-2 !top-2 !z-10 !flex !h-10 !w-10 !items-center !justify-center !rounded-full !bg-white/95 text-slate-400 shadow-xs transition-transform hover:scale-110 hover:text-rose-500 dark:!bg-black/70"
      />
    </div>
  );
}
