import { NextResponse } from "next/server";
import { publishQueuedMadingInstagram, siteOriginFromRequest } from "@/lib/madingInstagram";
import { publishQueuedListingInstagram } from "@/lib/listingInstagram";

export const maxDuration = 60; // Max allowed by plan
export const dynamic = "force-dynamic";

export async function POST(req) {
  // Hanya menerima trigger POST untuk mencegah tidak sengaja ke-trigger browser
  try {
    const origin = siteOriginFromRequest(req);
    
    // Tarik semua antrean tanpa batas (maks 1000 untuk safety code, ekivalen tanpa batas)
    const [mading, katalog] = await Promise.all([
      publishQueuedMadingInstagram({ origin, limit: 1000 }).catch(e => {
        console.error("Trigger mading error:", e);
        return [];
      }),
      publishQueuedListingInstagram({ origin, limit: 1000 }).catch(e => {
        console.error("Trigger katalog error:", e);
        return [];
      })
    ]);

    return NextResponse.json({
      ok: true,
      mading: mading?.length || 0,
      katalog: katalog?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

