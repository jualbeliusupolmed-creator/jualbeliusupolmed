import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import MarketplaceBrowser from "./MarketplaceBrowser";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  // Judul & deskripsi beranda ditulis di sini (bukan dari pengaturan admin),
  // jadi inilah yang muncul di tab peramban, hasil Google, dan pratinjau tautan
  // saat alamatnya dibagikan di grup WhatsApp — jalur masuk utama situs ini.
  title: "Marketplace Mahasiswa | Kampus Kita",
  description:
    "Marketplace untuk mahasiswa lintas kampus di Indonesia: barang, buku, fashion, makanan, kos, dan jasa. Sepakati transaksi dan titik temu secara langsung.",
  keywords: ["marketplace mahasiswa", "jual beli mahasiswa", "Kampus Kita", "barang bekas mahasiswa", "jasa mahasiswa", "COD kampus"],
  alternates: { canonical: "/jual-beli" },
  openGraph: {
    title: "Marketplace Mahasiswa | Kampus Kita",
    description:
      "Marketplace untuk mahasiswa lintas kampus di Indonesia. Temukan barang dan jasa, lalu sepakati transaksi secara langsung.",
    url: "/jual-beli",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace Mahasiswa | Kampus Kita",
    description:
      "Marketplace untuk mahasiswa lintas kampus di Indonesia: barang, buku, kos, dan jasa.",
  },
};
const PAGE_SIZE = 20;

async function getInitialData() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("*, seller_wa", { count: "exact" })
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);
      
    const { data, count } = await fetchListingsWithProfiles(query);
    return { listings: data || [], total: count || 0 };
  } catch (e) {
    console.error("getInitialData:", e?.message);
    return { listings: [], total: 0 };
  }
}

async function getFeatured() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,seller_wa")
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .eq("featured", true)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .limit(6);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

async function getTrending() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,views,seller_wa")
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .gt("views", 0)
      .order("views", { ascending: false, nullsFirst: false })
      .limit(8);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    // kolom views mungkin belum ada (migration belum dijalankan) — abaikan.
    return [];
  }
}

async function getStats() {
  try {
    const supa = getAdminClient();
    const [wantedRes, soldRes, sellersRes] = await Promise.all([
      supa
        .from("wanted_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supa
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "sold"),
      supa.from("listings").select("seller_wa").limit(1000),
    ]);
    const sellerCount = new Set(
      (sellersRes.data || []).map((r) => r.seller_wa).filter(Boolean)
    ).size;
    return {
      wanted: wantedRes.count || 0,
      sold: soldRes.count || 0,
      sellers: sellerCount,
    };
  } catch {
    return { wanted: 0, sold: 0, sellers: 0 };
  }
}

export default async function HomePage() {
  const [{ listings, total }, featured, trending, settings, categories, stats] =
    await Promise.all([
      getInitialData(),
      getFeatured(),
      getTrending(),
      getSettings(),
      getCategories(),
      getStats(),
    ]);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": listings.map((l, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}/produk/${buildSlug(l.title, l.id)}`
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <MarketplaceBrowser
        initialListings={listings}
        initialTotal={total}
        categories={categories}
        stats={stats}
      />
    </>
  );
}
