import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { hashAdminUserAuditTarget } from "@/lib/admin-user-token";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const FIELDS = new Set(["name", "bio"]);
const maskPhone = (value) => `••••${String(value || "").slice(-4)}`;

function safeOffset(url) {
  const value = Number.parseInt(new URL(url).searchParams.get("offset") || "0", 10);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1_000_000_000) : 0;
}

export async function GET(request) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "users", "read")) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const status = ["pending", "approved", "rejected", "all"].includes(params.get("status")) ? params.get("status") : "pending";
  const offset = safeOffset(request.url);
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) {
    return NextResponse.json({ items: [], total: 0, nextOffset: null });
  }

  const supa = getAdminClient();
  let campusByPhone = new Map();
  if (actor.role !== "superadmin") {
    const { data: profiles, error: profileError } = await supa
      .from("seller_profiles")
      .select("wa,campus")
      .in("campus", campuses);
    if (profileError) return NextResponse.json({ error: "Cakupan permintaan profil belum dapat diperiksa." }, { status: 503 });
    campusByPhone = new Map((profiles || []).map((item) => [item.wa, item.campus || ""]));
    if (!campusByPhone.size) return NextResponse.json({ items: [], total: 0, nextOffset: null });
  }

  let query = supa.from("profile_change_requests")
    .select("id,seller_wa,field,current_value,requested_value,status,requested_via,requested_at,reviewed_at,review_note", { count: "exact" })
    .order("requested_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (actor.role !== "superadmin") query = query.in("seller_wa", [...campusByPhone.keys()]);
  const { data: requests, count, error } = await query;
  if (error) return NextResponse.json({ error: "Permintaan perubahan profil belum dapat dimuat." }, { status: 503 });

  const phones = [...new Set((requests || []).map((item) => item.seller_wa).filter(Boolean))];
  if (phones.length && actor.role === "superadmin") {
    const { data: profiles, error: profileError } = await supa.from("seller_profiles").select("wa,campus").in("wa", phones);
    if (profileError) return NextResponse.json({ error: "Cakupan permintaan profil belum dapat diperiksa." }, { status: 503 });
    campusByPhone = new Map((profiles || []).map((item) => [item.wa, item.campus || ""]));
  }

  const visible = requests || [];
  const items = visible.map((item) => ({
    id: item.id,
    field: FIELDS.has(item.field) ? item.field : "other",
    currentValue: item.current_value || "",
    requestedValue: item.requested_value || "",
    status: item.status,
    requestedVia: item.requested_via || "",
    requestedAt: item.requested_at || null,
    reviewedAt: item.reviewed_at || null,
    reviewNote: item.review_note || "",
    campus: campusByPhone.get(item.seller_wa) || "",
    maskedPhone: maskPhone(item.seller_wa),
  }));
  const total = count || 0;
  return NextResponse.json({ items, total, nextOffset: items.length === PAGE_SIZE && offset + PAGE_SIZE < total ? offset + PAGE_SIZE : null });
}

export async function PATCH(request) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "users", "manage")) {
    return NextResponse.json({ error: "Izin pengelolaan pengguna tidak diberikan." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const action = body.action;
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Aksi permintaan profil tidak valid." }, { status: 400 });
  }
  const note = String(body.note || "").trim().slice(0, 300);
  if (action === "reject" && !note) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
  }

  const supa = getAdminClient();
  const { data: changeRequest, error: requestError } = await supa.from("profile_change_requests")
    .select("id,seller_wa,field,requested_value,status")
    .eq("id", id).eq("status", "pending").maybeSingle();
  if (requestError) return NextResponse.json({ error: "Permintaan profil belum dapat diperiksa." }, { status: 503 });
  if (!changeRequest) return NextResponse.json({ error: "Permintaan tidak ditemukan atau sudah diproses." }, { status: 404 });
  if (!FIELDS.has(changeRequest.field)) return NextResponse.json({ error: "Jenis perubahan profil tidak didukung." }, { status: 400 });

  const campuses = await getAdminCampusScope(actor);
  let profileQuery = supa.from("seller_profiles").select("wa,campus").eq("wa", changeRequest.seller_wa);
  if (actor.role !== "superadmin") {
    if (!campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });
    profileQuery = profileQuery.in("campus", campuses);
  }
  const { data: profile, error: profileError } = await profileQuery.maybeSingle();
  if (profileError) return NextResponse.json({ error: "Cakupan akun belum dapat diperiksa." }, { status: 503 });
  if (!profile) return NextResponse.json({ error: "Permintaan tidak ditemukan dalam cakupan Anda." }, { status: 404 });

  if (action === "approve") {
    const { error } = await supa.from("seller_profiles")
      .update({ [changeRequest.field]: changeRequest.requested_value })
      .eq("wa", changeRequest.seller_wa);
    if (error) return NextResponse.json({ error: "Profil penjual gagal diperbarui." }, { status: 503 });
    if (changeRequest.field === "name") {
      const { error: listingError } = await supa.from("listings")
        .update({ seller_name: changeRequest.requested_value })
        .eq("seller_wa", changeRequest.seller_wa)
        .in("status", ["active", "pending"]);
      if (listingError) return NextResponse.json({ error: "Nama profil berubah, tetapi nama pada iklan belum dapat diselaraskan." }, { status: 503 });
    }
  }

  const nextStatus = action === "approve" ? "approved" : "rejected";
  const { data: updatedRequest, error: updateError } = await supa.from("profile_change_requests")
    .update({ status: nextStatus, reviewed_at: new Date().toISOString(), review_note: action === "reject" ? note : null })
    .eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (updateError || !updatedRequest) return NextResponse.json({ error: "Permintaan berubah saat diproses. Muat ulang daftar." }, { status: 409 });

  const fieldLabel = changeRequest.field === "name" ? "nama" : "bio";
  const message = action === "approve"
    ? `Permintaan perubahan ${fieldLabel} profil Anda disetujui. Perubahan sudah berlaku di profil publik Anda.`
    : `Permintaan perubahan ${fieldLabel} profil Anda ditolak.\n\nAlasan: ${note}\n\nHubungi admin jika ada pertanyaan.`;
  await sendWa(changeRequest.seller_wa, message).catch(() => {});
  await supa.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: action === "approve" ? "profile_change_approved" : "profile_change_rejected",
    target_id: hashAdminUserAuditTarget(changeRequest.seller_wa),
    metadata: { field: changeRequest.field, campus: profile.campus || "", note: action === "reject" ? note : "" },
  });
  return NextResponse.json({ ok: true });
}
