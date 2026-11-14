import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

const ROLE_CODES = new Set(["superadmin", "province_admin", "university_admin"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSuperadmin() {
  const actor = await getAdminActor();
  if (!actor || actor.role !== "superadmin") return null;
  return actor;
}

async function loadUserEmails(admin, userIds) {
  const wanted = new Set(userIds);
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

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireSuperadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const admin = getAdminClient();
  const { data: assignments, error } = await admin
    .from("admin_role_assignments")
    .select("id, user_id, role_code, province_id, university_id, status, assigned_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Daftar role admin belum dapat dimuat." }, { status: 503 });

  const userIds = [...new Set((assignments || []).map((a) => a.user_id))];
  const emails = await loadUserEmails(admin, userIds);

  const items = (assignments || []).map((a) => ({
    id: a.id,
    userId: a.user_id,
    email: emails.get(a.user_id) || "Akun Auth",
    roleCode: a.role_code,
    provinceId: a.province_id,
    universityId: a.university_id,
    status: a.status,
    assignedBy: a.assigned_by,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req) {
  const actor = await requireSuperadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, email, roleCode, provinceId, universityId } = body;
  let targetUserId = String(userId || "").trim();
  const inputEmail = String(email || "").trim().toLowerCase();

  const admin = getAdminClient();

  if (!targetUserId && inputEmail) {
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      const found = (data?.users || []).find((u) => u.email?.toLowerCase() === inputEmail);
      if (found) {
        targetUserId = found.id;
        break;
      }
      if (!data?.users || data.users.length < 1000) break;
    }
    if (!targetUserId) {
      return NextResponse.json({ error: `Pengguna dengan email ${inputEmail} tidak ditemukan di sistem Auth.` }, { status: 404 });
    }
  }

  if (!UUID.test(String(targetUserId || ""))) return NextResponse.json({ error: "userId atau email tidak valid." }, { status: 400 });
  if (!ROLE_CODES.has(roleCode)) return NextResponse.json({ error: "role_code harus superadmin, province_admin, atau university_admin." }, { status: 400 });

  if (roleCode === "province_admin" && (!provinceId || typeof provinceId !== "string")) {
    return NextResponse.json({ error: "province_id wajib diisi untuk role province_admin." }, { status: 400 });
  }
  if (roleCode === "university_admin" && (!universityId || typeof universityId !== "string")) {
    return NextResponse.json({ error: "university_id wajib diisi untuk role university_admin." }, { status: 400 });
  }

  // Cek user ada di Auth jika targetUserId diberikan langsung
  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(targetUserId);
  if (authError || !authUser?.user) return NextResponse.json({ error: "Akun Auth tidak ditemukan." }, { status: 404 });

  const { data: inserted, error: insertError } = await admin
    .from("admin_role_assignments")
    .insert({
      user_id: targetUserId,
      role_code: roleCode,
      province_id: roleCode === "province_admin" ? provinceId : null,
      university_id: roleCode === "university_admin" ? universityId : null,
      status: "active",
      assigned_by: actor.userId,
    })
    .select()
    .maybeSingle();

  if (insertError) {
    if (/unique/.test(insertError.message || "")) {
      return NextResponse.json({ error: "Role sudah diberikan kepada pengguna ini." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal memberikan role." }, { status: 500 });
  }

  await admin.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: "admin_role_assigned",
    target_id: userId,
    metadata: { role_code: roleCode, province_id: provinceId || null, university_id: universityId || null },
  });

  return NextResponse.json({ ok: true, assignment: inserted });
}

export async function PATCH(req) {
  const actor = await requireSuperadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { id, status } = body;

  if (!UUID.test(String(id || ""))) return NextResponse.json({ error: "ID role tidak valid." }, { status: 400 });
  if (!["active", "suspended"].includes(status)) return NextResponse.json({ error: "Status harus active atau suspended." }, { status: 400 });

  const admin = getAdminClient();
  const { data: updated, error } = await admin
    .from("admin_role_assignments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Gagal memperbarui role." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Role assignment tidak ditemukan." }, { status: 404 });

  await admin.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: `admin_role_${status}`,
    target_id: updated.user_id,
    metadata: { role_code: updated.role_code, status },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const actor = await requireSuperadmin();
  if (!actor) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  if (!UUID.test(String(id || ""))) return NextResponse.json({ error: "ID role tidak valid." }, { status: 400 });

  const admin = getAdminClient();
  const { data: removed, error } = await admin
    .from("admin_role_assignments")
    .delete()
    .eq("id", id)
    .select("user_id, role_code")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Gagal mencabut role." }, { status: 500 });
  if (!removed) return NextResponse.json({ error: "Role assignment tidak ditemukan." }, { status: 404 });

  await admin.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: "admin_role_removed",
    target_id: removed.user_id,
    metadata: { role_code: removed.role_code },
  });

  return NextResponse.json({ ok: true });
}
