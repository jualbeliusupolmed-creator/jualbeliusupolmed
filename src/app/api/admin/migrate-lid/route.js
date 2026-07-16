import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { cleanupAllLids, migrateLidToPhone } from "@/lib/lidMigrate";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // migrasi massal bisa lama

// Pembersihan sekali-pakai: ubah semua data lama ber-key LID → nomor 08.
//   Dry-run : GET /api/admin/migrate-lid?secret=<CRON_SECRET>
//   Eksekusi: GET /api/admin/migrate-lid?secret=<CRON_SECRET>&apply=1
//   Pasangan eksplisit (mis. dari lid_resolution_map.json lokal di VPS bot yang
//   tidak tersambung Supabase): POST body {pairs:[{lid, phone}]} — phone boleh
//   format apa pun yang diterima formatWa (628xx@s.whatsapp.net / 08xx / 628xx).
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

  let pairs = [];
  if (req.method === "POST") {
    try {
      const body = await req.json();
      pairs = Array.isArray(body?.pairs) ? body.pairs : [];
    } catch (_) {}
  }
  if (pairs.length) {
    const supa = getAdminClient();
    const results = [];
    for (const p of pairs.slice(0, 100)) {
      const lidDigits = String(p.lid || "").split("@")[0].replace(/\D/g, "");
      const phone = formatWa(String(p.phone || ""));
      if (!lidDigits || !phone) {
        results.push({ lid: p.lid, phone: p.phone, ok: false, error: "lid/phone tidak valid" });
        continue;
      }
      if (!apply) {
        results.push({ lid: lidDigits, phone, ok: true, dryRun: true });
        continue;
      }
      try {
        await migrateLidToPhone(supa, lidDigits, phone);
        results.push({ lid: lidDigits, phone, ok: true, migrated: true });
      } catch (e) {
        results.push({ lid: lidDigits, phone, ok: false, error: e?.message || String(e) });
      }
    }
    return NextResponse.json({ ok: true, mode: "pairs", apply, results });
  }

  try {
    const report = await cleanupAllLids(getAdminClient(), { apply });
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
