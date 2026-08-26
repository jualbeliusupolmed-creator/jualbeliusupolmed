import { NextResponse } from "next/server";
import { tolakCron } from "@/lib/cronAuth";
import { publishQueuedMadingInstagram, siteOriginFromRequest } from "@/lib/madingInstagram";
import { publishQueuedListingInstagram } from "@/lib/listingInstagram";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Backup scheduler untuk retry Menfess dan katalog yang gagal diproses langsung.
export async function GET(request) {
  const tolak = tolakCron(request);
  if (tolak) return tolak;

  try {
    const origin = siteOriginFromRequest(request);
    const [menfess, catalog] = await Promise.allSettled([
      publishQueuedMadingInstagram({ origin, limit: 5 }),
      publishQueuedListingInstagram({ origin, limit: 5 }),
    ]);
    const menfessResults = menfess.status === "fulfilled" ? menfess.value : [];
    const catalogResults = catalog.status === "fulfilled" ? catalog.value : [];
    return NextResponse.json({
      ok: menfess.status === "fulfilled" || catalog.status === "fulfilled",
      processed: menfessResults.length + catalogResults.length,
      menfess: menfessResults,
      catalog: catalogResults,
    });
  } catch (error) {
    return jawabGalat(error, { status: 503, pesan: "Gagal menerbitkan antrean Instagram." });
  }
}
