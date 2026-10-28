import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, getActiveCampuses } from "@/lib/settings";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODULE_ACTIONS = {
  marketplace: new Set(["read", "review", "manage"]),
  reports: new Set(["read", "manage"]),
  po: new Set(["read", "manage"]),
  users: new Set(["read", "manage"]),
  finance: new Set(["read"]),
  analytics: new Set(["read"]),
  content: new Set(["read", "review", "manage"]),
};

async function superadmin() {
  const actor = await getAdminActor();
  return actor?.role === "superadmin" ? actor : null;
}

async function findAuthUser(admin, account) {
  const value = String(account || "").trim();
  if (UUID.test(value)) {
    const { data, error } = await admin.auth.admin.getUserById(value);
    return error ? null : data?.user || null;
  }
  if (!value || value.length > 254 || !value.includes("@")) return null;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const match = data?.users?.find((user) => user.email?.toLowerCase() === value.toLowerCase());
    if (match) return match;
    if (!data?.users || data.users.length < 1000) break;
  }
  return null;
}

function normalizePermissions(input) {
  const result = { overview: ["read"] };
  for (const [module, allowed] of Object.entries(MODULE_ACTIONS)) {
    const values = Array.isArray(input?.[module]) ? input[module] : [];
    const valid = [...new Set(values.filter((value) => allowed.has(value)))];
    if (valid.includes("manage") || valid.includes("review")) {
      if (!valid.includes("read")) valid.push("read");
    }
    if (valid.length) result[module] = valid;
  }
  return result;
}

export async function GET() {
  const actor = await superadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const admin = getAdminClient();
  const [{ data: memberships, error }, settings] = await Promise.all([
    admin.from("admin_memberships").select("user_id, display_name, permissions, status, created_at, updated_at").order("created_at", { ascending: false }).limit(300),
    getSettings(),
  ]);
  if (error) return NextResponse.json({ error: "Data akses owner belum tersedia. Siapkan migrasi workspace terlebih dahulu." }, { status: 503 });

  const ownerIds = (memberships || []).map((membership) => membership.user_id);
  const [scopeResult, authResult] = await Promise.all([
    ownerIds.length
      ? admin.from("admin_scope_grants").select("user_id, scope_type, scope_id").in("user_id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length ? loadOwnerEmails(admin, ownerIds) : Promise.resolve(new Map()),
  ]);
  if (scopeResult.error) return NextResponse.json({ error: "Cakupan owner belum dapat dimuat." }, { status: 503 });

  const scopesByOwner = new Map();
  for (const scope of scopeResult.data || []) {
    const scopes = scopesByOwner.get(scope.user_id) || [];
    scopes.push({ scope_type: scope.scope_type, scope_id: scope.scope_id });
    scopesByOwner.set(scope.user_id, scopes);
  }
  const owners = (memberships || []).map((membership) => ({
    ...membership,
    email: authResult.get(membership.user_id) || "Akun Auth",
    scopes: scopesByOwner.get(membership.user_id) || [],
  }));

  const campuses = getActiveCampuses(settings).map((campus) => ({
    id: campus.id || campus.shortName.toLowerCase(),
    name: campus.name,
    shortName: campus.shortName,
    provinceId: campus.provinceId || campus.province_id || (["usu", "polmed"].includes(String(campus.shortName || "").toLowerCase()) || ["usu", "polmed"].includes(String(campus.id || "").toLowerCase()) ? "sumatera-utara" : ""),
  }));
  const provinces = [...new Map(campuses.filter((campus) => campus.provinceId).map((campus) => [campus.provinceId, { id: campus.provinceId, name: campus.provinceId.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }])).values()];
  return NextResponse.json({ owners, campuses, provinces });
}

async function loadOwnerEmails(admin, ownerIds) {
  const wanted = new Set(ownerIds);
  const emails = new Map();
  for (let page = 1; page <= 10 && emails.size < wanted.size; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const user of data?.users || []) {
      if (wanted.has(user.id)) emails.set(user.id, user.email || "");
    }
    if (!data?.users || data.users.length < 1000) break;
  }
  return emails;
}

