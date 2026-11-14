import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, invalidateSettingsCache } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getAdminActor();
  if (!actor || (!hasAdminPermission(actor, "finance", "read") && actor.role !== "superadmin")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const settings = await getSettings();
  const vouchers = Array.isArray(settings.vouchers) ? settings.vouchers : [];

  return NextResponse.json({ vouchers });
}

export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor || (!hasAdminPermission(actor, "finance", "manage") && actor.role !== "superadmin")) {
    return NextResponse.json({ error: "Akses pengelolaan voucher ditolak." }, { status: 403 });
  }

  const supa = getAdminClient();
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  const settings = await getSettings();
  let vouchers = Array.isArray(settings.vouchers) ? [...settings.vouchers] : [];

  if (action === "create") {
    const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code || code.length < 3) {
      return NextResponse.json({ error: "Kode voucher minimal 3 karakter alfanumerik." }, { status: 400 });
    }

    if (vouchers.some((v) => v.code === code)) {
      return NextResponse.json({ error: "Kode voucher sudah ada." }, { status: 400 });
    }

    const newVoucher = {
      id: "v_" + Date.now().toString(36),
      code,
      discountType: body.discountType === "fixed" ? "fixed" : "percentage",
      discountValue: Math.max(0, parseInt(body.discountValue, 10) || 0),
      campus: String(body.campus || "ALL").trim(),
      maxUsage: Math.max(1, parseInt(body.maxUsage, 10) || 100),
      usageCount: 0,
      validUntil: body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
      active: true,
      created_at: new Date().toISOString(),
      created_by: actor.email,
    };

    vouchers.unshift(newVoucher);

    const { error } = await supa.from("app_settings").upsert({
      key: "vouchers",
      value: vouchers,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan voucher." }, { status: 500 });
    }

    invalidateSettingsCache();
    return NextResponse.json({ ok: true, voucher: newVoucher });
  }

  if (action === "delete") {
    const { id, code } = body;
    vouchers = vouchers.filter((v) => v.id !== id && v.code !== code);

    const { error } = await supa.from("app_settings").upsert({
      key: "vouchers",
      value: vouchers,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: "Gagal menghapus voucher." }, { status: 500 });
    }

    invalidateSettingsCache();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
}
