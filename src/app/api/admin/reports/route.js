import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["open", "resolved", "all"]);

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "reports", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const status = STATUSES.has(params.get("status")) ? params.get("status") : "open";
  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ items: [], campuses: [] });

  let query = supa.from("reports")
    .select("id,listing_id,reason,detail,status,created_at,listing:listings!inner(title,campus,status)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (actor.role !== "superadmin") query = query.in("listing.campus", campuses);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Daftar laporan belum dapat dimuat." }, { status: 503 });
  return NextResponse.json({ items: data || [], campuses });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "reports", "manage")) return NextResponse.json({ error: "Izin penanganan laporan tidak diberikan." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim().slice(0, 100);
  if (!id || body.action !== "resolve") return NextResponse.json({ error: "Aksi laporan tidak valid." }, { status: 400 });

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });
  let targetQuery = supa.from("reports").select("id,listing_id,listing:listings!inner(campus)").eq("id", id).eq("status", "open");
  if (actor.role !== "superadmin") targetQuery = targetQuery.in("listing.campus", campuses);
  const { data: target, error: targetError } = await targetQuery.maybeSingle();
  if (targetError) return NextResponse.json({ error: "Laporan belum dapat diperiksa." }, { status: 503 });
  if (!target) return NextResponse.json({ error: "Laporan terbuka tidak ditemukan dalam cakupan akun Anda." }, { status: 404 });

  const updateQuery = supa.from("reports").update({ status: "resolved" }).eq("id", id).eq("listing_id", target.listing_id).eq("status", "open");
  const { data, error } = await updateQuery.select("id,status").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Laporan berubah saat diproses. Segarkan daftar lalu coba kembali." }, { status: 409 });

  const campus = target.listing?.campus || "";
  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: "report_resolved", target_id: id, metadata: { campus } });
  return NextResponse.json({ ok: true, item: data });
}
