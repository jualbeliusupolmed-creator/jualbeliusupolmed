"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import OfferButton from "@/components/OfferButton";
import CartButton from "@/components/CartButton";
import ShareModal from "@/components/ShareModal";
import CopyLinkButton from "@/components/CopyLinkButton";
import QRButton from "@/components/QRButton";
import OwnerFastActions from "@/components/OwnerFastActions";
import ReportButton from "@/components/ReportButton";

export default function ProductDetailInteractive({
  listing,
  listingSpecs = [],
  sellerUsername,
  available,
  gallery,
}) {
  const [activeTab, setActiveTab] = useState("specs"); // 'specs' | 'usage' | 'diagnostic'
  const codMessage = "Lokasi publik yang disepakati";

  const conditionLabel =
    listing.condition === "new"
      ? "Baru"
      : listing.condition === "like_new"
      ? "Seperti baru"
      : listing.condition === "used"
      ? "Bekas"
      : "Kondisi belum dicantumkan";

  // Seller display attributes
  const isStudentVerified = !!(
    listing.seller_profiles?.student_verified || listing.student_verified
  );
  const sellerCampus =
    listing.seller_profiles?.student_campus ||
    (listing.campus === "Semua"
      ? "Semua Kampus"
      : listing.campus || "Kampus belum dicantumkan");
  const sellerFaculty =
    listing.seller_profiles?.student_faculty ||
    listing.seller_profiles?.faculty ||
    "";
  const sellerNIM = listing.seller_profiles?.student_nim
    ? `NIM ${listing.seller_profiles.student_nim.slice(0, 4)}****`
    : "";

  // Hanya tampilkan data kepercayaan yang benar-benar ada. Angka karangan
  // (mis. 4.9/5 dari 42 COD) akan dianggap klaim menyesatkan oleh pembeli.
  const sellerRating = listing.seller_profiles?.avg_rating
    ? Number(listing.seller_profiles.avg_rating).toFixed(1)
    : null;
  const sellerDeals = Number(listing.seller_profiles?.total_deals) > 0
    ? Number(listing.seller_profiles.total_deals)
    : null;
  const sellerResponse = listing.seller_profiles?.response_time || null;
  const viewCount = Number(listing.views);
  const hasViewCount =
    listing.views !== null &&
    listing.views !== undefined &&
    listing.views !== "" &&
    Number.isFinite(viewCount) &&
    viewCount >= 0;

  // Rute aman WhatsApp via server tanpa membocorkan nomor penjual ke HTML
  const waUrl = `/chat-wa/${listing.id}?cod=${encodeURIComponent(codMessage)}`;

  return (
    <>
      {/* ── LEFT COLUMN: Gallery + Diagnostic & Spec Tabs + Safety Guidelines ── */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {gallery && (
          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900">
            {gallery}
          </div>
        )}

        <section
          aria-labelledby="product-description-title"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-900 sm:p-6"
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2
              id="product-description-title"
              className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white"
            >
              Tentang barang
            </h2>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {conditionLabel}
            </span>
          </div>
          {listing.description?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
              {listing.description.trim()}
            </p>
          ) : (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Penjual belum menambahkan deskripsi untuk barang ini.
            </p>
          )}
        </section>

        {/* TAB NAVIGATION (SCREEN_15 & 12.html standard) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              aria-pressed={activeTab === "specs"}
              className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors active:translate-y-px shrink-0 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 whitespace-nowrap ${
                activeTab === "specs"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.Cpu className="w-4 h-4" aria-hidden="true" />
              <span>Data Teknis &amp; Spesifikasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("usage")}
              aria-pressed={activeTab === "usage"}
              className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors active:translate-y-px shrink-0 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 whitespace-nowrap ${
                activeTab === "usage"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.FileText className="w-4 h-4" aria-hidden="true" />
              <span>Catatan Pemakaian</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("diagnostic")}
              aria-pressed={activeTab === "diagnostic"}
              className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors active:translate-y-px shrink-0 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 whitespace-nowrap ${
                activeTab === "diagnostic"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.CheckCircle className="w-4 h-4" aria-hidden="true" />
              <span>Panduan Cek Fisik COD</span>
            </button>
          </div>

          {/* TAB 1: DATA TEKNIS & SPESIFIKASI */}
          {activeTab === "specs" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rincian Spesifikasi &amp; Fisik
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Kondisi Unit
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {conditionLabel}
                  </span>
                  <span className="text-xs text-slate-500">
                    Periksa foto dan kondisi barang sebelum bertransaksi.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Kampus &amp; Wilayah
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {listing.campus === "Semua" ? "Semua Kampus" : listing.campus} {listing.area ? `· ${listing.area}` : ""}
                  </span>
                  <span className="text-xs text-slate-500">
                    Siap temu langsung tatap muka COD.
                  </span>
                </div>

                {listingSpecs.map((spec) => (
                  <div
                    key={spec.key}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-1"
                  >
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {spec.label}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 2: CATATAN PEMAKAIAN & ALASAN DIJUAL */}
          {activeTab === "usage" && (
            <div className="space-y-4 motion-safe:animate-fade-in motion-reduce:animate-none">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Catatan Pemakaian &amp; Riwayat Barang
              </h3>
              
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Icon.Info className="w-4 h-4" aria-hidden="true" />
                  Alasan Dijual &amp; Riwayat
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {listing.description?.trim() ||
                    "Penjual belum menambahkan catatan pemakaian atau alasan dijual."}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Yang perlu dikonfirmasi sebelum COD:
                </span>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <li>Kondisi barang sesuai foto dan deskripsi</li>
                  <li>Kelengkapan yang termasuk dalam penjualan</li>
                  <li>Tanyakan apakah barang dapat diperiksa sebelum membayar</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN CEK FISIK MANDIRI SAAT COD */}
          {activeTab === "diagnostic" && (
            <div className="space-y-4 motion-safe:animate-fade-in motion-reduce:animate-none">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Panduan Periksa Mandiri saat COD
                </h3>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Panduan Pembeli
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: "Kondisi", status: "Bandingkan dengan foto dan deskripsi" },
                  { label: "Kelengkapan", status: "Pastikan item yang disepakati tersedia" },
                  { label: "Fungsi", status: "Coba fitur utama yang relevan" },
                  { label: "Harga", status: "Konfirmasi harga sebelum bertemu" },
                  { label: "Lokasi", status: "Pilih tempat publik yang disepakati" },
                  { label: "Pembayaran", status: "Selesaikan setelah barang diperiksa" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs font-medium"
                  >
                    <Icon.CheckCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="text-slate-900 dark:text-white font-bold block text-[11px]">
                        {item.label}
                      </span>
                      <span className="text-slate-500 text-[10px]">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Sesuaikan pemeriksaan dengan jenis barang dan kesepakatan bersama.
              </p>
            </div>
          )}
        </div>

        {/* PANDUAN AMAN TRANSAKSI MAHASISWA (COD) (12.html blueprint) */}
        <div className="rounded-2xl p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row gap-5 items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon.ShieldCheck className="w-7 h-7 text-emerald-100" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5 text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Panduan Aman Transaksi Mahasiswa (COD)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pilih lokasi publik yang disepakati bersama. Periksa kondisi barang sebelum menyelesaikan pembayaran.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.Users className="w-3.5 h-3.5" aria-hidden="true" />
                Pilih Tempat Ramai
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.Check className="w-3.5 h-3.5" aria-hidden="true" />
                Cek Fisik &amp; Fungsi
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                Bayar saat Cocok
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (STICKY): Price, Interactive COD Picker, Seller & CTA ── */}
      <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-5 lg:gap-3 lg:p-5">
          {/* Header & Badges */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                {listing.category}
              </span>
              {hasViewCount && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Icon.Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{new Intl.NumberFormat("id-ID").format(viewCount)} kali dilihat</span>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
              {listing.title}
            </h1>

            {listing.listing_code && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <Icon.Hash className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Kode: #{listing.listing_code}</span>
              </div>
            )}

            <div className="flex items-baseline gap-3 pt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {rupiah(listing.price)}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                Nego saat COD
              </span>
            </div>
          </div>

          {/* Meeting guidance */}
          <div className="rounded-xl p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon.ShoppingBag className="w-4 h-4 text-emerald-100" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                Janjian di kampus
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Sepakati lokasi dan waktu bertemu langsung dengan penjual.
              </span>
            </div>
          </div>

          {/* Meeting guidance */}
          <div className="flex flex-col gap-2.5 lg:gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon.MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                Titik temu
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              Sepakati lokasi publik yang ramai dan mudah dijangkau saat menghubungi penjual.
            </div>
          </div>

          {/* VERIFIED SELLER PROFILE CARD */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-3 lg:gap-2 lg:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {(listing.seller_name?.[0] || "P").toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {listing.seller_name || "Penjual"}
                    </span>
                    {isStudentVerified && (
                      <Icon.CheckCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" title="KTM Terverifikasi" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {sellerCampus} {sellerFaculty ? `, ${sellerFaculty}` : ""} {sellerNIM ? `, ${sellerNIM}` : ""}
                  </span>
                </div>
              </div>

              {sellerUsername ? (
                <Link
                  href={`/penjual/${sellerUsername}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-emerald-700 shadow-2xs transition-colors hover:bg-emerald-700 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-white/10 dark:bg-slate-900"
                >
                  Lihat Profil
                </Link>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Profil belum tersedia
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 lg:gap-1.5 lg:p-1.5">
                <Icon.Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {sellerRating ? `${sellerRating} / 5.0` : "Belum ada rating"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {sellerDeals ? `${sellerDeals} COD Sukses` : "Data transaksi tidak tersedia"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 lg:gap-1.5 lg:p-1.5">
                <Icon.Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {sellerResponse || "Belum diatur"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Waktu respons
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!available && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Barang ini sudah tidak tersedia atau stoknya habis.
            </p>
          )}

          {/* DESKTOP ACTIONS */}
          {available && (
            <div className="hidden md:flex flex-col gap-2.5 pt-1 lg:gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-800 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon.MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Janjian COD via WhatsApp</span>
              </a>

              <OfferButton
                listing={listing}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Tawar Harga Mahasiswa</span>
              </OfferButton>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <CartButton listing={listing} className="col-span-1 !w-full justify-center" />
                <CopyLinkButton listing={listing} className="col-span-1 !w-full justify-center" />
                <QRButton listing={listing} className="col-span-1 !w-full justify-center" />
                <div className="col-span-1">
                  <ShareModal listing={listing} />
                </div>
              </div>
            </div>
          )}

          {/* Owner fast action panel */}
          <OwnerFastActions listing={listing} />

          {/* Reporting & Security link */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            <Link href="/panduan-aman" className="hover:text-emerald-700 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600">
              Panduan COD Aman
            </Link>
            <span>|</span>
            <ReportButton listing={listing} />
          </div>
        </div>
      </div>

      {/* Mobile purchase actions stay reachable while scrolling. */}
      {available && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-3 motion-safe:animate-fade-in motion-reduce:animate-none">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center leading-tight truncate">
              <Icon.MapPin className="inline w-3 h-3 text-emerald-700 dark:text-emerald-400 mr-1 shrink-0" aria-hidden="true" />
              <span className="truncate">Sepakati titik temu</span>
            </span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight leading-tight block truncate">
              {rupiah(listing.price)}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <OfferButton
              listing={listing}
              className="!w-auto !min-h-11 !px-3 !py-2 !text-xs !rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold bg-slate-50 dark:bg-slate-900 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              Nego
            </OfferButton>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="!w-auto min-h-11 px-4 py-2 text-xs rounded-xl shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <Icon.MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Janjian COD</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
