import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canonicalizeUrlOrigin } from "@/lib/admin-google-oauth";

export const dynamic = "force-dynamic";

function isSuperadmin(actor) { return actor?.role === "superadmin"; }
function provinceScopes(actor) {
  return [...new Set((actor?.scopes || []).filter((scope) => scope.scope_type === "province").map((scope) => String(scope.scope_id || "").toLowerCase()).filter(Boolean))];
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function findUserByEmail(admin, email) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Status akun Auth tidak dapat diperiksa.");
    const user = data?.users?.find((item) => String(item.email || "").toLowerCase() === normalized);
    if (user) return user;
    if (!data?.users || data.users.length < 1000) return null;
  }
  throw new Error("Akun tidak ditemukan dalam batas pencarian. Hubungi superadmin.");
}

export async function GET() {
  const actor = await getAdminActor();
  const superadmin = isSuperadmin(actor);
  const provinceIds = provinceScopes(actor);
  if (!actor || (!superadmin && !actor.roles?.some((role) => role.role_code === "province_admin"))) {
    return NextResponse.json({ error: "Halaman permintaan admin hanya untuk admin provinsi dan superadmin." }, { status: 403 });
  }
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: expiryError } = await admin.rpc("expire_university_admin_requests", {
    p_cutoff: cutoff, p_actor_id: actor.userId, p_province_ids: superadmin ? null : provinceIds,
  });
  if (expiryError) return NextResponse.json({ error: "Status kedaluwarsa tidak dapat diperbarui." }, { status: 503 });
  let requestsQuery = admin.from("university_admin_requests")
    .select("id,requested_by,province_id,university_id,requested_email,requested_name,note,status,reviewed_by,reviewed_at,review_note,invitation_sent_at,created_at,updated_at")
    .order("created_at", { ascending: false }).limit(500);
  let provinceQuery = admin.from("provinces").select("id,name,status").eq("status", "active").order("name");
  let universityQuery = admin.from("universities").select("id,code,name,province_id,status").eq("status", "active").order("name");
  if (!superadmin) {
    if (!provinceIds.length) return NextResponse.json({ error: "Akun ini belum memiliki cakupan provinsi." }, { status: 403 });
    requestsQuery = requestsQuery.in("province_id", provinceIds);
    provinceQuery = provinceQuery.in("id", provinceIds);
    universityQuery = universityQuery.in("province_id", provinceIds);
  }
  const [requests, provinces, universities] = await Promise.all([requestsQuery, provinceQuery, universityQuery]);
  if (requests.error || provinces.error || universities.error) return NextResponse.json({ error: "Data permintaan Admin Universitas belum tersedia. Terapkan migrasi nasional terlebih dahulu." }, { status: 503 });
  const requestedByIds = [...new Set((requests.data || []).map((item) => item.requested_by))];
  const names = new Map();
  for (const id of requestedByIds) {
    const { data } = await admin.from("admin_memberships").select("user_id,display_name").eq("user_id", id).maybeSingle();
    if (data) names.set(id, data.display_name || "Admin provinsi");
  }
  return NextResponse.json({
    isSuperadmin: superadmin,
    actorId: actor.userId,
    requests: (requests.data || []).map((item) => ({ ...item, requesterName: names.get(item.requested_by) || "Admin provinsi" })),
    provinces: provinces.data || [],
    universities: universities.data || [],
  });
}

