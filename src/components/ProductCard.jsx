import Link from "next/link";
import { rupiah } from "@/lib/fees";
import FavoriteButton from "@/components/FavoriteButton";

export default function ProductCard({ listing }) {
  const sold = listing.status === "sold";
  return (
    <div className="card group relative overflow-hidden transition hover:shadow-md">
      <FavoriteButton listing={listing} className="absolute right-2 top-2 z-10" />
      <Link href={`/produk/${listing.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {listing.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_url}
              alt={listing.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl">📦</div>
          )}
          {listing.featured && (
            <span className="badge absolute left-2 top-2 bg-amber-100 text-amber-700">
              ⭐ Featured
            </span>
          )}
          {sold && (
            <span className="badge absolute bottom-2 right-2 bg-gray-900/80 text-white">
              Terjual
            </span>
          )}
        </div>
        <div className="p-3">
          <span className="badge bg-primary/10 text-primary">{listing.category}</span>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-gray-900">
            {listing.title}
          </h3>
          <p className="mt-1 font-bold text-primary">{rupiah(listing.price)}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {listing.stock != null ? `Stok ${listing.stock} · ` : ""}
            {listing.seller_name}
          </p>
        </div>
      </Link>
    </div>
  );
}
