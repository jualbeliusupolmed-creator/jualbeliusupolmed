"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";

export default function ProductDetailV2({ listing }) {
  const [selectedImage, setSelectedImage] = useState(listing?.image_url || "");
  const [qty, setQty] = useState(1);

  if (!listing) return null;

  const isAvailable = listing.status === "active" && (listing.stock == null || Number(listing.stock) > 0);
  const condLabel = listing.condition === "new" ? "Baru" : "Bekas";
  const detailUrl = `/produk/${buildSlug(listing.title, listing.id)}`;
  const waNumber = listing.seller_wa ? formatWa(listing.seller_wa) : "";
  const waMessage = `Halo, saya tertarik dengan *${listing.title}* di Kampus Kita. Apakah barang ini masih tersedia?`;
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}` : "#";

  const images = listing.images && Array.isArray(listing.images)
    ? listing.images
    : listing.image_url
    ? [listing.image_url]
    : [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-6">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          Beranda
        </Link>
        <span>/</span>
        <Link href="/jual-beli" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white">{listing.title}</span>
      </nav>

      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left: Gallery */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={listing.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                <Icon.ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" aria-hidden="true" />
                <span className="mt-2 text-[11px] font-medium">Tidak ada foto</span>
              </div>
            )}
            {isAvailable === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-lg">Tidak Tersedia</span>
              </div>
            )}
            <button
              onClick={() => setSelectedImage(images[0] || listing.image_url || "")}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/90 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
              aria-label="Zoom gambar"
            >
              <Icon.SearchPlus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? "border-emerald-600 shadow-sm" : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/10">
                {listing.category}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Icon.Eye className="h-3.5 w-3.5" />
                <span>{listing.views || 0}x dilihat</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug mb-2">
              {listing.title}
            </h1>

            {listing.listing_code && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/10 mb-3">
                <Icon.Hash className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Kode: #{listing.listing_code}</span>
              </div>
            )}

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">
                {rupiah(listing.price)}
              </span>
              {listing.type === "sewa" && listing.rental_period && (
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-0.5">{`/${listing.rental_period}`}</span>
              )}
              {isAvailable ? (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                  Tersedia
                </span>
              ) : (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30">
                  Tidak Tersedia
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Kondisi
                </span>
                <span className="ml-auto text-sm font-bold text-slate-900 dark:text-white">{condLabel}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Lokasi
                </span>
                <span className="ml-auto text-sm font-medium text-slate-900 dark:text-white truncate">
                  {listing.area || listing.campus || "Kampus"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Penjual
                </span>
                <span className="ml-auto text-sm font-medium text-slate-900 dark:text-white">
                  {listing.seller_name || "Penjual Kampus"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {isAvailable ? (
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-white font-bold text-sm shadow-sm hover:bg-emerald-800 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Icon.MessageCircle className="h-4 w-4" />
                  <span>Chat WA</span>
                </a>
                <button
                  onClick={() => setQty((prev) => prev + 1)}
                  className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <Icon.Plus className="h-4 w-4" />
                  <span>Tambah ke Keranjang</span>
                </button>
              </div>
            ) : (
              <button disabled className="w-full min-h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600 cursor-not-allowed">
                Tidak Tersedia
              </button>
            )}

            {/* Quantity selector */}
            {isAvailable && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2">
                <button
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  disabled={qty <= 1}
                >
                  <Icon.Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-sm font-bold text-slate-900 dark:text-white w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Icon.Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Seller Info */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm shadow-sm">
                {(listing.seller_name?.[0] || "P").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">{listing.seller_name || "Penjual Kampus"}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {listing.campus === "Semua" ? "Semua Kampus" : listing.campus} · Terverifikasi
                </span>
              </div>
              <Link
                href={`/penjual/${listing.seller_wa || listing.id}`}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
              >
                Lihat Toko
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 dark:text-slate-400">Respon</span>
                <span className="font-bold text-slate-900 dark:text-white">Cepat</span>
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-slate-500 dark:text-slate-400">Rating</span>
                <span className="font-bold text-slate-900 dark:text-white">★ 5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      {listing.description && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Deskripsi Produk</h2>
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
            {listing.description}
          </div>
        </section>
      )}
    </div>
  );
}
