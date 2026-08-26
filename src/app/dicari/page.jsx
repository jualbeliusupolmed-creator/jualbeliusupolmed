import { getAdminClient } from "@/lib/supabaseAdmin";
import DicariClient from "./DicariClient";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Cari Barang & Jasa Mahasiswa — Tulis Kebutuhanmu, Penjual Datang",
  description:
    "Lagi cari laptop bekas, buku kuliah, kos, motor, atau jasa di sekitar USU & POLMED? Posting kebutuhanmu gratis di halaman Cari Barang — penjual yang punya barangnya akan menghubungimu langsung via WhatsApp.",
  alternates: { canonical: "/dicari" },
  openGraph: {
    title: "Cari Barang Mahasiswa — Jual Beli USU & POLMED",
    description:
      "Posting barang atau jasa yang kamu cari secara gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
    url: "/dicari",
    type: "website",
    locale: "id_ID",
    siteName: "Jual Beli & Komunitas Mahasiswa USU POLMED",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cari Barang Mahasiswa — Jual Beli USU & POLMED",
    description:
      "Posting barang atau jasa yang kamu cari secara gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
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
    "name": "Barang & Jasa Yang Dicari Mahasiswa USU & POLMED",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <DicariClient initialItems={initialItems} />
    </>
  );
}
