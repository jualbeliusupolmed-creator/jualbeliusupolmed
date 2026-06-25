import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);

  const { data: payments, error } = await supa
    .from("payments")
    .select("id, amount, type, created_at")
    .eq("status", "paid")
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payments: payments || [] });
}
