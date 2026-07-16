import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildSlug } from "@/lib/slug";
import { formatWa } from "@/lib/constants";

export const revalidate = 3600;

export default async function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const supa = getAdminClient();

  const staticRoutes = [
    { url: `${baseUrl}`,              changeFrequency: "always",  priority: 1.0 },
    { url: `${baseUrl}/dicari`,       changeFrequency: "hourly",  priority: 0.9 },
    { url: `${baseUrl}/jual`,         changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/jasa`,         changeFrequency: "daily",   priority: 0.7 },
    { url: `${baseUrl}/blog`,         changeFrequency: "daily",   priority: 0.7 },
    { url: `${baseUrl}/cara-bergabung`,   changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/daftar-harga`,     changeFrequency: "weekly",  priority: 0.5 },
    { url: `${baseUrl}/faq`,              changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/syarat-ketentuan`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/kebijakan-privasi`,changeFrequency: "monthly", priority: 0.4 },
  ].map((r) => ({ ...r, lastModified: new Date().toISOString() }));

  // Semua iklan aktif
  const [listingsRes, sellersRes, blogsRes] = await Promise.all([
    supa
      .from("listings")
      .select("id, title, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5000),
    supa
      .from("listings")
      .select("seller_wa, bumped_at")
      .eq("status", "active")
      .not("seller_wa", "is", null),
    supa
      .from("blogs")
      .select("slug, updated_at")
      .eq("status", "published"),
  ]);

  const listingRoutes = ((listingsRes.data) || []).map((l) => ({
    url: `${baseUrl}/produk/${buildSlug(l.title, l.id)}`,
    lastModified: l.updated_at || new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Halaman profil penjual — deduplikasi. Lewati seller_wa yang bukan nomor HP valid
  // (mis. sisa LID) supaya tak mengindeks halaman profil dengan URL rusak.
  const sellerMap = new Map();
  for (const s of (sellersRes.data || [])) {
    const wa = formatWa(s.seller_wa);
    if (!wa) continue;
    if (!sellerMap.has(wa)) sellerMap.set(wa, s.bumped_at);
  }
  const sellerRoutes = Array.from(sellerMap.entries()).map(([wa, bumpedAt]) => ({
    url: `${baseUrl}/penjual/${wa}`,
    lastModified: bumpedAt || new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Blog posts
  const blogRoutes = ((blogsRes.data) || []).map((b) => ({
    url: `${baseUrl}/blog/${b.slug}`,
    lastModified: b.updated_at || new Date().toISOString(),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...listingRoutes, ...sellerRoutes, ...blogRoutes];
}
