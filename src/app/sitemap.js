import { getAdminClient } from "@/lib/supabaseAdmin";

export const revalidate = 3600; // regen tiap 1 jam

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const staticRoutes = [
    { path: "", priority: 1, freq: "daily" },
    { path: "/jual", priority: 0.7, freq: "weekly" },
    { path: "/cara-bergabung", priority: 0.5, freq: "monthly" },
  ].map((r) => ({
    url: `${base}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  let listings = [];
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("listings")
      .select("id, created_at")
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false })
      .limit(1000);
    listings = data || [];
  } catch {
    // env Supabase belum ada saat build — sitemap tetap berisi rute statis.
  }

  const productRoutes = listings.map((l) => ({
    url: `${base}/produk/${l.id}`,
    lastModified: new Date(l.created_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
