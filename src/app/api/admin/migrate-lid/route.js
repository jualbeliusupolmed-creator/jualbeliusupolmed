import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { cleanupAllLids } from "@/lib/lidMigrate";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // migrasi massal bisa lama

// Pembersihan sekali-pakai: ubah semua data lama ber-key LID → nomor 08.
//   Dry-run : GET /api/admin/migrate-lid?secret=<CRON_SECRET>
//   Eksekusi: GET /api/admin/migrate-lid?secret=<CRON_SECRET>&apply=1
// Auth: header `Authorization: Bearer <CRON_SECRET>` ATAU query `?secret=`.
async function handle(req) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET || "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const provided = bearer || url.searchParams.get("secret") || "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apply = url.searchParams.get("apply") === "1" || url.searchParams.get("apply") === "true";
  try {
    const report = await cleanupAllLids(getAdminClient(), { apply });
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
