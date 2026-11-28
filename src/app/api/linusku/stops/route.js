import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { USU_STOPS } from "@/lib/linusku/usuRoutes";

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("stops")
      .select("id, name, area, lat, lng, sequence_order")
      .order("sequence_order");

    if (error || !data || data.length === 0) {
      return NextResponse.json({ stops: USU_STOPS, source: "default" });
    }

    return NextResponse.json(
      {
        stops: data.map((stop) => ({
          ...stop,
          area:
            typeof stop.area === "string" && stop.area.includes("Dr. Mansyur")
              ? "Jl. Dr. T. Mansyur"
              : stop.area,
          sequenceOrder: stop.sequence_order,
        })),
        source: "database",
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
    );
  } catch {
    return NextResponse.json({ stops: USU_STOPS, source: "default" });
  }
}
