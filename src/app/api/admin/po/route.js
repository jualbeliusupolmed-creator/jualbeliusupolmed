import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "po", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ batches: [], campuses: [] });

  const supa = getAdminClient();
  let query = supa.from("open_po_batches")
    .select("id,title,price_idr,quota,reserved_count,closes_at,pickup_point,status,created_at,product:open_po_products(name,category,unit,campus)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (actor.role !== "superadmin") query = query.in("product.campus", campuses);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Data batch PO belum dapat dimuat. Pastikan migrasi sudah diterapkan." }, { status: 503 });

  const batches = (data || []).filter((batch) => actor.role === "superadmin" || campuses.includes(batch.product?.campus));
  const ids = batches.map((batch) => batch.id);
  let orderCounts = {};
  if (ids.length) {
    const { data: orders, error: orderError } = await supa.from("open_po_batch_order_summary").select("batch_id,total,pending,confirmed,fulfilled,cancelled").in("batch_id", ids);
    if (orderError) return NextResponse.json({ error: "Ringkasan pesanan PO gagal dimuat." }, { status: 503 });
    orderCounts = Object.fromEntries((orders || []).map((order) => [order.batch_id, order]));
  }
  return NextResponse.json({ batches: batches.map((batch) => ({ ...batch, orders: orderCounts[batch.id] || { total: 0, pending: 0, confirmed: 0, fulfilled: 0, cancelled: 0 } })), campuses });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "po", "manage")) return NextResponse.json({ error: "Izin pengelolaan PO tidak diberikan." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id || !["open", "closed"].includes(body.status)) return NextResponse.json({ error: "Perubahan batch tidak valid." }, { status: 400 });
  const supa = getAdminClient();
  const { data: batch, error: findError } = await supa.from("open_po_batches").select("id,status,closes_at,quota,reserved_count,product:open_po_products(campus)").eq("id", id).maybeSingle();
  if (findError || !batch) return NextResponse.json({ error: "Batch tidak ditemukan." }, { status: 404 });
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.includes(batch.product?.campus)) return NextResponse.json({ error: "Batch berada di luar cakupan akun." }, { status: 403 });
  if (body.status === "open" && (new Date(batch.closes_at) <= new Date() || batch.reserved_count >= batch.quota)) return NextResponse.json({ error: "Batch lewat waktu atau penuh tidak dapat dibuka kembali." }, { status: 400 });

  const { data, error } = await supa.from("open_po_batches").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Status batch gagal diperbarui." }, { status: 500 });
  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: `po_batch_${body.status}`, target_id: id, metadata: { campus: batch.product?.campus } });
  return NextResponse.json({ ok: true, batch: data });
}
