import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { hashAdminUserAuditTarget, openAdminUserToken, sealAdminUserToken } from "@/lib/admin-user-token";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "users", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ items: [], campuses: [], total: 0, nextOffset: null });

  const params = new URL(req.url).searchParams;
  const requestedOffset = Number.parseInt(params.get("offset") || "0", 10);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? Math.min(requestedOffset, 1_000_000_000) : 0;
  const pageSize = 100;
  let query = supa.from("seller_profiles")
    .select("wa,name,campus,faculty,created_at,trusted_seller,subscription_tier,store_name,store_status,student_verification_status", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (actor.role !== "superadmin") query = query.in("campus", campuses);
  const { data: profiles, count, error } = await query;
  if (error) return NextResponse.json({ error: "Daftar pengguna belum dapat dimuat." }, { status: 503 });

  const numbers = (profiles || []).map((profile) => profile.wa).filter(Boolean);
  const [{ data: blocked, error: blockedError }, { data: listings, count: listingRowsCount, error: listingsError }] = await Promise.all([
    numbers.length ? supa.from("blacklist").select("wa,reason").in("wa", numbers) : Promise.resolve({ data: [], error: null }),
    numbers.length ? supa.from("listings").select("seller_wa,status", { count: "exact" }).in("seller_wa", numbers).range(0, 1999) : Promise.resolve({ data: [], count: 0, error: null }),
  ]);
  if (blockedError || listingsError) return NextResponse.json({ error: "Ringkasan akun belum dapat dimuat." }, { status: 503 });

  const blockedByWa = new Map((blocked || []).map((item) => [item.wa, item.reason || ""]));
  const listingsByWa = new Map();
  for (const listing of listings || []) {
    const summary = listingsByWa.get(listing.seller_wa) || { total: 0, active: 0 };
    summary.total += 1;
    if (listing.status === "active") summary.active += 1;
    listingsByWa.set(listing.seller_wa, summary);
  }

  const items = (profiles || []).map((profile) => ({
    id: sealAdminUserToken(profile.wa),
    name: profile.name || profile.store_name || "Pengguna",
    maskedPhone: "••••" + String(profile.wa || "").slice(-4),
    campus: profile.campus || "Belum diatur",
    faculty: profile.faculty || "",
    createdAt: profile.created_at,
    trustedSeller: !!profile.trusted_seller,
    subscriptionTier: profile.subscription_tier || "free",
    storeName: profile.store_name || "",
    storeStatus: profile.store_status || "",
    studentVerification: profile.student_verification_status || "",
    restricted: blockedByWa.has(profile.wa),
    restrictionReason: blockedByWa.get(profile.wa) || "",
    listings: listingsByWa.get(profile.wa) || { total: 0, active: 0 },
  }));
  const nextOffset = count > offset + items.length ? offset + items.length : null;
  return NextResponse.json({ items, campuses: actor.role === "superadmin" ? [] : campuses, total: count || 0, nextOffset, listingSummaryTruncated: (listingRowsCount || 0) > (listings || []).length });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "users", "manage")) return NextResponse.json({ error: "Izin pengelolaan pengguna tidak diberikan." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!["restrict", "restore"].includes(body.action)) return NextResponse.json({ error: "Aksi pengguna tidak valid." }, { status: 400 });

  let wa;
  try { wa = openAdminUserToken(body.userToken); }
  catch { return NextResponse.json({ error: "Identitas akun tidak berlaku lagi. Muat ulang daftar pengguna." }, { status: 400 }); }

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  let profileQuery = supa.from("seller_profiles").select("wa,campus").eq("wa", wa);
  if (actor.role !== "superadmin") profileQuery = profileQuery.in("campus", campuses || []);
  const { data: profile, error: profileError } = await profileQuery.maybeSingle();
  if (profileError) return NextResponse.json({ error: "Akun belum dapat diperiksa." }, { status: 503 });
  if (!profile) return NextResponse.json({ error: "Akun tidak ditemukan dalam cakupan Anda." }, { status: 404 });

  if (body.action === "restrict") {
    const reason = String(body.reason || "").trim().slice(0, 300);
    if (!reason) return NextResponse.json({ error: "Alasan pembatasan wajib diisi." }, { status: 400 });
    const { error } = await supa.from("blacklist").upsert({ wa, reason }, { onConflict: "wa" });
    if (error) return NextResponse.json({ error: "Pembatasan akun gagal disimpan." }, { status: 503 });
  } else {
    const { error } = await supa.from("blacklist").delete().eq("wa", wa);
    if (error) return NextResponse.json({ error: "Pembatasan akun gagal dihapus." }, { status: 503 });
  }

  const targetId = hashAdminUserAuditTarget(wa);
  await supa.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: body.action === "restrict" ? "user_restricted" : "user_restriction_removed",
    target_id: targetId,
    metadata: { campus: profile.campus || "" },
  });
  return NextResponse.json({ ok: true });
}
