import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { openAdminUserToken, sealAdminUserToken, hashAdminUserAuditTarget } from "@/lib/admin-user-token";
import { formatWa } from "@/lib/constants";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STORE_STATUSES = new Set(["menunggu", "aktif", "ditolak", "all"]);
const maskPhone = (value) => `••••${String(value || "").slice(-4)}`;

function offsetFrom(url) {
  const value = Number.parseInt(new URL(url).searchParams.get("offset") || "0", 10);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1_000_000_000) : 0;
}

export async function GET(request) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "marketplace", "read")) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const status = STORE_STATUSES.has(params.get("status")) ? params.get("status") : "menunggu";
  const offset = offsetFrom(request.url);
  const q = String(params.get("q") || "").trim().slice(0, 80).replace(/[%_,]/g, " ");
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) {
    return NextResponse.json({ items: [], total: 0, nextOffset: null });
  }

  let query = getAdminClient().from("seller_profiles")
    .select("wa,name,slug,store_name,store_area,store_hours,store_status,store_requested_at,store_reject_note,bio,campus", { count: "exact" })
    .order("store_requested_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + 99);
  if (status !== "all") query = query.eq("store_status", status);
  if (q) query = query.ilike("store_name", `%${q}%`);
  if (actor.role !== "superadmin") query = query.in("campus", campuses);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Daftar toko belum dapat dimuat." }, { status: 503 });
  const items = (data || []).map((profile) => ({
    storeToken: sealAdminUserToken(formatWa(profile.wa) || profile.wa),
    name: profile.name || "Pengguna",
    storeName: profile.store_name || profile.name || "Toko",
    slug: profile.slug || "",
    area: profile.store_area || "",
    hours: profile.store_hours || "",
    status: profile.store_status || "draf",
    requestedAt: profile.store_requested_at || null,
    rejectNote: profile.store_reject_note || "",
    bio: profile.bio || "",
    campus: profile.campus || "",
    maskedPhone: maskPhone(profile.wa),
  }));
  const total = count || 0;
  return NextResponse.json({ items, total, nextOffset: total > offset + items.length ? offset + items.length : null });
}

export async function PATCH(request) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "marketplace", "review")) {
    return NextResponse.json({ error: "Izin review toko tidak diberikan." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Aksi toko tidak valid." }, { status: 400 });
  }
  const reason = String(body.reason || "").trim().slice(0, 300);
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
  }

  let wa;
  try { wa = openAdminUserToken(body.storeToken); }
  catch { return NextResponse.json({ error: "Identitas toko tidak berlaku lagi. Muat ulang daftar." }, { status: 400 }); }
  wa = formatWa(wa) || wa;

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  let targetQuery = supa.from("seller_profiles")
    .select("wa,name,slug,store_name,campus,store_status")
    .eq("wa", wa)
    .eq("store_status", "menunggu");
  if (actor.role !== "superadmin") {
    if (!campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });
    targetQuery = targetQuery.in("campus", campuses);
  }
  const { data: profile, error: targetError } = await targetQuery.maybeSingle();
  if (targetError) return NextResponse.json({ error: "Data toko belum dapat diperiksa." }, { status: 503 });
  if (!profile) return NextResponse.json({ error: "Toko tidak ditemukan dalam cakupan atau sudah diproses." }, { status: 404 });
  if (action === "approve" && !profile.slug) {
    return NextResponse.json({ error: "Toko belum memiliki alamat publik." }, { status: 400 });
  }

  const change = action === "approve"
    ? { store_status: "aktif", store_approved_at: new Date().toISOString(), store_reject_note: null }
    : { store_status: "ditolak", store_reject_note: reason };
  const { data: updated, error } = await supa.from("seller_profiles")
    .update(change).eq("wa", wa).eq("store_status", "menunggu").select("wa").maybeSingle();
  if (error || !updated) return NextResponse.json({ error: "Status toko berubah saat diproses. Muat ulang daftar." }, { status: 409 });

  const storeName = profile.store_name || profile.name || "Tokomu";
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").replace(/\/$/, "");
  const message = action === "approve"
    ? `*Toko kamu sudah aktif!*\n\n*${storeName}* sekarang bisa dibuka di:\n${baseUrl}/toko/${profile.slug}\n\nMulai sekarang iklanmu tayang gratis. Bagikan alamat tokomu ke pembeli ya!`
    : `*Pengajuan toko belum bisa disetujui.*\n\nToko *${storeName}* belum kami aktifkan.\n\nAlasan: _${reason}_\n\nPerbaiki di ${baseUrl}/dashboard/toko, lalu ajukan kembali.`;
  await sendWa(wa, message, null, null, { jenis: action === "approve" ? "toko_aktif" : "toko_ditolak" }).catch(() => {});
  await supa.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: action === "approve" ? "store_approved" : "store_rejected",
    target_id: hashAdminUserAuditTarget(wa),
    metadata: { campus: profile.campus || "", reason: action === "reject" ? reason : "" },
  });
  return NextResponse.json({ ok: true });
}
