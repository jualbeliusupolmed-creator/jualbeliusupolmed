import { NextResponse } from "next/server";
import { parseListingFromText } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"; // Wait, it's getAdminClient

// Let's use getAdminClient
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { text, aiConfig } = await req.json();
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const extracted = await parseListingFromText(text, aiConfig);
    return NextResponse.json(extracted);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
