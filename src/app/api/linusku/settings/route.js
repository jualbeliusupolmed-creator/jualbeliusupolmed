import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { DEFAULT_LINUSKU_SETTINGS, mergeLinuskuSettings } from "@/lib/linusku/usuRoutes";

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data: settingsData, error: settingsError } = await supabase
      .from("linusku_settings_v2")
      .select("key, value, updated_at")
      .in("key", ["service", "schedule", "eta", "map", "features", "geofence"]);

    if (!settingsError && settingsData && settingsData.length > 0) {
      const mergedSettings = mergeLinuskuSettings(
        Object.fromEntries(settingsData.map((row) => [row.key, row.value]))
      );
      const latestUpdatedAt = settingsData.reduce((latest, row) => {
        const rowTime = new Date(row.updated_at).getTime();
        return rowTime > latest ? rowTime : latest;
      }, 0);

      return NextResponse.json(
        {
          settings: mergedSettings,
          source: "database",
          updatedAt: new Date(latestUpdatedAt).toISOString(),
        },
        { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
      );
    }
  } catch {
    // Fallback to default settings
  }

  return NextResponse.json({
    settings: DEFAULT_LINUSKU_SETTINGS,
    source: "default",
  });
}
