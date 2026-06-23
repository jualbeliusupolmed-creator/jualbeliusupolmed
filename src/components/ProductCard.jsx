import Link from "next/link";
import Image from "next/image";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";
import { buildSlug } from "@/lib/slug";

export default function ProductCard({ listing }) {
  const sold = listing.status === "sold";
  const isNew = listing.created_at &&
    (Date.now() - new Date(listing.created_at).getTime()) < 24 * 60 * 60 * 1000;
  const isLowStock = listing.stock === 1;
  const isSponsored = listing.sponsored_until && new Date(listing.sponsored_until) > new Date();
  const isConditionNew = listing.condition === "new";
  const isNego = listing.is_negotiable ||
    String(listing.description || "").toLowerCase().includes("nego") ||
    String(listing.title || "").toLowerCase().includes("nego");
  return (
    <div className="card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700/60 dark:hover:bg-slate-900/50">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${buildSlug(listing.title, listing.id)}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-950">
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-300 dark:text-slate-800">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l1-5h16l1 5M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9zM9 13h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {isSponsored && !sold && (
            <span className="absolute left-2 top-2 rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              📢 Sponsor
            </span>
          )}
          {!isSponsored && listing.featured && (
            <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-900 shadow-soft dark:bg-slate-900 dark:text-slate-100">
              Unggulan
            </span>
          )}
          {!isSponsored && !listing.featured && isNew && !sold && (
            <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
              <Icon.Star className="h-3 w-3" /> BARU
            </span>
          )}
          {!isSponsored && !listing.featured && isConditionNew && !isNew && !sold && (
            <span className="absolute left-2 top-2 rounded-md bg-sky-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              Baru
            </span>
          )}
          {isLowStock && !sold && (
            <span className="absolute bottom-2 left-2 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              Stok Tipis!
            </span>
          )}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px]">
              <span className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">
                Terjual
              </span>
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
              {listing.category}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-medium max-w-[140px] truncate flex items-center gap-1">
              <Icon.MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.campus === "Semua" ? "Medan" : listing.campus}
              {listing.area ? ` (${listing.area})` : ""}</span>
            </span>
          </div>
          <h3 className="mt-1 line-clamp-1 text-sm font-medium leading-snug text-gray-900 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-white transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1.5 text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">
            {listing.type === "jasa" ? (
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 font-normal">Mulai dari </span>
            ) : ""}
            {rupiah(listing.price)}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
            <p className="truncate flex items-center gap-1">
              <span>{listing.type !== "jasa" && listing.stock != null ? `Stok ${listing.stock} · ` : ""}{listing.seller_name}</span>
              {listing.seller_profiles?.subscription_tier === "pro" &&
                new Date(listing.seller_profiles?.subscription_expires_at) > new Date() && (
                <span className="inline-flex items-center justify-center rounded-full bg-amber-100 p-0.5 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" title="Penjual Pro">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>
              )}
              {listing.seller_profiles?.trusted_seller && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-0.5 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400" title="Penjual Terpercaya">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </p>
            <div className="shrink-0 flex items-center gap-1.5">
              {isNego && (
                <span className="rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Nego
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-400 dark:text-slate-500 font-medium">
                <Icon.Eye className="h-3 w-3" /> {listing.views || 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
