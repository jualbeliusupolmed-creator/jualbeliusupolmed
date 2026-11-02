import { NextResponse } from "next/server";
import { getSettings, getCampusProvinceId } from "@/lib/settings";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const settings = await getSettings();
  let dbProvinces = [];

  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("provinces")
      .select("id, name, status")
      .eq("status", "active")
      .order("name");
    if (Array.isArray(data) && data.length > 0) {
      dbProvinces = data;
    }
  } catch {}

  const campuses = (Array.isArray(settings.campuses) ? settings.campuses : [])
    .filter((campus) => campus && campus.active !== false && campus.name && campus.shortName)
    .map((campus) => ({
      id: String(campus.id || campus.shortName).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: String(campus.name).trim().slice(0, 100),
      shortName: String(campus.shortName).trim().slice(0, 30),
      provinceId: campus.provinceId || campus.province_id || getCampusProvinceId(campus) || "sumatera-utara",
    }));

  const provinces = dbProvinces.length > 0
    ? dbProvinces
    : (Array.isArray(settings.provinces) && settings.provinces.length > 0
        ? settings.provinces
        : [
            { id: "sumatera-utara", name: "Sumatera Utara" },
            { id: "dki-jakarta", name: "DKI Jakarta" },
            { id: "jawa-barat", name: "Jawa Barat" },
            { id: "di-yogyakarta", name: "DI Yogyakarta" },
            { id: "jawa-timur", name: "Jawa Timur" },
          ]);

  return NextResponse.json({ ok: true, campuses, provinces });
}
