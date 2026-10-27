import Link from "next/link";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { buildSlug } from "@/lib/slug";

/**
 * ProductCard: Kartu produk marketplace yang ringkas, modern, padat, dan efisien.
 * Mengadopsi arsitektur 2 kolom di HP tanpa ruang kosong yang terbuang,
 * rasio gambar 4:3 mantap, label kondisi, micro-pill penjual, dan tombol aksi terintegrasi.
 *
 * @param {object} listing - Objek data iklan produk
 * @param {boolean} tanpaPenjual - Sembunyikan nama penjual jika di halaman profil toko
 */
export default function ProductCard({ listing, tanpaPenjual = false }) {
  if (!listing) return null;

  const isSold = listing.status === "sold";
  const sellerInitial = (listing.seller_name || "M").charAt(0).toUpperCase();
  const condLabel = listing.condition === "new" ? "Baru" : "Preloved";
  const cleanWa = (listing.seller_phone || listing.wa || "62895429126232").replace(/\D/g, "");
  const waLink = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
    `Halo ${listing.seller_name || "kak"}, saya tertarik dengan iklan "${listing.title}" di Kampus Kita...`
  )}`;
  const detailUrl = `/produk/${buildSlug(listing.title, listing.id)}`;

  const sellerName =
    listing.seller_name && listing.seller_name.trim().length > 2 && !/^User\s+\d+$/i.test(listing.seller_name)
      ? listing.seller_name
      : listing.campus && listing.campus !== "Semua"
      ? `Mhs ${listing.campus}`
      : "Mahasiswa";

  return (
    <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 hover:shadow-md transition-all flex flex-col justify-between group h-full">
      <div>
        {/* Gambar Produk: 4:3 Aspect Ratio (Kompak & Elegan) */}
        <div className="relative w-full aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-1.5 sm:mb-2 border border-slate-100 dark:border-white/5">
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
              <span className="material-symbols-outlined text-[24px] sm:text-[32px] text-slate-300 stroke-[1.2]">
                inventory_2
              </span>
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 mt-0.5">
                Foto Penjual
              </span>
            </div>
          )}

          {/* Favorite Button in Top-Right */}
          <FavoriteButton
            listing={listing}
            className="!absolute !top-1.5 !right-1.5 !w-6 !h-6 sm:!w-7 sm:!h-7 !rounded-full !bg-white/90 dark:!bg-black/70 shadow-xs hover:scale-110 flex items-center justify-center text-slate-400 hover:text-rose-500 z-10 transition-transform"
          />

          {/* Status Badge in Bottom-Left */}
          {isSold ? (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white font-extrabold text-[8px] sm:text-[9px] tracking-wider shadow-xs backdrop-blur-xs">
              TERJUAL
            </span>
          ) : listing.type === "sewa" ? (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-teal-800/90 text-white font-bold text-[8px] sm:text-[9px] flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
              Sewa
            </span>
          ) : listing.featured ? (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-emerald-900/90 text-white font-bold text-[8px] sm:text-[9px] flex items-center gap-0.5 sm:gap-1 shadow-xs backdrop-blur-xs">
              <span className="material-symbols-outlined text-[10px] sm:text-[11px]">verified</span>
              Terverifikasi
            </span>
          ) : (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-emerald-800/90 text-white font-semibold text-[8px] sm:text-[9px] flex items-center gap-0.5 sm:gap-1 shadow-xs backdrop-blur-xs">
              <span className="material-symbols-outlined text-[10px] sm:text-[11px]">verified</span>
              COD
            </span>
          )}
        </div>

        {/* Price & Condition Badge */}
        <div className="flex items-baseline justify-between mb-0.5 gap-1">
          <span className="text-xs sm:text-base font-extrabold text-emerald-800 dark:text-emerald-400 truncate tracking-tight">
            {rupiah(listing.price)}
            {listing.type === "sewa" && listing.rental_period && (
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-0.5">
                /{listing.rental_period}
              </span>
            )}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
            {condLabel}
          </span>
        </div>

        {/* Product Title */}
        <Link href={detailUrl}>
          <h3
            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight"
            title={listing.title}
          >
            {listing.title}
          </h3>
        </Link>

        {/* Seller Micro-Pill (Kompak & Elegan) */}
        {!tanpaPenjual && (
          <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5 py-1 px-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 flex items-center justify-center text-[8px] sm:text-[9px] font-extrabold shrink-0">
              {sellerInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {sellerName}
              </p>
              <p className="text-[8px] sm:text-[9px] text-slate-400 truncate leading-tight">
                {listing.area || "USU"} • {listing.campus === "polmed" ? "POLMED" : "USU"}
              </p>
            </div>
          </div>
        )}

        {/* COD Location */}
        <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
          <span className="material-symbols-outlined text-[12px] sm:text-[13px] text-emerald-600 dark:text-emerald-400 shrink-0">
            location_on
          </span>
          <span className="truncate">
            {listing.area || (listing.campus === "Semua" ? "USU" : listing.campus) || "Titik COD Kampus"}
          </span>
        </div>
      </div>

      {/* Card Action Buttons (Detail & Tanya WA Mantap) */}
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-white/10">
        <Link
          href={detailUrl}
          className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs font-bold text-center transition-colors"
        >
          Detail
        </Link>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[12px] sm:text-[13px]">chat</span>
          <span>Tanya</span>
        </a>
      </div>
    </div>
  );
}
