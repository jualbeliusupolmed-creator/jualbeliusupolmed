import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rupiah } from "@/lib/fees";
import ProductCard from "@/components/ProductCard";
import ShareProfileButton from "@/components/ShareProfileButton";
import { formatWa } from "@/lib/constants";

export const revalidate = 300; // ISR 5 menit — cukup segar untuk marketplace

async function getSellerData(wa) {
  try {
    // Normalize to 628... so /penjual/08... and /penjual/628... resolve to same page
    const decodedWa = formatWa(decodeURIComponent(wa)) || decodeURIComponent(wa);
    const supa = getAdminClient();

    // Ambil semua iklan aktif penjual
    const { data: listings } = await supa
      .from("listings")
      .select("*, seller_wa")
      .eq("seller_wa", decodedWa)
      .eq("status", "active")
      .order("bumped_at", { ascending: false });

    // Ambil total terjual + views dari semua iklan
    const { data: allListings } = await supa
      .from("listings")
      .select("status, views, created_at")
      .eq("seller_wa", decodedWa)
      .order("created_at", { ascending: true });

    if (!listings && (!allListings || allListings.length === 0)) {
      const { data: any } = await supa
        .from("listings")
        .select("seller_name, seller_wa")
        .eq("seller_wa", decodedWa)
        .limit(1)
        .maybeSingle();
      if (!any) return null;
      return { seller: any, listings: [], ratings: [], soldCount: 0, totalViews: 0, memberSince: null };
    }

    const soldCount = (allListings || []).filter((l) => l.status === "sold").length;
    const totalViews = (allListings || []).reduce((s, l) => s + (l.views || 0), 0);
    const memberSince = allListings?.[0]?.created_at || null;

    // Ambil rating penjual
    const { data: ratings } = await supa
      .from("seller_ratings")
      .select("*")
      .eq("seller_wa", decodedWa)
      .order("created_at", { ascending: false });

    // Ambil bio dari seller_profiles (bisa null jika belum dimigrasi)
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", decodedWa)
      .maybeSingle();

    const sellerName = profile?.name || listings?.[0]?.seller_name ||
      allListings?.[0]?.seller_name ||
      decodedWa;

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
      .eq("seller_wa", decodedWa)
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

    return {
      seller: { seller_name: sellerName, seller_wa: decodedWa, bio: profile?.bio || null, topCategory: topCat, trusted_seller: profile?.trusted_seller || false, subscription_tier: profile?.subscription_tier || null, subscription_expires_at: profile?.subscription_expires_at || null },
      listings: listings || [],
      soldListings: soldListings || [],
      ratings: ratings || [],
      soldCount,
      totalViews,
      memberSince,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const data = await getSellerData(params.wa);
  if (!data) return { title: "Penjual tidak ditemukan" };
  const name = data.seller.seller_name;
  const waClean = data.seller.seller_wa?.replace(/\D/g, "") || params.wa;
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const pageUrl = `${baseUrl}/penjual/${waClean}`;
  const firstImage = data.listings[0]?.image_url || null;
  const soldText = data.soldCount > 0 ? ` Sudah terjual ${data.soldCount}× barang.` : "";
  const desc = `Lihat ${data.listings.length} iklan aktif dari ${name} di Jual Beli USU Polmed.${soldText}`;

  return {
    title: `${name} — Profil Penjual`,
    description: desc,
    keywords: [name, "penjual USU", "jual beli USU", "marketplace Medan", data.seller.topCategory].filter(Boolean),
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${name} — Profil Penjual di Jual Beli USU`,
      description: desc,
      url: pageUrl,
      type: "profile",
      ...(firstImage && { images: [{ url: firstImage, width: 800, height: 600, alt: name }] }),
    },
    twitter: {
      card: firstImage ? "summary_large_image" : "summary",
      title: `${name} — Profil Penjual`,
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
  const data = await getSellerData(params.wa);
  if (!data) notFound();

  const { seller, listings, soldListings, ratings, soldCount, totalViews, memberSince } = data;
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : null;

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const waClean = seller.seller_wa?.replace(/\D/g, "") || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "url": `${baseUrl}/penjual/${waClean}`,
    "mainEntity": {
      "@type": "Person",
      "name": seller.seller_name,
      "description": seller.bio || `Penjual di Jual Beli USU dengan ${listings.length} iklan aktif`,
      "url": `${baseUrl}/penjual/${waClean}`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400">
        <Link href="/" className="hover:text-primary">
          Beranda
        </Link>{" "}
        / Profil Penjual
      </nav>

      {/* Header Penjual */}
      <div className="card mt-4 p-6 flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-2xl font-extrabold text-white shadow-lg">
          {seller.seller_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              {seller.seller_name}
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
                ✓ Terjual {soldCount}×
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400">
            Penjual di Medan Marketplace
            {memberSince && (
              <span className="ml-2 text-gray-300 dark:text-slate-600">
                · Bergabung {new Date(memberSince).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </span>
            )}
          </p>
          {avgRating !== null && (
            <div className="mt-2 flex items-center gap-2">
              <StarDisplay value={avgRating} />
              <span className="text-sm font-semibold text-amber-500">
                {avgRating.toFixed(1)} / 5
              </span>
              <span className="text-xs text-gray-400">
                ({ratings.length} ulasan)
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
               🏅 Spesialis: {seller.topCategory}
             </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3.5">
            <a
              href={`https://wa.me/${(seller.seller_wa || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                `Halo Kak ${seller.seller_name}, saya lihat profil Kakak di Jual Beli Medan.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="btn-wa py-2 px-4 text-xs rounded-xl"
            >
              💬 Hubungi via WA
            </a>
            <ShareProfileButton />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-extrabold text-primary">{listings.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Iklan Aktif</p>
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

      {/* Grid Iklan */}
      <h2 className="mt-8 text-lg font-bold">
        Iklan Aktif <span className="text-gray-400 font-normal text-base">({listings.length})</span>
      </h2>

      {listings.length === 0 ? (
        <div className="card mt-4 grid place-items-center py-16 text-center text-gray-400">
          <p className="text-4xl">🪹</p>
          <p className="mt-2">Penjual ini belum punya iklan aktif.</p>
          <Link href="/" className="btn-outline mt-4">
            Jelajahi Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ProductCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* Grid Iklan Terjual */}
      {soldListings.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-bold">
            Riwayat Terjual <span className="text-gray-400 font-normal text-base">({soldCount})</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 opacity-75">
            {soldListings.map((l) => (
              <ProductCard key={l.id} listing={l} />
            ))}
          </div>
        </>
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
    </div>
  );
}
