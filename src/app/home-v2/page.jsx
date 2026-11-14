import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import { skripJsonLd } from "@/lib/jsonLd";
import { getSellerSessionAsync } from "@/lib/auth";
import Link from "next/link";
import { applyMarketplaceProvinceScope, loadSessionMarketplaceScope } from "@/lib/marketplaceRegion";
import NavbarV2 from "@/components/NavbarV2";
import BottomNavV2 from "@/components/BottomNavV2";
import ProductCardV2 from "@/components/ProductCardV2";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 24;

async function getInitialData(sessionIdentity) {
  try {
    const supa = getAdminClient();
    let provinceId;
    let query = supa
      .from("listings")
      .select("id, listing_code, title, description, price, image_url, images, campus, area, category, type, status, featured, bumped_at, created_at, condition, seller_name, seller_wa, views, stock, rental_period")
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);

    if (sessionIdentity) {
      const { scope, region } = await loadSessionMarketplaceScope(supa, sessionIdentity);
      if (!scope) return { listings: [], total: 0 };
      provinceId = region.province;
      query = applyMarketplaceProvinceScope(query, scope);
      if (!query) return { listings: [], total: 0 };
    }

    const [listingsResult] = await Promise.all([
      fetchListingsWithProfiles(query),
    ]);

    return {
      listings: listingsResult?.data || [],
      total: listingsResult?.count || 0,
    };
  } catch (e) {
    return { listings: [], total: 0 };
  }
}

const CATEGORY_PILLS = [
  { key: "all", label: "Semua" },
  { key: "elektronik", label: "Elektronik" },
  { key: "buku", label: "Buku Kuliah" },
  { key: "fashion", label: "Fashion" },
  { key: "kos", label: "Kos & Kontrakan" },
  { key: "kesehatan", label: "Kesehatan" },
  { key: "lainnya", label: "Lainnya" },
];

export default async function HomeV2Page() {
  const sessionIdentity = await getSellerSessionAsync();
  const { listings, total } = await getInitialData(sessionIdentity);
  const settings = await getSettings();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd({ "@context": "https://schema.org", "@type": "WebPage", name: "Kampus Kita Marketplace", url: "/" }) }}
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Navbar */}
        <NavbarV2 />

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Hero Section */}
          <section className="mb-8">
            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
                    {settings.site?.heroTitle || "Kampus Kita Marketplace"}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
                    {settings.site?.heroSubtitle || "Marketplace preloved mahasiswa terpercaya. COD aman di sekitar kampus."}
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <Link
                    href="/jual"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 dark:hover:bg-emerald-600 active:scale-[0.98] transition-all"
                  >
                    <IconPlus className="h-4 w-4" />
                    <span>Jual Barang</span>
                  </Link>
                  <Link
                    href="/jual-beli"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-800 dark:hover:text-emerald-300 transition-all"
                  >
                    <IconShop className="h-4 w-4" />
                    <span>Jelajahi</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Category Pills */}
          <section className="mb-6">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORY_PILLS.map((cat) => (
                <button
                  key={cat.key}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </section>

          {/* Product Grid */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Iklan Terbaru</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{total} iklan tersedia</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {listings.length > 0 ? (
                listings.map((listing) => (
                  <ProductCardV2 key={listing.id} listing={listing} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Icon.ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 stroke-[1.2]" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Belum ada iklan</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Belum ada barang yang dipasang di marketplace. Jadilah yang pertama memasang iklan!
                  </p>
                  <Link
                    href="/jual"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition-colors"
                  >
                    <IconPlus className="h-4 w-4" />
                    <span>Pasang Iklan Pertama</span>
                  </Link>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Bottom Nav Mobile */}
        <BottomNavV2 />
      </div>
    </>
  );
}

function IconPlus({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShop({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
