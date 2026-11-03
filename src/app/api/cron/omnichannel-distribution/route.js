import { NextResponse } from "next/server";
import { tolakCron } from "@/lib/cronAuth";
import { siteOriginFromRequest } from "@/lib/instagramQueue";
import { processScheduledOmnichannelJobs } from "@/lib/omnichannelDistribution";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Processes only jobs whose scheduled time has arrived. The shared cron gate
// keeps this endpoint unavailable until CRON_SECRET is configured.
export async function GET(request) {
  const denied = tolakCron(request);
  if (denied) return denied;

  try {
    const result = await processScheduledOmnichannelJobs({
      origin: siteOriginFromRequest(request),
      limit: 10,
    });
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      succeeded: result.results.filter((item) => item.ok).length,
      failed: result.results.filter((item) => !item.ok && !item.skipped).length,
      skipped: result.results.filter((item) => item.skipped).length,
    });
  } catch (error) {
    console.error("[cron/omnichannel-distribution] Gagal memproses jadwal.", error);
    return NextResponse.json({ error: "Gagal memproses jadwal distribusi." }, { status: 503 });
  }
}
