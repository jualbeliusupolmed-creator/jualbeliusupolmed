import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function currentWa() {
  return formatWa(getSellerSession() || "");
}

export async function GET() {
  const wa = currentWa();
  if (!wa) return NextResponse.json({ error: "Sesi JB berakhir." }, { status: 401 });
  const supa = getAdminClient();
  const [profileRes, batchesRes, outgoingRes] = await Promise.all([
    supa.from("seller_profiles").select("name,campus,faculty").eq("wa", wa).maybeSingle(),
    supa.from("open_po_batches").select("id,title,price_idr,quota,reserved_count,closes_at,pickup_point,pickup_note,status,created_at,product:open_po_products(name,description,category,unit,image_url,campus)").eq("seller_wa", wa).order("created_at", { ascending: false }).limit(100),
    supa.from("open_po_orders").select("id,buyer_name,quantity,unit_price_idr,total_idr,status,created_at,batch:open_po_batches!inner(id,title,pickup_point,seller_wa,product:open_po_products(name,campus,seller_contact_consent))").eq("buyer_wa", wa).order("created_at", { ascending: false }).limit(100),
  ]);
  if (profileRes.error || batchesRes.error || outgoingRes.error) {
    return NextResponse.json({ error: "Data Open PO belum dapat dimuat. Pastikan migrasi sudah diterapkan." }, { status: 503 });
  }

  const batchIds = (batchesRes.data || []).map((batch) => batch.id);
  let incoming = [];
  if (batchIds.length) {
    const { data, error } = await supa.from("open_po_orders")
      .select("id,buyer_wa,buyer_name,buyer_contact_consent,quantity,unit_price_idr,total_idr,status,created_at,batch:open_po_batches(id,title,pickup_point,product:open_po_products(name,campus))")
      .in("batch_id", batchIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: "Pesanan masuk belum dapat dimuat." }, { status: 503 });
    incoming = (data || []).map((order) => ({ ...order, buyer_wa: order.buyer_contact_consent ? order.buyer_wa : null }));
  }
  const outgoing = (outgoingRes.data || []).map((order) => {
    const batch = order.batch || {};
    const product = batch.product || {};
    return {
      id: order.id,
      buyer_name: order.buyer_name,
      quantity: order.quantity,
      unit_price_idr: order.unit_price_idr,
      total_idr: order.total_idr,
      status: order.status,
      created_at: order.created_at,
      seller_wa: product.seller_contact_consent ? batch.seller_wa : null,
      batch: {
        id: batch.id,
        title: batch.title,
        pickup_point: batch.pickup_point,
        product: { name: product.name, campus: product.campus },
      },
    };
  });
  return NextResponse.json({
    profile: profileRes.data || null,
    batches: batchesRes.data || [],
    incoming,
    outgoing,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req) {
  const wa = currentWa();
  if (!wa) return NextResponse.json({ error: "Sesi JB berakhir." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id || !["open", "closed"].includes(body.status)) return NextResponse.json({ error: "Perubahan status batch tidak valid." }, { status: 400 });
  const supa = getAdminClient();
  const { data: batch, error: findError } = await supa.from("open_po_batches").select("id,status,closes_at,quota,reserved_count").eq("id", id).eq("seller_wa", wa).maybeSingle();
  if (findError || !batch) return NextResponse.json({ error: "Batch tidak ditemukan pada akun Anda." }, { status: 404 });
  if (body.status === "open" && (new Date(batch.closes_at) <= new Date() || batch.reserved_count >= batch.quota)) {
    return NextResponse.json({ error: "Batch yang lewat waktu atau kuotanya penuh tidak dapat dibuka kembali." }, { status: 400 });
  }
  const { data, error } = await supa.from("open_po_batches").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).eq("seller_wa", wa).select("id,status").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Status batch gagal diperbarui." }, { status: 500 });
  return NextResponse.json({ ok: true, batch: data });
}
