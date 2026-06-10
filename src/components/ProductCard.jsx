import Link from "next/link";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";

export default function ProductCard({ listing }) {
  const sold = listing.status === "sold";
  const isNew = listing.created_at &&
    (Date.now() - new Date(listing.created_at).getTime()) < 24 * 60 * 60 * 1000;
  const isLowStock = listing.stock === 1;
  const isNego = listing.is_negotiable ||
    String(listing.description || "").toLowerCase().includes("nego") ||
    String(listing.title || "").toLowerCase().includes("nego");
  return (
    <div className="card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-350 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700/60 dark:hover:bg-slate-900/50">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${listing.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-950">
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_url}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-300 dark:text-slate-800">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l1-5h16l1 5M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9zM9 13h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {listing.featured && (
            <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-900 shadow-soft dark:bg-slate-900 dark:text-slate-100">
              Unggulan
            </span>
          )}
          {!listing.featured && isNew && !sold && (
            <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
              <Icon.Star className="h-3 w-3" /> BARU
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
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {listing.category}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-medium max-w-[140px] truncate flex items-center gap-1">
              <Icon.MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.campus === "Semua" ? "USU/POLMED" : listing.campus}
              {listing.area ? ` (${listing.area})` : ""}</span>
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-gray-900 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-white transition-colors">
            {listing.title}
          </h3>
          <p className="mt-1.5 text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">
            {rupiah(listing.price)}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-450 dark:text-slate-400">
            <p className="truncate flex items-center gap-1">
              <span>{listing.stock != null ? `Stok ${listing.stock} · ` : ""}{listing.seller_name}</span>
            </p>
            <div className="shrink-0 flex items-center gap-1.5">
              {isNego && (
                <span className="rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide">
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