export async function POST(request) {
  const actor = await getAdminActor();
  if (!actor || isSuperadmin(actor) || !actor.roles?.some((role) => role.role_code === "province_admin")) {
    return NextResponse.json({ error: "Pengajuan Admin Universitas dibuat oleh admin provinsi." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const provinceId = String(body.provinceId || "").trim().toLowerCase();
  const universityId = String(body.universityId || "").trim().toLowerCase();
  const requestedName = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const requestedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!provinceScopes(actor).includes(provinceId)) return NextResponse.json({ error: "Provinsi ini di luar cakupan akun Anda." }, { status: 403 });
  if (!requestedName || !validEmail(requestedEmail) || !universityId) return NextResponse.json({ error: "Nama, email, provinsi, dan universitas wajib diisi dengan benar." }, { status: 400 });
  const admin = getAdminClient();
  const { data: university, error: universityError } = await admin.from("universities")
    .select("id,province_id,status").eq("id", universityId).eq("province_id", provinceId).maybeSingle();
  if (universityError) return NextResponse.json({ error: "Katalog universitas belum tersedia." }, { status: 503 });
  if (!university || university.status !== "active") return NextResponse.json({ error: "Universitas tidak aktif atau bukan bagian dari provinsi tersebut." }, { status: 400 });
  const { data, error } = await admin.rpc("create_university_admin_request", {
    p_requester_id: actor.userId, p_province_id: provinceId, p_university_id: universityId,
    p_requested_email: requestedEmail, p_requested_name: requestedName, p_note: note,
  });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Masih ada permintaan aktif untuk universitas ini." : "Permintaan gagal disimpan." }, { status: error.code === "23505" ? 409 : 503 });
  return NextResponse.json({ ok: true, request: data });
}

export async function PATCH(request) {
  const actor = await getAdminActor();
  if (!isSuperadmin(actor)) return NextResponse.json({ error: "Hanya superadmin yang dapat memutuskan permintaan." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requestId = String(body.requestId || "");
  const decision = String(body.decision || "");
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "Keputusan permintaan tidak valid." }, { status: 400 });
  const admin = getAdminClient();
  const { data: application, error: applicationError } = await admin.from("university_admin_requests")
    .select("id,requested_by,requested_email,requested_name,university_id,status").eq("id", requestId).maybeSingle();
  if (applicationError) return NextResponse.json({ error: "Permintaan belum dapat dimuat." }, { status: 503 });
  if (!application || application.status !== "pending") return NextResponse.json({ error: "Permintaan sudah diproses atau tidak ditemukan." }, { status: 409 });
  if (application.requested_by === actor.userId) return NextResponse.json({ error: "Pemohon tidak dapat menyetujui permintaannya sendiri." }, { status: 403 });

  let authUser = null;
  let invitationSent = false;
  if (decision === "approved") {
    try { authUser = await findUserByEmail(admin, application.requested_email); }
    catch (error) { return NextResponse.json({ error: error.message }, { status: 503 }); }
    if (authUser?.banned_until && new Date(authUser.banned_until) > new Date()) return NextResponse.json({ error: "Akun Auth ini sedang dibatasi." }, { status: 409 });
    if (!authUser) {
      const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
      const origin = canonicalizeUrlOrigin(configuredOrigin);
      if (!origin || !/^https?:\/\//.test(origin)) return NextResponse.json({ error: "Alamat situs undangan belum dikonfigurasi dengan benar." }, { status: 503 });
      const { data, error } = await admin.auth.admin.inviteUserByEmail(application.requested_email, {
        data: { display_name: application.requested_name },
        redirectTo: `${origin}/auth/callback?admin_invite=1&next=%2Fadmin%2Foverview`,
      });
      if (error || !data?.user) return NextResponse.json({ error: "Undangan Auth gagal dikirim. Periksa konfigurasi email Supabase, lalu coba kembali." }, { status: 503 });
      authUser = data.user;
      invitationSent = true;
    }
  }
  const { error } = await admin.rpc("decide_university_admin_request", {
    p_request_id: requestId,
    p_reviewer_id: actor.userId,
    p_decision: decision,
    p_auth_user_id: authUser?.id || null,
    p_display_name: application.requested_name,
    p_invitation_sent: invitationSent,
    p_review_note: reviewNote,
  });
  if (error) return NextResponse.json({ error: "Keputusan belum tersimpan. Coba muat ulang; undangan yang sudah terkirim dapat diproses kembali tanpa mengirim undangan baru." }, { status: 503 });
  return NextResponse.json({ ok: true, decision, invitationSent });
}

export async function DELETE(request) {
  const actor = await getAdminActor();
  if (!actor || isSuperadmin(actor) || !actor.roles?.some((role) => role.role_code === "province_admin")) return NextResponse.json({ error: "Akses tidak diizinkan." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requestId = String(body.requestId || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ error: "ID permintaan tidak valid." }, { status: 400 });
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("cancel_university_admin_request", { p_request_id: requestId, p_requester_id: actor.userId });
  if (error) return NextResponse.json({ error: "Permintaan gagal dibatalkan." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Permintaan tidak ditemukan atau sudah diproses." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
