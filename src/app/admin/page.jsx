import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import AdminLogin from "./AdminLogin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

async function safe(promise, fallback) {
  try {
    const res = await promise;
    return res?.data ?? fallback;
  } catch {
    return fallback;
  }
}

async function getStats() {
  const supa = getAdminClient();
  const [listings, payments, blacklist, reports, ratings, categories, settings] =
    await Promise.all([
      safe(
        supa.from("listings").select("*").order("created_at", { ascending: false }).limit(500),
        []
      ),
      safe(
        supa.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
        []
      ),
      safe(supa.from("blacklist").select("*").order("created_at", { ascending: false }), []),
      safe(
        supa
          .from("reports")
          .select("*, listings(title, seller_wa)")
          .order("created_at", { ascending: false })
          .limit(200),
        []
      ),
      safe(
        supa
          .from("seller_ratings")
          .select("*, listings(title)")
          .order("created_at", { ascending: false })
          .limit(300),
        []
      ),
      safe(
        supa
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        []
      ),
      getSettings(),
    ]);

  return { listings, payments, blacklist, reports, ratings, categories, settings };
}

export default async function AdminPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }
  let data = {
    listings: [],
    payments: [],
    blacklist: [],
    reports: [],
    ratings: [],
    categories: [],
    settings: DEFAULT_SETTINGS,
  };
  try {
    data = await getStats();
  } catch (e) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-rose-600">
        Gagal memuat data admin: {e.message}. Cek konfigurasi Supabase.
      </div>
    );
  }
  return <AdminPanel {...data} />;
}
