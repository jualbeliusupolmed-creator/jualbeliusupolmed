import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { USU_STOPS } from "@/lib/linusku/usuRoutes";
import { getCampusRoadPolyline } from "@/lib/linusku/campusRoute";

export async function GET() {
  let stops = USU_STOPS;
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("stops")
      .select("id, name, area, lat, lng, sequence_order")
      .order("sequence_order");

    if (!error && data && data.length >= 2) {
      stops = data.map((stop) => ({
        ...stop,
        sequenceOrder: stop.sequence_order,
      }));
    }
  } catch {
    // Fallback to USU_STOPS
  }

  const route = await getCampusRoadPolyline(stops);
  return NextResponse.json(route, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
