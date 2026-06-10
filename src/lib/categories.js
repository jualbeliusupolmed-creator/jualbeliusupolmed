// Kategori dinamis (DB-backed) dengan fallback ke constants statis.
import { getAdminClient } from "@/lib/supabaseAdmin";
import { CATEGORIES as DEFAULT_CATEGORIES } from "@/lib/constants";

export async function getCategories() {
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (data && data.length) {
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon || "🏷️",
        sort_order: c.sort_order ?? 0,
      }));
    }
  } catch {
    // tabel belum punya kolom icon / DB error -> fallback
  }
  return DEFAULT_CATEGORIES;
}
