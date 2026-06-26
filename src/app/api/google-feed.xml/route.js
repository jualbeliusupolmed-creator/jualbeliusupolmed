import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildSlug } from "@/lib/slug";

export const dynamic = "force-dynamic"; // Update automatically

export async function GET() {
  const supa = getAdminClient();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Jual Beli USU Polmed";

  // Fetch all active products (exclude services 'jasa' if you only want physical products for GMC)
  const { data: listings, error } = await supa
    .from("listings")
    .select("id, title, description, image_url, images, price, condition, category, type, created_at")
    .eq("status", "active")
    .neq("type", "jasa") // Usually GMC only accepts physical products
    .order("created_at", { ascending: false });

  if (error || !listings) {
    return new Response("<error>Gagal mengambil data</error>", {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const escapeXml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  let itemsXml = "";

  for (const listing of listings) {
    const canonicalSlug = buildSlug(listing.title, listing.id);
    const link = `${baseUrl}/produk/${canonicalSlug}`;
    
    // Choose the best image
    const imageUrl = listing.image_url || (listing.images?.length > 0 ? listing.images[0] : "");
    if (!imageUrl) continue; // GMC requires an image

    const condition = listing.condition === "new" ? "new" : "used";
    const priceStr = `${listing.price}.00 IDR`; // Google Merchant Center requires ISO currency code
    
    itemsXml += `
    <item>
      <g:id>${listing.id}</g:id>
      <g:title>${escapeXml(listing.title)}</g:title>
      <g:description>${escapeXml(listing.description || listing.title)}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:condition>${condition}</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${priceStr}</g:price>
      <g:brand>${escapeXml(siteName)}</g:brand>
      <g:product_type>${escapeXml(listing.category)}</g:product_type>
    </item>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${baseUrl}</link>
    <description>Daftar produk dan barang preloved mahasiswa dari ${escapeXml(siteName)}</description>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400", // Cache for 1 hour
    },
  });
}
