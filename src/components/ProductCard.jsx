import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";
import CartButton from "@/components/CartButton";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";
import { cn, firstCodePoint } from "@/lib/utils";
import { isListingAvailable } from "@/lib/listingAvailability";

/**
 * ProductCard: Kartu produk marketplace yang ultra-efisien, ringkas, padat, dan cepat di-scroll.
 * Mengeliminasi tombol berlebihan dan kotak kosong agar layar mobile bisa menampilkan banyak produk sekaligus.
 *
 * @param {object} listing - Objek data iklan produk
 * @param {boolean} tanpaPenjual - Sembunyikan nama penjual jika di halaman profil toko
 */
export default function ProductCard({ listing, tanpaPenjual = false }) {
  if (!listing) return null;

  const isAvailable = isListingAvailable(listing);
  const unavailableLabel =
    listing.status === "sold" ||
    (listing.stock !== null && listing.stock !== undefined && Number(listing.stock) <= 0)
      ? "STOK HABIS"
      : "TIDAK AKTIF";
  const condLabel = listing.condition === "new" ? "Baru" : "Preloved";
  const detailUrl = `/produk/${buildSlug(listing.title, listing.id)}`;
  const sellerName =
    listing.seller_name && listing.seller_name.trim().length > 2 && !/^User\s+\d+$/i.test(listing.seller_name)
      ? listing.seller_name
      : listing.campus && listing.campus !== "Semua"
      ? `Mhs ${listing.campus}`
      : "Mhs";
  const sellerCampus = listing.seller_profiles?.student_campus ||
    (listing.campus && listing.campus !== "Semua" ? listing.campus : "");
  const sellerMeta = listing.seller_profiles?.student_faculty ||
    listing.seller_profiles?.faculty ||
    sellerCampus;
  const sellerInitial = firstCodePoint(sellerName).toUpperCase() || "M";
  const isStudentVerified = listing.seller_profiles?.student_verified || listing.student_verified;
  const isNegotiable = /nego/i.test(listing.description || "");
  const sellerWa = formatWa(listing.seller_wa);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all hover:border-emerald-500/40 hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-slate-900">
      <Link href={detailUrl} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {listing.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.image_url}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[20px] text-slate-300 sm:text-[24px]">
                inventory_2
              </span>
              <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                Foto Penjual
              </span>
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            <span className="rounded-full bg-slate-900/75 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm backdrop-blur-sm">
              {condLabel}
            </span>
            {isStudentVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-800/95 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                <Icon.Check className="h-2.5 w-2.5" />
                KTM Valid
              </span>
            )}
            {!isAvailable && (
              <span className="rounded-full bg-slate-900/85 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                {unavailableLabel}
              </span>
            )}
            {listing.type === "sewa" && (
              <span className="rounded-full bg-teal-800/95 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                Sewa
              </span>
            )}
            {listing.featured && isAvailable && (
              <span className="rounded-full bg-emerald-900/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                Unggulan
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1 px-2 py-2 sm:space-y-1.5 sm:px-3.5 sm:py-3">
          {!tanpaPenjual && (
            <div className="flex min-w-0 items-center gap-1 text-[9px] leading-none sm:text-[10px]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[8px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 sm:h-[18px] sm:w-[18px] sm:text-[9px]">
                {sellerInitial}
              </span>
              <span className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100">
                {sellerName}
              </span>
              {sellerMeta && (
                <>
                  <span className="shrink-0 text-slate-300">•</span>
                  <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
                    {sellerMeta}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            <h3
              className="line-clamp-1 text-xs font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400 sm:text-sm"
              title={listing.title}
            >
              {listing.title}
            </h3>
            {listing.description && (
              <p className="line-clamp-1 text-[9px] leading-3 text-slate-500 dark:text-slate-400 sm:text-[10px]">
                {listing.description}
              </p>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-1.5">
            <div className="min-w-0">
              <span className="block truncate text-[13px] font-extrabold leading-tight text-emerald-800 dark:text-emerald-400 sm:text-base">
                {rupiah(listing.price)}
              </span>
              {listing.type === "sewa" && listing.rental_period && (
                <span className="block text-[9px] leading-tight text-slate-400">
                  per {listing.rental_period}
                </span>
              )}
            </div>
            {isNegotiable && (
              <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-1 text-[9px] font-bold leading-none text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Bisa Nego
              </span>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-1.5 py-1 text-[9px] font-medium leading-tight text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:text-[10px]">
            <Icon.MapPin className="h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-400 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{listing.area || (listing.campus === "Semua" ? "Sekitar Kampus" : listing.campus) || "Sekitar Kampus"}</span>
          </div>
        </div>
      </Link>
      <div className="mt-auto grid grid-cols-2 gap-1.5 px-2 pb-2 sm:gap-2 sm:px-3.5 sm:pb-3.5">
        <Link
          href={detailUrl}
          className={cn(
            "inline-flex min-h-7 items-center justify-center gap-1 rounded-lg bg-slate-100 px-1.5 text-[9px] font-bold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:min-h-9 sm:px-2 sm:text-[11px]",
            !sellerWa || !isAvailable ? "col-span-2" : ""
          )}
        >
          <Icon.Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Detail
        </Link>
        {sellerWa && isAvailable && (
          <a
            href={`https://wa.me/${sellerWa}?text=${encodeURIComponent(`Halo, saya tertarik dengan ${listing.title}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-7 items-center justify-center gap-1 rounded-lg bg-emerald-800 px-1.5 text-[9px] font-bold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:min-h-9 sm:px-2 sm:text-[11px]"
          >
            <Icon.WhatsApp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Chat WA
          </a>
        )}
      </div>
      <CartButton
        listing={listing}
        className="!absolute !right-2 !top-2 !z-10 !flex !h-8 !w-8 !items-center !justify-center !shadow-sm text-slate-700 backdrop-blur-sm transition-all active:scale-95 [&_svg]:!h-4 [&_svg]:!w-4"
      />
    </article>
  );
}
