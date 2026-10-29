import Link from "next/link";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rupiah } from "@/lib/fees";
import ProductCard from "@/components/ProductCard";
import ShareProfileButton from "@/components/ShareProfileButton";
import { formatWa, formatWaForBaileys } from "@/lib/constants";
import { skripJsonLd } from "@/lib/jsonLd";
import { decodeSellerSlug, encodeSellerSlug, maskPhone, parseSellerParam } from "@/lib/sellerSlug";
import { Icon } from "@/components/Icons";
import { fetchOpenPoBatches } from "@/lib/openPo";

export const revalidate = 300; // ISR 5 menit — cukup segar untuk marketplace

async function getSellerData(wa) {
  try {
    const raw = decodeURIComponent(String(wa || "")).trim();
    const supa = getAdminClient();
    const parsed = parseSellerParam(raw);

    let profile = null;
    let targetWa = null;

    if (parsed.type === "slug") {
      // 1. Coba cari profil berdasarkan username / slug
      const { data: p } = await supa
        .from("seller_profiles")
        .select("*")
        .ilike("slug", parsed.value)
        .maybeSingle();

      if (p) {
        profile = p;
        targetWa = p.wa;
      } else if (parsed.value.startsWith("p_")) {
        // Cek jika ada kecocokan opaque hash
        const { data: profiles } = await supa
          .from("seller_profiles")
          .select("*")
          .limit(300);
        const matched = (profiles || []).find((pr) => encodeSellerSlug(pr.wa) === parsed.value);
        if (matched) {
          profile = matched;
          targetWa = matched.wa;
        } else {
          // Cari di listings jika profil belum dibuat
          const { data: listingsSample } = await supa
            .from("listings")
            .select("seller_wa")
            .limit(300);
          const found = (listingsSample || []).find((l) => encodeSellerSlug(l.seller_wa) === parsed.value);
          if (found) targetWa = found.seller_wa;
        }
      }
    } else if (parsed.type === "legacy_phone") {
      // Akses legacy lewat nomor HP langsung atau u-base64
      const { data: p } = await supa
        .from("seller_profiles")
        .select("*")
        .eq("wa", parsed.value)
        .maybeSingle();
      if (p) {
        profile = p;
        targetWa = p.wa;
      } else {
        targetWa = parsed.value;
      }
    }

    if (!targetWa) return null;

    // Ambil semua iklan aktif penjual
    const { data: listings } = await supa
      .from("listings")
      .select("*, seller_wa")
      .eq("seller_wa", targetWa)
      .eq("status", "active")
      .order("bumped_at", { ascending: false });

    // Ambil total terjual + views dari semua iklan
    const { data: allListings } = await supa
      .from("listings")
      .select("status, views, created_at, seller_name")
      .eq("seller_wa", targetWa)
      .order("created_at", { ascending: true });

    if ((!allListings || allListings.length === 0) && !profile) {
      return null;
    }

    const soldCount = (allListings || []).filter((l) => l.status === "sold").length;
    const totalViews = (allListings || []).reduce((s, l) => s + (l.views || 0), 0);
    const memberSince = allListings?.[0]?.created_at || profile?.created_at || null;

    // Ambil rating penjual
    const { data: ratings } = await supa
      .from("seller_ratings")
      .select("*")
      .eq("seller_wa", targetWa)
      .order("created_at", { ascending: false });

    const sellerName = profile?.name || listings?.[0]?.seller_name ||
      allListings?.[0]?.seller_name ||
      "Penjual";

    // Ambil kategori distributor
    let distributorCategories = [];
    if (profile?.distributor) {
      const { data: distCats } = await supa
        .from("distributor_categories")
        .select("category")
        .eq("seller_wa", targetWa);
      distributorCategories = (distCats || []).map((r) => r.category);
    }

    // Hitung top kategori
    const catCounts = {};
    let topCat = null;
    let maxCat = 0;
    (allListings || []).forEach(l => {
      if(l.category) {
        catCounts[l.category] = (catCounts[l.category] || 0) + 1;
        if(catCounts[l.category] > maxCat) {
          maxCat = catCounts[l.category];
          topCat = l.category;
        }
      }
    });

    // Ambil iklan terjual (sold)
    const { data: soldListings } = await supa
      .from("listings")
      .select("*, seller_wa")
      .eq("seller_wa", targetWa)
      .eq("status", "sold")
      .order("bumped_at", { ascending: false })
      .limit(12); // Batasi 12 terbaru

    // Apply profiles manually
    if (listings && listings.length > 0) {
      listings.forEach(l => l.seller_profiles = profile || null);
    }
    if (soldListings && soldListings.length > 0) {
      soldListings.forEach(l => l.seller_profiles = profile || null);
    }

    const campus = profile?.campus || profile?.student_campus || listings?.[0]?.campus || "Kampus";
    const faculty = profile?.faculty || listings?.[0]?.faculty || null;
    const isStudentVerified = Boolean(profile?.student_verified || listings?.[0]?.student_verified);
    const isWaVerified = Boolean(profile?.wa_verified || targetWa);

    // Ambil batch PO baru milik akun JB ini.
    let poBatches = [];
    try {
      poBatches = await fetchOpenPoBatches({ sellerWa: formatWa(targetWa) });
    } catch {
      poBatches = [];
    }

    return {
      seller: {
        seller_name: sellerName,
        seller_wa: targetWa,
        slug: profile?.slug || null,
        bio: profile?.bio || null,
        topCategory: topCat,
        trusted_seller: profile?.trusted_seller || false,
        student_verified: isStudentVerified,
        wa_verified: isWaVerified,
        campus,
        faculty,
        distributor: profile?.distributor || false,
        distributorCategories,
        subscription_tier: profile?.subscription_tier || null,
        subscription_expires_at: profile?.subscription_expires_at || null,
        store_status: profile?.store_status || null,
        store_name: profile?.store_name || null,
      },
      poBatches,
      listings: listings || [],
      soldListings: soldListings || [],
      ratings: ratings || [],
      soldCount,
      totalViews,
      memberSince,
    };
  } catch (err) {
    console.error("[getSellerData] error:", err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const data = await getSellerData(params.wa);
  if (!data) return { title: "Penjual tidak ditemukan" };
  const name = data.seller.seller_name;
  const username = data.seller.slug || encodeSellerSlug(data.seller.seller_wa);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const pageUrl = `${baseUrl}/penjual/${username}`;
  const firstImage = data.listings[0]?.image_url || null;
  const soldText = data.soldCount > 0 ? ` Sudah terjual ${data.soldCount}× barang.` : "";
  const desc = `Lihat ${data.listings.length} barang jualan dari ${name} (@${username}) di Kampus Kita.${soldText}`;

  return {
    title: `${name} (@${username}) — Profil Penjual`,
    description: desc,
    keywords: [name, username, "penjual mahasiswa", "marketplace mahasiswa", data.seller.topCategory].filter(Boolean),
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${name} (@${username}) — Profil Penjual di Kampus Kita`,
      description: desc,
      url: pageUrl,
      type: "profile",
      ...(firstImage && { images: [{ url: firstImage, width: 800, height: 600, alt: name }] }),
    },
    twitter: {
      card: firstImage ? "summary_large_image" : "summary",
      title: `${name} (@${username}) — Profil Penjual`,
      description: desc,
      ...(firstImage && { images: [firstImage] }),
    },
  };
}

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 ${s <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function SellerProfilePage({ params }) {
  // Navbar bawah pernah menautkan "Profil" ke /penjual/login — halaman ini,
  // dengan wa="login", memajang profil penjual yang tidak pernah ada. Tautan
  // dan bookmark lama masih bisa membawanya, jadi slug cadangan itu diantar ke
  // pintu tunggal /profil alih-alih dirender sebagai penjual.
  if (["login", "profil", "masuk"].includes(params.wa?.toLowerCase())) {
    redirect("/profil");
  }

  const data = await getSellerData(params.wa);
  if (!data) notFound();

  // Redirect 301 jika diakses lewat URL legacy nomor HP (08/62/u-) atau jika slug canonical berbeda
  const canonicalSlug = data.seller.slug || encodeSellerSlug(data.seller.seller_wa);
  if (params.wa !== canonicalSlug) {
    permanentRedirect(`/penjual/${canonicalSlug}`);
  }

  const { seller, listings, soldListings, ratings, soldCount, totalViews, memberSince, poBatches = [] } = data;
  const isDistributor = !!seller.distributor;
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : null;

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  // Nomor asli untuk link kontak WA
  const waIntl = formatWaForBaileys(seller.seller_wa);
  const sellerSlug = seller.slug || encodeSellerSlug(seller.seller_wa);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "url": `${baseUrl}/penjual/${sellerSlug}`,
    "mainEntity": {
      "@type": "Person",
      "name": seller.seller_name,
      "alternateName": seller.slug ? `@${seller.slug}` : undefined,
      "description": seller.bio || `Penjual di Kampus Kita dengan ${listings.length} barang jualan`,
      "url": `${baseUrl}/penjual/${sellerSlug}`,
      ...(listings[0]?.image_url && { "image": listings[0].image_url }),
      ...(avgRating !== null && ratings.length > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": avgRating.toFixed(1),
          "reviewCount": ratings.length,
          "bestRating": "5",
          "worstRating": "1",
        },
      }),
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: skripJsonLd(jsonLd) }} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 min-w-0 text-sm text-gray-400">
        <Link href="/" className="hover:text-primary shrink-0">Beranda</Link>
        <span className="shrink-0">/</span>
        <span className="shrink-0">Profil Penjual</span>
        <span className="shrink-0">/</span>
        <span className="truncate text-gray-500">{seller.seller_name}</span>
        {seller.slug && (
          <span className="text-gray-400 font-mono text-xs">(@{seller.slug})</span>
        )}
      </nav>

      {/* Header Penjual */}
      <div className={`card mt-4 p-6 flex flex-col sm:flex-row sm:items-start gap-5 ${isDistributor ? "border-orange-200 dark:border-orange-800/50 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-slate-900/30" : ""}`}>
        <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold text-white shadow-lg ${isDistributor ? "bg-gradient-to-br from-orange-500 to-amber-400" : "bg-gradient-to-br from-primary to-primary-dark"}`}>
          {seller.seller_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold flex items-center gap-2 flex-wrap">
              <span>{seller.seller_name}</span>
              {seller.slug && (
                <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 font-mono bg-black/[0.04] dark:bg-white/[0.08] px-2 py-0.5 rounded-md">
                  @{seller.slug}
                </span>
              )}
              {isDistributor && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50" title="Distributor Resmi">
                   DISTRIBUTOR
                </span>
              )}
              {seller.subscription_tier === "pro" && new Date(seller.subscription_expires_at) > new Date() && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400" title="Penjual Pro">
                  ⭐ PRO
                </span>
              )}
              {seller.trusted_seller && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-1 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400" title="Penjual Terpercaya">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h1>
            {soldCount > 0 && (
              <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold text-[11px]">
                 Terjual {soldCount}×
              </span>
            )}
          </div>
          {/* Identitas Kampus & Fakultas */}
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
            <span>🎓 Mahasiswa {seller.campus || "Kampus"}</span>
            {seller.faculty && (
              <span className="text-gray-400 dark:text-slate-500">· Fakultas {seller.faculty}</span>
            )}
            {memberSince && (
              <span className="text-gray-400 dark:text-slate-500">
                · Bergabung {new Date(memberSince).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </span>
            )}
          </p>

          {/* Lencana Verifikasi Transparan */}
          <div className="mt-3 flex flex-wrap gap-2">
            {seller.student_verified && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300" title="Terverifikasi via Kartu Tanda Mahasiswa (KTM) & NIM Resmi">
                <Icon.CheckCircle className="h-3.5 w-3.5 fill-emerald-600 text-white dark:fill-emerald-400 dark:text-zinc-900" />
                <span>KTM Terverifikasi</span>
              </div>
            )}
            {seller.wa_verified && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300" title="Nomor WhatsApp aktif dan terkonfirmasi">
                <Icon.Phone className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>WhatsApp Terverifikasi</span>
              </div>
            )}
            {seller.trusted_seller && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300" title="Penjual Terpercaya dengan track record bersih di komunitas">
                <Icon.Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Penjual Terpercaya</span>
              </div>
            )}
          </div>

          {seller.store_status === "aktif" && seller.store_name && (
            <div className="mt-2.5">
              <Link
                href={`/toko/${seller.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-100"
              >
                🏪 Kunjungi Toko Resmi: {seller.store_name} →
              </Link>
            </div>
          )}
          {avgRating !== null && (
            <div className="mt-2.5 flex items-center gap-2">
              <StarDisplay value={avgRating} />
              <span className="text-sm font-semibold text-amber-500">
                {avgRating.toFixed(1)} / 5
              </span>
              <span className="text-xs text-gray-400">
                ({ratings.length} ulasan terverifikasi)
              </span>
            </div>
          )}
          {seller.bio && (
            <p className="mt-3 text-sm text-gray-700 dark:text-slate-300 italic border-l-2 border-primary pl-3">
              "{seller.bio}"
            </p>
          )}
          {seller.topCategory && (
             <p className="mt-2 text-xs font-semibold text-primary">
                Kategori Utama: {seller.topCategory}
             </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {waIntl && (
              <a
                href={`https://wa.me/${waIntl}?text=${encodeURIComponent(
                  `Halo Kak ${seller.seller_name}, saya lihat profil Kakak di Kampus Kita.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn-wa py-2 px-4 text-xs rounded-xl"
              >
                 Hubungi via WA
              </a>
            )}
            <ShareProfileButton />
            <Link
              href="/panduan-aman"
              className="btn-outline py-2 px-3 text-xs rounded-xl inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-primary"
            >
              <Icon.MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Titik COD Aman</span>
            </Link>
          </div>

          {/* Info Distributor */}
          {isDistributor && (
            <div className="mt-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 p-3">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1"> Mitra Distributor Resmi</p>
              {seller.distributorCategories?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {seller.distributorCategories.map((c) => (
                    <span key={c} className="text-[11px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-full px-2 py-0.5 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-orange-500 dark:text-orange-500 mt-1.5">
                Setiap barang jualan distributor mencantumkan info fee bagi hasil yang transparan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-primary">{listings.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Barang Aktif</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{soldCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Terjual</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-800 dark:text-slate-200">{totalViews.toLocaleString("id-ID")}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Dilihat</p>
        </div>
        <div className="card p-4 text-center">
          {avgRating !== null ? (
            <>
              <p className="text-2xl font-extrabold text-amber-500">{avgRating.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Rating ({ratings.length})</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-gray-300 dark:text-slate-700">—</p>
              <p className="text-xs text-gray-400 mt-0.5">Belum ada rating</p>
            </>
          )}
        </div>
      </div>

      {/* Grid barang jualan */}
      <h2 className="mt-8 text-lg font-bold">
        Barang Aktif <span className="text-gray-400 font-normal text-base">({listings.length})</span>
      </h2>

      {listings.length === 0 ? (
        <div className="card mt-4 grid place-items-center py-16 text-center text-gray-400">
          <p className="text-4xl">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </p>
          <p className="mt-2">Penjual ini belum punya barang aktif.</p>
          <Link href="/" className="btn-outline mt-4">
            Jelajahi Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* Riwayat barang terjual — list kompak, tidak mengganggu barang aktif */}
      {soldListings.length > 0 && (
        <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-6">
          <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            Riwayat Terjual ({soldCount})
          </p>
          <ul className="space-y-1.5">
            {soldListings.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-sm text-gray-500 dark:text-slate-400">
                <span className="truncate"> {l.title}</span>
                <span className="shrink-0 text-xs text-gray-400 dark:text-slate-500">
                  Rp {Number(l.price).toLocaleString("id-ID")}
                </span>
              </li>
            ))}
            {soldCount > 6 && (
              <li className="text-xs text-gray-400 dark:text-slate-500 pt-1">
                +{soldCount - 6} barang lainnya sudah terjual
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Ulasan */}
      {ratings.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">
            Ulasan Pembeli{" "}
            <span className="text-gray-400 font-normal text-base">({ratings.length})</span>
          </h2>
          <div className="mt-4 space-y-3">
            {ratings.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarDisplay value={r.rating} />
                    <span className="text-sm font-semibold text-amber-500">
                      {r.rating}/5
                    </span>
                  </div>
                  {r.buyer_name && (
                    <span className="text-xs text-gray-400">— {r.buyer_name}</span>
                  )}
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-gray-600 italic">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Batch Pre-Order Aktif Penjual */}
      {poBatches.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>Batch Pre-Order (PO) Aktif</span>
              <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
                {poBatches.length} PO
              </span>
            </h2>
            <a
              href="/open-po"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-primary hover:underline"
            >
              Buka di OpenPO ↗
            </a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {poBatches.map((b) => (
              <a
                key={b.id}
                href={b.url || "/open-po"}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-2.5 sm:p-4 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group rounded-xl sm:rounded-2xl"
              >
                <div>
                  <div className="flex items-center justify-between text-[9px] sm:text-xs text-gray-500 mb-1 sm:mb-1.5">
                    <span className="font-bold text-emerald-600 uppercase tracking-wider text-[8px] sm:text-[10px]">
                      {b.emoji} {b.category}
                    </span>
                    <span className="text-[8px] sm:text-[10px]">Sisa {b.quota - b.reserved}</span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                    {b.name}
                  </h3>
                  <p className="text-primary font-black text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Rp {b.price.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[9px] sm:text-xs text-gray-400 mt-1 sm:mt-2 flex items-center gap-1">
                    <Icon.MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                    <span className="truncate">{b.pickup_point}</span>
                  </p>
                </div>
                <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-emerald-600">
                  <span>Pesan Slot</span>
                  <span>→</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Banner Panduan COD Aman & Mediasi Kampus */}
      <div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <Icon.Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Panduan COD Aman &amp; Mediasi Kampus</span>
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed max-w-xl">
            Pilih tempat umum yang ramai di sekitar kampus dan sepakati titik pertemuan terlebih dahulu. Periksa barang sebelum membayar; jika mengalami kendala, hubungi tim dukungan melalui panduan keamanan.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/panduan-aman"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 transition-colors shadow-sm"
          >
            Titik Pertemuan
          </Link>
          <Link
            href="/panduan-aman#mediasi"
            className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white/80 dark:bg-slate-900/80 hover:bg-white text-emerald-800 dark:text-emerald-300 font-bold text-xs px-3.5 py-2 transition-colors"
          >
            Jalur Mediasi
          </Link>
        </div>
      </div>
    </div>
  );
}
