import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") || "30")));
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();

  const supa = getAdminClient();
  const { data, error } = await supa
    .from("search_logs")
    .select("query, results_count")
    .gte("created_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const countMap = {};
  const totalResults = {};
  for (const row of data || []) {
    countMap[row.query] = (countMap[row.query] || 0) + 1;
    totalResults[row.query] = (totalResults[row.query] || 0) + (row.results_count || 0);
  }

  const sorted = Object.entries(countMap)
    .map(([query, count]) => ({ query, count, avgResults: Math.round(totalResults[query] / count) }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total: data?.length || 0,
    top: sorted.slice(0, 30),
    noResult: sorted.filter((q) => q.avgResults === 0).slice(0, 20),
  });
}
