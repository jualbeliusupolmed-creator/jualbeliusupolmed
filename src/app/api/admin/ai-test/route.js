import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { parseListingFromText } from "@/lib/gemini";

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { text, aiConfig } = await req.json();
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const extracted = await parseListingFromText(text, aiConfig);
    return NextResponse.json(extracted);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
