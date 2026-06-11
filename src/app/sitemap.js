import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildSlug } from "@/lib/slug";

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  // Static routes
  const staticRoutes = [
    "",
    "/jual",
    "/dicari",
    "/cara-bergabung",
    "/daftar-harga",
    "/syarat-ketentuan",
    "/kebijakan-privasi",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === "" ? "always" : "daily",
    priority: route === "" ? 1 : 0.8,
  }));

  // Fetch all active listings for dynamic routes
  const supa = getAdminClient();
  const { data: listings } = await supa
    .from("listings")
    .select("id, title, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  const dynamicRoutes = (listings || []).map((listing) => ({
    url: `${baseUrl}/produk/${buildSlug(listing.title, listing.id)}`,
    lastModified: listing.updated_at || new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
