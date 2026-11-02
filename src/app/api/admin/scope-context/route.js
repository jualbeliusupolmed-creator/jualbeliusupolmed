import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, getActiveCampuses } from "@/lib/settings";

export const dynamic = "force-dynamic";

const SCOPE_COOKIE = "kk_admin_active_scope";

export async function GET() {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });

  const activeScope = cookies().get(SCOPE_COOKIE)?.value || "all";
  const admin = getAdminClient();
  const isSuper = actor.role === "superadmin";

  let provinces = [];
  let universities = [];

  const [provRes, uniRes] = await Promise.all([
    admin.from("provinces").select("id, name, status").eq("status", "active").order("name"),
    admin.from("universities").select("id, code, name, province_id, status").eq("status", "active").order("name"),
  ]);

  if (!provRes.error && provRes.data?.length) {
    provinces = provRes.data;
    universities = uniRes.data || [];
  } else {
    const settings = await getSettings();
    const campuses = getActiveCampuses(settings);
    universities = campuses.map((c) => ({
      id: c.id || c.shortName.toLowerCase(),
      code: c.shortName,
      name: c.name,
      province_id: c.provinceId || "sumatera-utara",
    }));
    provinces = [{ id: "sumatera-utara", name: "Sumatera Utara" }];
  }

  const actorProvinceIds = new Set(
    (actor.scopes || [])
      .filter((s) => s.scope_type === "province")
      .map((s) => String(s.scope_id || "").toLowerCase())
  );
  const actorCampusIds = new Set(
    (actor.scopes || [])
      .filter((s) => s.scope_type === "campus" || s.scope_type === "university")
      .map((s) => String(s.scope_id || "").toLowerCase())
  );

  const available = [];

  if (isSuper) {
    available.push({ id: "all", label: "Semua Kampus (Nasional)", type: "all" });
  }

  for (const prov of provinces) {
    if (isSuper || actorProvinceIds.has(prov.id.toLowerCase())) {
      available.push({
        id: `province:${prov.id}`,
        label: `Provinsi ${prov.name}`,
        type: "province",
      });
    }
  }

  for (const uni of universities) {
    const uniKey = (uni.id || "").toLowerCase();
    const uniCode = (uni.code || "").toLowerCase();
    const uniProvince = (uni.province_id || "").toLowerCase();

    if (
      isSuper ||
      actorProvinceIds.has(uniProvince) ||
      actorCampusIds.has(uniKey) ||
      actorCampusIds.has(uniCode)
    ) {
      available.push({
        id: `campus:${uni.id}`,
        label: `${uni.code || uni.name} · ${uni.name}`,
        type: "campus",
        provinceId: uni.province_id,
      });
    }
  }

  return NextResponse.json({
    activeScope,
    isSuperadmin: isSuper,
    availableScopes: available,
  });
}

export async function POST(request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Sesi admin tidak valid." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const requestedScope = String(body.scope || "all").trim().toLowerCase();

  const cookieStore = cookies();
  cookieStore.set(SCOPE_COOKIE, requestedScope, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });

  return NextResponse.json({ ok: true, activeScope: requestedScope });
}
