import Link from "next/link";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";

export default function ProductCard({ listing }) {
  const sold = listing.status === "sold";
  return (
    <div className="card group relative overflow-hidden transition-all hover:border-gray-300 hover:shadow-soft">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${listing.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_url}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-300">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l1-5h16l1 5M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9zM9 13h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {listing.featured && (
            <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-900 shadow-soft">
              Unggulan
            </span>
          )}
          {sold && (
            <span className="absolute inset-0 grid place-items-center bg-white/60">
              <span className="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                Terjual
              </span>
            </span>
          )}
        </div>
        <div className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {listing.category}
          </span>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-gray-900">
            {listing.title}
          </h3>
          <p className="mt-1.5 text-[15px] font-bold tracking-tight text-gray-900">
            {rupiah(listing.price)}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {listing.stock != null ? `Stok ${listing.stock} · ` : ""}
            {listing.seller_name}
          </p>
        </div>
      </Link>
    </div>
  );
}
