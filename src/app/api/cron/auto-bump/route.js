import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakCron } from "@/lib/cronAuth";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";
// Loop kirim WA berjeda (anti-ban) mudah melewati batas default 10-15 detik —
// fungsi yang dibunuh di tengah loop meninggalkan sebagian penerima tanpa pesan.
export const maxDuration = 300;

export async function GET(req) {
  try {
    const tolak = tolakCron(req);
    if (tolak) return tolak;

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
    return jawabGalat(e);
  }
}
