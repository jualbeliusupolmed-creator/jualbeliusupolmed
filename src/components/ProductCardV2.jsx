"use client";

import Image from "next/image";
import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";

export default function ProductCardV2({ listing }) {
  if (!listing) return null;

  const isAvailable = listing.status === "active" && (listing.stock == null || Number(listing.stock) > 0);
  const isSold = listing.status === "sold";
  const condLabel = listing.condition === "new" ? "Baru" : "Bekas";
  const detailUrl = `/produk/${buildSlug(listing.title, listing.id)}`;
  const sellerName =
    listing.seller_name && listing.seller_name.trim().length > 2
      ? listing.seller_name
      : "Penjual Kampus";
  const location = listing.area || listing.campus || "Kampus";
  const isNegotiable = /nego/i.test(listing.description || "");

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
    >
      <Link
        href={detailUrl}
        className="block h-48 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 group-focus:outline-none group-focus:ring-2 group-focus:ring-emerald-600 group-focus:ring-inset"
      >
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
            <Icon.ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" aria-hidden="true" />
            <span className="mt-1 text-[10px] font-medium">Tanpa Foto</span>
          </div>
        )}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
              TERJUAL
            </span>
          </div>
        )}
        {!isAvailable && !isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-white shadow-lg">
              TIDAK TERSEDIA
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="text-[10px] font-bold text-emerald-700">{condLabel}</span>
          {isNegotiable && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Nego
            </span>
          )}
        </div>
      </Link>

      <div className="flex-1 flex flex-col p-3 space-y-2">
        <Link
          href={detailUrl}
          className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
          title={listing.title}
        >
          {listing.title}
        </Link>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">
            {rupiah(listing.price)}
          </span>
          {listing.type === "sewa" && listing.rental_period && (
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-0.5">{`/${listing.rental_period}`}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Icon.MapPin className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate min-w-0">{location}</span>
          <span className="w-px h-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <span className="font-medium text-slate-700 dark:text-slate-300">{sellerName}</span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={detailUrl}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Icon.Eye className="h-3 w-3" />
            Detail
          </Link>
          {isAvailable && (
            <a
              href={`/chat-wa/${listing.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-800 dark:hover:bg-emerald-600 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Icon.WhatsApp className="h-3 w-3" />
              Chat WA
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
