import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { approveWantedContactUnlock, updateAdminPayment } from "@/lib/admin-finance-actions";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "finance", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const allowedDays = new Set([7, 30, 90, 365]);
  const requestedDays = Number.parseInt(params.get("days") || "30", 10);
  const days = allowedDays.has(requestedDays) ? requestedDays : 30;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ payments: [], campuses: [], days, total: 0, summary: { paidAmount: 0, paidCount: 0 } });

  const listingSelection = actor.role === "superadmin" ? "listing:listings(title,campus)" : "listing:listings!inner(title,campus)";
  let query = supa.from("payments")
    .select(`id,midtrans_order_id,amount,type,status,meta,created_at,${listingSelection}`, { count: "exact" })
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);
  if (actor.role !== "superadmin") query = query.in("listing.campus", campuses);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Riwayat transaksi belum dapat dimuat." }, { status: 503 });
  const payments = (data || []).filter((payment) => actor.role === "superadmin" || campuses.includes(payment.listing?.campus));
  const paid = payments.filter((payment) => payment.status === "paid");
  return NextResponse.json({
    payments: payments.map((payment) => ({
      id: payment.id,
      midtrans_order_id: payment.midtrans_order_id,
      amount: Number(payment.amount) || 0,
      type: payment.type,
      status: payment.status,
      created_at: payment.created_at,
      listing: payment.listing,
      requiresUnlockApproval: !!(payment.meta?.unlock_wanted_id && payment.meta?.requester_wa),
    })),
    campuses: actor.role === "superadmin" ? [] : campuses,
    days,
    total: count || 0,
    summary: { paidAmount: paid.reduce((sum, payment) => sum + payment.amount, 0), paidCount: paid.length },
  });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  if (actor?.role !== "superadmin") return NextResponse.json({ error: "Aksi pembayaran hanya untuk superadmin." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const supa = getAdminClient();
  let result;

  if (body.action === "update_payment") {
    const paymentId = String(body.id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
    }
    result = await updateAdminPayment({ supa, paymentId, status: body.status, actorId: actor.userId, request: req });
  } else if (body.action === "approve_unlock_manual") {
    const paymentId = String(body.payment_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
    }
    result = await approveWantedContactUnlock({ supa, paymentId, actorId: actor.userId });
  } else {
    return NextResponse.json({ error: "Aksi pembayaran tidak valid." }, { status: 400 });
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ ok: true, warning: result.warning || null });
}
