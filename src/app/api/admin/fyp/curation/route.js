import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  findProvinceListings,
  canManageFypProvince,
  loadProvinceContext,
  MAX_FEATURED,
  normalizeProvinceId,
  provinceScopesForActor,
  readProvinceCuration,
} from "@/lib/fypCuration";

export const dynamic = "force-dynamic";

async function resolveProvince(actor, supa, requestedId) {
  const allowed = provinceScopesForActor(actor);
  let provinceId = normalizeProvinceId(requestedId);
  if (allowed && (!allowed.length || (provinceId && !allowed.includes(provinceId)))) return null;
  if (!provinceId && allowed) provinceId = allowed[0];
  if (!provinceId && actor?.role === "superadmin") {
    const { data } = await supa.from("provinces").select("id").eq("status", "active").order("name").limit(1).maybeSingle();
    provinceId = normalizeProvinceId(data?.id);
  }
  return provinceId ? loadProvinceContext(supa, provinceId) : null;
}

export async function GET(request) {
  const actor = await getAdminActor();
  const isSuperadmin = actor?.role === "superadmin";
  const allowed = provinceScopesForActor(actor);
  if (!isSuperadmin && (!actor?.roles?.some((role) => role.role_code === "province_admin") || !allowed?.length)) {
    return NextResponse.json({ error: "Kurasi FYP hanya tersedia untuk superadmin dan admin provinsi." }, { status: 403 });
  }

  try {
    const supa = getAdminClient();
    const { searchParams } = new URL(request.url);
    const context = await resolveProvince(actor, supa, searchParams.get("provinceId"));
    if (!context) return NextResponse.json({ error: "Provinsi tidak ditemukan atau di luar cakupan akun." }, { status: 404 });
    const [curation, candidates, provinceRows] = await Promise.all([
      readProvinceCuration(supa, context),
      findProvinceListings(supa, context, { query: searchParams.get("q"), limit: 100 }),
      isSuperadmin
        ? supa.from("provinces").select("id,name").eq("status", "active").order("name")
        : Promise.resolve({ data: [context.province] }),
    ]);
    return NextResponse.json({
      province: context.province,
      provinces: (provinceRows.data || []).map(({ id, name }) => ({ id, name })),
      items: candidates,
      featured: curation.items,
      featuredIds: curation.ids,
      maxFeatured: MAX_FEATURED,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Kurasi FYP belum dapat dimuat." }, { status: 503 });
  }
}

export async function PUT(request) {
  const actor = await getAdminActor();
  const isSuperadmin = actor?.role === "superadmin";
  const allowed = provinceScopesForActor(actor);
  if (!isSuperadmin && (!actor?.roles?.some((role) => role.role_code === "province_admin") || !allowed?.length)) {
    return NextResponse.json({ error: "Kurasi FYP hanya tersedia untuk superadmin dan admin provinsi." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const provinceId = normalizeProvinceId(body.provinceId);
  const ids = Array.isArray(body.listingIds) ? [...new Set(body.listingIds.map((id) => String(id || "").trim()).filter(Boolean))] : null;
  if (!provinceId || !ids || ids.length > MAX_FEATURED || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: `Pilih maksimal ${MAX_FEATURED} listing dengan data yang valid.` }, { status: 400 });
  }
  if (!canManageFypProvince(actor, provinceId)) return NextResponse.json({ error: "Provinsi berada di luar cakupan akun." }, { status: 403 });

  try {
    const supa = getAdminClient();
    const context = await loadProvinceContext(supa, provinceId);
    if (!context) return NextResponse.json({ error: "Provinsi tidak aktif atau tidak ditemukan." }, { status: 404 });
    const verifiedItems = ids.length ? await findProvinceListings(supa, context, { ids, limit: MAX_FEATURED }) : [];
    if (verifiedItems.length !== ids.length) {
      return NextResponse.json({ error: "Semua pilihan harus berupa listing aktif dari provinsi ini." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const { error } = await supa.from("settings").upsert({
      key: `fyp_province_${provinceId}`,
      value: { listing_ids: ids, updated_by: actor.userId, updated_at: now },
      updated_at: now,
    }, { onConflict: "key" });
    if (error) throw new Error("Urutan FYP gagal disimpan.");
    await supa.from("admin_audit_events").insert({
      actor_id: actor.userId,
      action: "province_fyp_curated",
      target_id: provinceId,
      metadata: { listing_count: ids.length },
    });
    return NextResponse.json({ ok: true, featuredIds: ids });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Kurasi FYP gagal disimpan." }, { status: 503 });
  }
}
