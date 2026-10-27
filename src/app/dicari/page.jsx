import { getAdminClient } from "@/lib/supabaseAdmin";
import DicariClient from "./DicariClient";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "WTB Hub Mahasiswa — Kebutuhan Kuliah & Barang Dicari | Kampus Kita",
  description:
    "Pusat permintaan barang dan jasa (Want to Buy / WTB) mahasiswa lintas kampus. Posting kebutuhan kuliahmu dan dapatkan penawaran cepat dengan COD aman.",
  alternates: { canonical: "/dicari" },
  openGraph: {
    title: "WTB Hub Mahasiswa — Kebutuhan Kuliah & Barang Dicari | Kampus Kita",
    description:
      "Posting kebutuhan kuliahmu secara gratis. Penjual mahasiswa langsung memberikan penawaran cepat dan COD aman.",
    url: "/dicari",
    type: "website",
    locale: "id_ID",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "WTB Hub Mahasiswa — Kebutuhan Kuliah | Kampus Kita",
    description:
      "Posting kebutuhan kuliahmu secara gratis. Penjual mahasiswa langsung memberikan penawaran cepat dan COD aman.",
  },
};

async function getInitialWantedItems() {
  try {
    const supa = getAdminClient();
    const { data: wanted, error } = await supa
      .from("wanted_listings")
      .select("id, title, description, budget, category, campus, area, item_condition, buyer_name, buyer_wa, status, unlock_count, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !wanted) {
      return [];
    }

    return wanted;
  } catch (err) {
    console.error("getInitialWantedItems error:", err?.message);
    return [];
  }
}

export default async function DicariPage() {
  const initialItems = await getInitialWantedItems();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Barang & Jasa Yang Dicari Mahasiswa",
    "description": "Daftar kebutuhan barang dan jasa yang dicari mahasiswa.",
    "itemListElement": initialItems.slice(0, 15).map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.title,
      "url": `${baseUrl}/dicari`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <DicariClient initialItems={initialItems} />
    </>
  );
}
