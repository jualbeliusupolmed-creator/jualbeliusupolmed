import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getAdminActor();
  if (!actor || (!hasAdminPermission(actor, "finance", "read") && actor.role !== "superadmin")) {
    return NextResponse.json({ error: "Akses modul keuangan ditolak." }, { status: 403 });
  }

  const supa = getAdminClient();

  const [settledPaymentsRes, pendingPaymentsRes, recentTransactionsRes] = await Promise.all([
    supa
      .from("payments")
      .select("id, amount, type, status, created_at")
      .in("status", ["settlement", "success", "paid"]),
    supa
      .from("payments")
      .select("id, amount, type, status, created_at, listing_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    supa
      .from("payments")
      .select("id, amount, type, status, created_at, order_id, listings(title, seller_wa, campus)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const settled = settledPaymentsRes.data || [];
  const pending = pendingPaymentsRes.data || [];
  const recent = recentTransactionsRes.data || [];

  // Hitung metrik keuangan & MDR (0.7% standard Bank Indonesia untuk QRIS)
  const totalGross = settled.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const estimatedGatewayMdr = Math.round(totalGross * 0.007);
  const netPlatformRevenue = totalGross - estimatedGatewayMdr;

  const totalPendingAmount = pending.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Perincian per tipe transaksi
  const byType = settled.reduce((acc, curr) => {
    const t = curr.type || "lainnya";
    if (!acc[t]) acc[t] = { count: 0, total: 0 };
    acc[t].count += 1;
    acc[t].total += Number(curr.amount) || 0;
    return acc;
  }, {});

  return NextResponse.json({
    metrics: {
      totalTransactions: settled.length,
      totalGross,
      estimatedGatewayMdr,
      netPlatformRevenue,
      pendingCount: pending.length,
      totalPendingAmount,
    },
    byType,
    recent,
    potentialLeakage: pending.slice(0, 15),
  });
}
