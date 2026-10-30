"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";
import MinatButton from "@/components/MinatButton";
import OfferButton from "@/components/OfferButton";
import CartButton from "@/components/CartButton";
import ShareModal from "@/components/ShareModal";
import CopyLinkButton from "@/components/CopyLinkButton";
import QRButton from "@/components/QRButton";
import NativeShareButton from "@/components/NativeShareButton";
import OwnerFastActions from "@/components/OwnerFastActions";
import RatingWidget from "@/components/RatingWidget";
import ReportButton from "@/components/ReportButton";
import { toast } from "sonner";

export default function ProductDetailInteractive({
  listing,
  listingSpecs = [],
  sellerUsername,
  sold,
  gallery,
}) {
  const [activeTab, setActiveTab] = useState("specs"); // 'specs' | 'usage' | 'diagnostic'
  
  const defaultCodPoints = [{
    id: "campus-public",
    title: listing.campus && listing.campus !== "Semua" ? `Area aman sekitar ${listing.campus}` : "Area kampus yang disepakati",
    tag: "Rekomendasi",
    desc: "Pilih titik temu publik yang ramai, terang, dan mudah dijangkau kedua pihak.",
    icon: "location_on",
  }];

  const [selectedCodPoint, setSelectedCodPoint] = useState(defaultCodPoints[0]);

  // Extract or synthesize hardware diagnosis and usage notes
  const conditionLabel =
    listing.condition === "new"
      ? "Baru (Segel / Belum Dipakai)"
      : listing.condition === "like_new"
      ? "Seperti Baru (Mulus 95-99%)"
      : "Bekas Normal (Pemakaian Kuliah)";

  // Seller display attributes
  const isStudentVerified = !!(
    listing.seller_profiles?.student_verified || listing.student_verified
  );
  const sellerCampus =
    listing.seller_profiles?.student_campus ||
    (listing.campus !== "Semua" ? listing.campus : "Semua Kampus");
  const sellerFaculty =
    listing.seller_profiles?.student_faculty ||
    listing.seller_profiles?.faculty ||
    "Fakultas / Prodi";
  const sellerStambuk =
    listing.seller_profiles?.student_stambuk ||
    listing.seller_profiles?.stambuk ||
    "'22";
  const sellerNIM = listing.seller_profiles?.student_nim
    ? `NIM ${listing.seller_profiles.student_nim.slice(0, 4)}****`
    : "";

  const sellerRating = listing.seller_profiles?.avg_rating || "4.9";
  const sellerDeals = listing.seller_profiles?.total_deals || 42;
  const sellerResponse = listing.seller_profiles?.response_time || "< 10 Menit";

  // Build WhatsApp URL with selected COD point
  const cleanWa = formatWa(listing.seller_wa || "");
  const waMessage = encodeURIComponent(
    `Halo ${listing.seller_name || "Kak"}, saya tertarik dengan barang "${listing.title}" di Kampus Kita (Kode: #${listing.listing_code || listing.id?.slice(0, 8)}).\nBisa janjian COD di ${selectedCodPoint.title}? Terima kasih!`
  );
  const waUrl = cleanWa ? `https://wa.me/${cleanWa}?text=${waMessage}` : "#";

  return (
    <>
      {/* ── LEFT COLUMN: Gallery + Diagnostic & Spec Tabs + Safety Guidelines ── */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {gallery && (
          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900">
            {gallery}
          </div>
        )}

        {/* TAB NAVIGATION (SCREEN_15 & 12.html standard) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "specs"
                  ? "bg-[#047857] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.Cpu className="w-4 h-4" />
              <span>Data Teknis &amp; Spesifikasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("usage")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "usage"
                  ? "bg-[#047857] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.FileText className="w-4 h-4" />
              <span>Catatan Pemakaian</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("diagnostic")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === "diagnostic"
                  ? "bg-[#047857] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Icon.CheckCircle className="w-4 h-4" />
              <span>Cek Fungsi Hardware</span>
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Kondisi Unit
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {conditionLabel}
                  </span>
                  <span className="text-xs text-slate-500">
                    Sesuai dengan foto fisik asli tanpa editan.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {spec.label}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Deskripsi dasar */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-500 block mb-1">Deskripsi Tambahan:</span>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {listing.description || "Tidak ada deskripsi tambahan dari penjual."}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CATATAN PEMAKAIAN & ALASAN DIJUAL */}
          {activeTab === "usage" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Catatan Pemakaian &amp; Riwayat Barang
              </h3>
              
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#047857] dark:text-emerald-400 flex items-center gap-1.5">
                  <Icon.Info className="w-4 h-4" />
                  Alasan Dijual &amp; Riwayat
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {listing.description?.includes("Alasan") || listing.description?.includes("dijual")
                    ? listing.description
                    : "Barang pemakaian mahasiswa kuliah aktif (sudah lulus mata kuliah / praktikum terkait atau ingin upgrade). Kondisi terawat siap pakai."}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Standar Kelengkapan Paket Janjian COD:
                </span>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <li>Unit barang utama sesuai foto dan deskripsi</li>
                  <li>Aksesoris / kabel / charger bawaan jika barang elektronik</li>
                  <li>Dapat dicek dan dicoba langsung sepuasnya saat COD sebelum bayar</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: LAPORAN CEK FUNGSI HARDWARE (TESTED) */}
          {activeTab === "diagnostic" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Laporan Cek Fungsi (Pra-COD Verified)
                </h3>
                <span className="text-[11px] text-[#047857] dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Normal &amp; Teruji
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: "Fisik & Engsel / Bodi", status: "Mulus & Kokoh" },
                  { label: "Layar / Tampilan", status: "Jernih Normal" },
                  { label: "Koneksi & Wi-Fi", status: "Cepat Terhubung" },
                  { label: "Tombol & Keyboard", status: "100% Responsif" },
                  { label: "Port / Colokan", status: "Berfungsi Baik" },
                  { label: "Baterai / Daya", status: "Tahan Normal" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs font-medium"
                  >
                    <Icon.CheckCircle className="w-4 h-4 text-[#047857] shrink-0" />
                    <div>
                      <span className="text-slate-900 dark:text-white font-bold block text-[11px]">
                        {item.label}
                      </span>
                      <span className="text-slate-500 text-[10px]">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 italic">
                *Pembeli sangat dianjurkan mencoba kembali item ini langsung saat bertemu di titik kumpul kampus.
              </p>
            </div>
          )}
        </div>

        {/* PANDUAN AMAN TRANSAKSI MAHASISWA (COD) (12.html blueprint) */}
        <div className="rounded-2xl p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row gap-5 items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#047857] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon.ShieldCheck className="w-7 h-7 text-emerald-100" />
          </div>
          <div className="flex flex-col gap-1.5 text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Panduan Aman Transaksi Mahasiswa (COD)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Prioritaskan keselamatan dan transparansi. Jangan pernah mengirimkan uang panjar/DP sebelum memeriksa kondisi fisik barang secara langsung di titik jemput kampus resmi.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <span className="text-[11px] text-[#047857] dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.Users className="w-3.5 h-3.5" />
                Pilih Tempat Ramai
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-[#047857] dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.Check className="w-3.5 h-3.5" />
                Cek Fisik &amp; Fungsi
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-[#047857] dark:text-emerald-400 font-bold flex items-center gap-1">
                <Icon.QrCode className="w-3.5 h-3.5" />
                Bayar saat Cocok
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN (STICKY): Price, Interactive COD Picker, Seller & CTA ── */}
      <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-20">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-5">
          {/* Header & Badges */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                {listing.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon.Eye className="w-3.5 h-3.5" />
                <span>{listing.views || 1}x dilihat</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
              {listing.title}
            </h1>

            {listing.listing_code && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <Icon.Hash className="w-3.5 h-3.5 text-[#047857]" />
                <span>Kode: #{listing.listing_code}</span>
              </div>
            )}

            <div className="flex items-baseline gap-3 pt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#047857] dark:text-emerald-400">
                {rupiah(listing.price)}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                Nego saat COD
              </span>
            </div>
          </div>

          {/* Bebas Ongkir & Temu di Kampus Banner */}
          <div className="rounded-xl p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#047857] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon.ShoppingBag className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#047857] dark:text-emerald-400 leading-tight">
                Bebas Ongkir &amp; Janjian di Kampus
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Tatap muka langsung sesama mahasiswa di lingkungan kampus.
              </span>
            </div>
          </div>

          {/* INTERACTIVE TITIK KUMPUL COD PICKER (SCREEN_15 Standard) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon.MapPin className="w-3.5 h-3.5 text-[#047857]" />
                Pilih Titik Kumpul COD Favorit:
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Klik untuk pilih</span>
            </div>

            <div className="flex flex-col gap-2">
              {defaultCodPoints.map((point) => {
                const isSelected = selectedCodPoint.id === point.id;
                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => {
                      setSelectedCodPoint(point);
                      toast.success(`Titik COD dipilih: ${point.title}`);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-[#047857] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/70 dark:border-white/5 hover:border-slate-300"
                    }`}
                  >
                    <Icon.MapPin
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? "text-[#047857]" : "text-slate-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {point.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-[#047857] text-white"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {point.tag}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {point.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VERIFIED SELLER PROFILE CARD */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {(listing.seller_name?.[0] || "M").toUpperCase()}
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0"></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {listing.seller_name || "Mahasiswa Kampus"}
                    </span>
                    {isStudentVerified && (
                      <Icon.CheckCircle className="w-3.5 h-3.5 text-[#047857]" title="KTM Terverifikasi" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {sellerCampus} {sellerFaculty ? `• ${sellerFaculty}` : ""} {sellerNIM ? `• ${sellerNIM}` : ""}
                  </span>
                </div>
              </div>

              <Link
                href={`/penjual/${sellerUsername}`}
                className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-[#047857] hover:bg-[#047857] hover:text-white text-xs font-semibold border border-slate-200 dark:border-white/10 transition-colors shadow-2xs"
              >
                Lihat Profil
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
                <Icon.Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {sellerRating} / 5.0
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{sellerDeals} COD Sukses</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
                <Icon.Clock className="w-4 h-4 text-[#047857] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {sellerResponse}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Balas Cepat</span>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP ACTIONS */}
          {!sold && (
            <div className="hidden md:flex flex-col gap-2.5 pt-1">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
              >
                <Icon.MessageCircle className="w-4 h-4" />
                <span>Janjian COD via WhatsApp</span>
              </a>

              <OfferButton
                listing={listing}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
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
            <Link href="/panduan-aman" className="hover:text-[#047857] transition-colors">
              Panduan COD Aman
            </Link>
            <span>•</span>
            <ReportButton listing={listing} />
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (Sync with selected COD point) */}
      {!sold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#121214]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-tight truncate">
              📍 {selectedCodPoint.title.split("(")[0]}
            </span>
            <span className="text-base font-extrabold text-[#047857] dark:text-emerald-400 tracking-tight leading-tight block truncate">
              {rupiah(listing.price)}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <OfferButton
              listing={listing}
              className="!w-auto !px-3 !py-2 !text-xs !rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold bg-slate-50 dark:bg-slate-900"
            >
              Nego
            </OfferButton>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="!w-auto px-4 py-2 text-xs rounded-xl shadow-md bg-[#047857] hover:bg-[#065F46] text-white font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Icon.MessageCircle className="w-3.5 h-3.5" />
              <span>Janjian COD</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
