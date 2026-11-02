import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (value, max, label) => {
  if (typeof value !== "string") throw new Error(`${label} harus berupa teks.`);
  return value.trim().slice(0, max);
};

function requireSuperadmin(actor) {
  return actor?.role === "superadmin";
}

function normalizeProvinces(input) {
  if (!Array.isArray(input) || input.length > 100) throw new Error("Daftar provinsi tidak valid (maksimal 100). ");
  const provinces = input.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Data provinsi tidak valid.");
    const id = text(String(item.id || ""), 60, "Kode provinsi").toLowerCase();
    const name = text(String(item.name || ""), 100, "Nama provinsi");
    if (!SLUG.test(id) || !name) throw new Error("Kode dan nama provinsi wajib diisi dengan format yang benar.");
    return { id, name, active: item.active !== false };
  });
  if (new Set(provinces.map((item) => item.id)).size !== provinces.length) throw new Error("Kode provinsi harus unik.");
  return provinces;
}

function normalizeCampuses(input, provinces) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 10000) throw new Error("Daftar kampus tidak valid (maksimal 10.000). ");
  const provinceIds = new Set(provinces.map((province) => province.id));
  const campuses = input.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Data kampus tidak valid.");
    const id = text(String(item.id || ""), 60, "Kode kampus").toLowerCase();
    const name = text(String(item.name || ""), 120, "Nama kampus");
    const shortName = text(String(item.shortName || ""), 32, "Nama singkat kampus").toUpperCase();
    const provinceId = text(String(item.provinceId || item.province_id || ""), 60, "Provinsi kampus").toLowerCase();
    const parentCampusId = text(String(item.parentCampusId || ""), 60, "Kampus induk").toLowerCase();
    const instagramHandle = text(String(item.instagramHandle || ""), 30, "Akun Instagram").replace(/^@/, "").toLowerCase();
    const emailDomains = Array.isArray(item.emailDomains)
      ? [...new Set(item.emailDomains.map((domain) => text(String(domain || ""), 120, "Domain email").toLowerCase()).filter(Boolean))]
      : [];
    if (!SLUG.test(id) || !name || !shortName || !provinceIds.has(provinceId)) throw new Error("Setiap kampus perlu kode, nama, nama singkat, dan provinsi yang terdaftar.");
    if (parentCampusId && (!SLUG.test(parentCampusId) || parentCampusId === id)) throw new Error("Kampus induk tidak valid.");
    if (instagramHandle && !/^[a-z0-9._]{1,30}$/.test(instagramHandle)) throw new Error("Nama akun Instagram tidak valid.");
    if (emailDomains.some((domain) => !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain))) throw new Error("Domain email harus berupa nama domain tanpa tanda @.");
    return { id, name, shortName, provinceId, parentCampusId, instagramHandle, active: item.active !== false, emailDomains };
  });
  const ids = new Set(campuses.map((item) => item.id));
  if (ids.size !== campuses.length || new Set(campuses.map((item) => item.shortName.toLowerCase())).size !== campuses.length) throw new Error("Kode dan nama singkat kampus harus unik.");
  for (const campus of campuses) {
    if (!campus.parentCampusId) continue;
    const parent = campuses.find((item) => item.id === campus.parentCampusId);
    if (!parent || parent.provinceId !== campus.provinceId) throw new Error("Kampus induk harus terdaftar di provinsi yang sama.");
  }
  const byId = new Map(campuses.map((campus) => [campus.id, campus]));
  for (const campus of campuses) {
    const visited = new Set([campus.id]);
    let parentId = campus.parentCampusId;
    while (parentId) {
      if (visited.has(parentId)) throw new Error("Hubungan kampus induk membentuk putaran. Periksa kembali pilihan kampus induk.");
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentCampusId || "";
    }
  }
  return campuses;
}

export async function GET() {
  const actor = await getAdminActor();
  if (!requireSuperadmin(actor)) return NextResponse.json({ error: "Struktur nasional hanya dapat dikelola superadmin." }, { status: 403 });
  const settings = await getSettings();
  const campuses = Array.isArray(settings.campuses) ? settings.campuses : [];
  const derived = [...new Map(campuses.map((campus) => {
    const id = String(campus.provinceId || campus.province_id || "").trim().toLowerCase();
    return [id, id ? { id, name: id.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), active: true } : null];
  }).filter(([id]) => id)).values()];
  const provinces = Array.isArray(settings.provinces) && settings.provinces.length ? settings.provinces : derived;
  return NextResponse.json({
    provinces,
    campuses: campuses.map((campus) => ({
      id: campus.id || String(campus.shortName || "").toLowerCase(),
      name: campus.name || "",
      shortName: campus.shortName || "",
      provinceId: campus.provinceId || campus.province_id || "",
      parentCampusId: campus.parentCampusId || "",
      instagramHandle: campus.instagramHandle || "",
      active: campus.active !== false,
      emailDomains: Array.isArray(campus.emailDomains) ? campus.emailDomains : [],
    })),
    catalogSource: Array.isArray(settings.provinces) && settings.provinces.length ? "managed" : "legacy-derived",
  });
}

export async function PUT(request) {
  const actor = await getAdminActor();
  if (!requireSuperadmin(actor)) return NextResponse.json({ error: "Struktur nasional hanya dapat dikelola superadmin." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const settings = await getSettings();
  const existingProvinces = Array.isArray(settings.provinces) ? settings.provinces : [];
  const existingCampuses = Array.isArray(settings.campuses) ? settings.campuses : [];
  try {
    const provinces = normalizeProvinces(body.provinces);
    const campuses = normalizeCampuses(body.campuses, provinces);
    const submittedProvinceIds = new Set(provinces.map((item) => item.id));
    const submittedCampusIds = new Set(campuses.map((item) => item.id));
    if (existingProvinces.some((item) => !submittedProvinceIds.has(String(item.id).toLowerCase()))) throw new Error("Provinsi yang sudah terdaftar tidak dihapus. Nonaktifkan jika tidak digunakan.");
    if (existingCampuses.some((item) => !submittedCampusIds.has(String(item.id || item.shortName || "").toLowerCase()))) throw new Error("Kampus yang sudah terdaftar tidak dihapus. Nonaktifkan jika tidak digunakan.");
    const inactiveProvinceIds = new Set(provinces.filter((item) => !item.active).map((item) => item.id));
    if (campuses.some((campus) => campus.active && inactiveProvinceIds.has(campus.provinceId))) throw new Error("Nonaktifkan kampus aktif di provinsi tersebut terlebih dahulu.");
    const supa = getAdminClient();
    const timestamp = new Date().toISOString();
    const { error } = await supa.from("settings").upsert([
      { key: "provinces", value: provinces, updated_at: timestamp },
      { key: "campuses", value: campuses, updated_at: timestamp },
    ], { onConflict: "key" });
    if (error) return NextResponse.json({ error: "Struktur wilayah gagal disimpan." }, { status: 503 });
    await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: "organization_structure_updated", target_id: "organization", metadata: { provinceCount: provinces.length, campusCount: campuses.length } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Struktur wilayah tidak valid." }, { status: 400 });
  }
}
