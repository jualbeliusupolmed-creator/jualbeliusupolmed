import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(200, Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") || "100")));
  const supa = getAdminClient();

  const { data: logs, error: logsErr } = await supa
    .from("admin_logs")
    .select("id, action, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: errors, error: errErr } = await supa
    .from("error_logs")
    .select("id, endpoint, error_message, context, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (logsErr || errErr) return NextResponse.json({ error: (logsErr || errErr).message }, { status: 500 });

  return NextResponse.json({ logs: logs || [], errors: errors || [] });
}
