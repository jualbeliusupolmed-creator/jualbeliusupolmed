import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = getAdminClient();

    // Dapatkan semua room marketplace dan direct DM milik user ini
    const { data: rooms, error } = await supa
      .from("chat_rooms")
      .select(`
        *,
        listings:listing_id (id, title, image_url, price)
      `)
      .in("type", ["marketplace", "direct"])
      .or(`user1_id.eq.${wa},user2_id.eq.${wa}`)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, rooms: rooms || [], myWa: wa });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
