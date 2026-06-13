import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const data = await request.json();
    const userAgent = data.userAgent || "Unknown";

    const supabase = getSupabase();
    
    // Attempt to insert record. Ignore if the table doesn't exist yet 
    // to prevent crashing if the user hasn't run the SQL migration.
    const { error } = await supabase
      .from("pwa_installs")
      .insert([{ user_agent: userAgent }]);

    if (error) {
      console.error("Failed to track PWA install in Supabase:", error);
      // We still return 200 so the frontend doesn't break, as analytics shouldn't crash the app
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PWA Install tracking error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
