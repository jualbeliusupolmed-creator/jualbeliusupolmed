import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const settings = await getSettings();
  const campuses = (Array.isArray(settings.campuses) ? settings.campuses : [])
    .filter((campus) => campus && campus.active !== false && campus.name && campus.shortName)
    .map((campus) => ({
      id: String(campus.id || campus.shortName).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: String(campus.name).trim().slice(0, 100),
      shortName: String(campus.shortName).trim().slice(0, 30),
    }));

  return NextResponse.json({ ok: true, campuses });
}