export async function PUT(req) {
  const actor = await superadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  const scopesInput = Array.isArray(body.scopes) ? body.scopes.slice(0, 40) : [];
  if (!displayName) return NextResponse.json({ error: "Nama penanggung jawab wajib diisi." }, { status: 400 });

  const admin = getAdminClient();
  const user = await findAuthUser(admin, body.account);
  if (!user) return NextResponse.json({ error: "Akun Auth tidak ditemukan. Buat akun terlebih dahulu atau masukkan ID akun yang benar." }, { status: 404 });
  if (user.id.toLowerCase() === String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase()) {
    return NextResponse.json({ error: "Akun superadmin utama tidak dapat diubah sebagai owner." }, { status: 400 });
  }

  const settings = await getSettings();
  const campuses = getActiveCampuses(settings).map((campus) => ({
    id: campus.id || campus.shortName.toLowerCase(),
    shortName: campus.shortName,
    provinceId: campus.provinceId || campus.province_id || (["usu", "polmed"].includes(String(campus.shortName || "").toLowerCase()) || ["usu", "polmed"].includes(String(campus.id || "").toLowerCase()) ? "sumatera-utara" : ""),
  }));
  const provinces = new Set(campuses.map((campus) => campus.provinceId).filter(Boolean));
  const validScopes = [];
  for (const entry of scopesInput) {
    if (!entry || !["province", "campus"].includes(entry.type)) continue;
    const scopeId = String(entry.id || "").trim().toLowerCase();
    const valid = entry.type === "province"
      ? provinces.has(scopeId)
      : campuses.some((campus) => [campus.id, campus.shortName.toLowerCase()].includes(scopeId));
    if (valid && !validScopes.some((scope) => scope.scope_type === entry.type && scope.scope_id === scopeId)) {
      validScopes.push({ scope_type: entry.type, scope_id: scopeId });
    }
  }
  if (!validScopes.length) return NextResponse.json({ error: "Pilih sekurangnya satu provinsi atau kampus." }, { status: 400 });

  const permissions = normalizePermissions(body.permissions);
  const { error: saveError } = await admin.rpc("replace_admin_membership", {
    p_user_id: user.id,
    p_display_name: displayName,
    p_permissions: permissions,
    p_scopes: validScopes.map((scope) => ({ scope_type: scope.scope_type, scope_id: scope.scope_id })),
    p_actor_id: actor.userId,
  });
  if (saveError) return NextResponse.json({ error: "Gagal menyimpan akses owner. Pastikan migrasi workspace sudah diterapkan." }, { status: 500 });
  return NextResponse.json({ ok: true, userId: user.id });
}

export async function PATCH(req) {
  const actor = await superadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!UUID.test(String(body.userId || "")) || !["active", "suspended"].includes(body.status)) {
    return NextResponse.json({ error: "Perubahan status tidak valid." }, { status: 400 });
  }
  if (body.userId.toLowerCase() === String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase()) {
    return NextResponse.json({ error: "Status superadmin utama tidak dapat diubah dari sini." }, { status: 400 });
  }
  const admin = getAdminClient();
  const { data: updated, error } = await admin.from("admin_memberships")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("user_id", body.userId)
    .select("user_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Gagal memperbarui status owner." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Akses owner tidak ditemukan." }, { status: 404 });
  await admin.from("admin_audit_events").insert({ actor_id: actor.userId, action: `owner_${body.status}`, target_id: body.userId, metadata: {} });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const actor = await superadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const { userId } = await req.json().catch(() => ({}));
  if (!UUID.test(String(userId || "")) || userId.toLowerCase() === String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase()) {
    return NextResponse.json({ error: "Akun owner tidak valid." }, { status: 400 });
  }
  const admin = getAdminClient();
  const { data: removed, error } = await admin.from("admin_memberships").delete().eq("user_id", userId).select("user_id").maybeSingle();
  if (error) return NextResponse.json({ error: "Gagal mencabut akses owner." }, { status: 500 });
  if (!removed) return NextResponse.json({ error: "Akses owner tidak ditemukan." }, { status: 404 });
  await admin.from("admin_audit_events").insert({ actor_id: actor.userId, action: "owner_access_removed", target_id: userId, metadata: {} });
  return NextResponse.json({ ok: true });
}
