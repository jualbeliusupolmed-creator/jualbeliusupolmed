import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // Vercel Cron Authentication
    if (
      process.env.CRON_SECRET &&
      req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = getAdminClient();
    const now = new Date().toISOString();

    // Ambil semua listing yang auto_bump_until nya masih berlaku (lebih dari sekarang)
    const { data: listings, error } = await supa
      .from("listings")
      .select("id")
      .eq("status", "active")
      .gt("auto_bump_until", now);

    if (error) throw new Error(error.message);

    if (listings && listings.length > 0) {
      const ids = listings.map((l) => l.id);
      // Update bumped_at ke sekarang untuk listing tersebut
      await supa
        .from("listings")
        .update({ bumped_at: now })
        .in("id", ids);
    }

    return NextResponse.json({ ok: true, count: listings?.length || 0 });
  } catch (e) {
    console.error("Auto-Bump Cron Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
