import { NextResponse } from "next/server";
import { tolakCron } from "@/lib/cronAuth";
import { publishQueuedMadingInstagram, siteOriginFromRequest } from "@/lib/madingInstagram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Dipanggil scheduler tepercaya. Hanya post yang sudah diantrekan admin yang diproses.
export async function GET(request) {
  const tolak = tolakCron(request);
  if (tolak) return tolak;

  try {
    const results = await publishQueuedMadingInstagram({ origin: siteOriginFromRequest(request) });
    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menerbitkan antrean Instagram." }, { status: 503 });
  }
}
