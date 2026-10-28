import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function countListings(supa, campuses, status) {
  let query = supa.from("listings").select("id", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  if (campuses) query = query.in("campus", campuses);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function GET() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "analytics", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const campuses = actor.role === "superadmin" ? null : await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ campuses: [], counts: {}, activity: [], categories: [], topSearches: [] });

  const supa = getAdminClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  try {
    const statuses = ["active", "pending", "sold", "suspended", "rejected"];
    const countPromises = [countListings(supa, campuses, null), ...statuses.map((status) => countListings(supa, campuses, status))];
    const activityQuery = supa.from("listings").select("created_at,status,campus,category").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
    const categoryQuery = supa.from("listings").select("category,campus").order("created_at", { ascending: false }).limit(1000);
    if (campuses) {
      activityQuery.in("campus", campuses);
      categoryQuery.in("campus", campuses);
    }
    const [counts, activityResult, categoryResult, searchResult] = await Promise.all([
      Promise.all(countPromises),
      activityQuery,
      categoryQuery,
      actor.role === "superadmin"
        ? supa.from("search_logs").select("query,results_count,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(2000)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (activityResult.error || categoryResult.error || searchResult.error) throw new Error("Analytics query failed.");

    const daily = new Map();
    for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
      const date = new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
      daily.set(date, 0);
    }
    for (const row of activityResult.data || []) {
      const day = String(row.created_at || "").slice(0, 10);
      if (day) daily.set(day, (daily.get(day) || 0) + 1);
    }
    const categories = new Map();
    for (const row of categoryResult.data || []) {
      const label = String(row.category || "Lainnya");
      categories.set(label, (categories.get(label) || 0) + 1);
    }
    const searches = new Map();
    for (const row of searchResult.data || []) {
      const query = String(row.query || "").trim().slice(0, 80);
      if (!query) continue;
      const entry = searches.get(query) || { query, count: 0, noResult: 0 };
      entry.count += 1;
      if (!(Number(row.results_count) > 0)) entry.noResult += 1;
      searches.set(query, entry);
    }
    return NextResponse.json({
      campuses: campuses || [],
      counts: Object.fromEntries(["total", ...statuses].map((key, index) => [key, counts[index]])),
      activity: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total })),
      categories: [...categories.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10),
      topSearches: actor.role === "superadmin" ? [...searches.values()].sort((a, b) => b.count - a.count).slice(0, 12) : [],
    });
  } catch {
    return NextResponse.json({ error: "Analitik belum dapat dimuat." }, { status: 503 });
  }
}
