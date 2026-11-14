import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, invalidateSettingsCache } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

  const supa = getAdminClient();
  const settings = await getSettings();

  const [blacklistRes, listingsCountRes] = await Promise.all([
    supa.from("blacklist").select("id, wa, reason, created_at").order("created_at", { ascending: false }).limit(100),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return NextResponse.json({
    emergencyBanner: settings.emergencyBanner || {
      active: false,
      text: "",
      level: "warning",
      link: "",
    },
    platformLockdown: settings.platformLockdown || {
      active: false,
      message: "Platform sedang dalam pemeliharaan darurat. Transaksi sementara dibekukan.",
    },
    blacklist: blacklistRes.data || [],
    totalActiveListings: listingsCountRes.count || 0,
  });
}

export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor || actor.role !== "superadmin") {
    return NextResponse.json({ error: "Fitur pusat darurat hanya untuk Superadmin." }, { status: 403 });
  }

  const supa = getAdminClient();
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "update_banner") {
    const { active, text, level, link } = body;
    const emergencyBanner = {
      active: !!active,
      text: String(text || "").trim().slice(0, 300),
      level: ["info", "warning", "danger"].includes(level) ? level : "warning",
      link: String(link || "").trim().slice(0, 200),
      updated_at: new Date().toISOString(),
      updated_by: actor.email,
    };

    const { error } = await supa.from("app_settings").upsert({
      key: "emergencyBanner",
      value: emergencyBanner,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan banner darurat." }, { status: 500 });
    }

    invalidateSettingsCache();
    return NextResponse.json({ ok: true, emergencyBanner });
  }

  if (action === "toggle_lockdown") {
    const { active, message } = body;
    const platformLockdown = {
      active: !!active,
      message: String(message || "Platform sedang dalam pemeliharaan darurat.").trim().slice(0, 300),
      updated_at: new Date().toISOString(),
      updated_by: actor.email,
    };

    const { error } = await supa.from("app_settings").upsert({
      key: "platformLockdown",
      value: platformLockdown,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: "Gagal mengubah mode lockdown." }, { status: 500 });
    }

    invalidateSettingsCache();
    return NextResponse.json({ ok: true, platformLockdown });
  }

  if (action === "add_blacklist") {
    const wa = String(body.wa || "").replace(/\D/g, "");
    const reason = String(body.reason || "Terindikasi penipuan / pelanggaran ketentuan").trim().slice(0, 255);

    if (!wa || wa.length < 9) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    }

    const { data, error } = await supa.from("blacklist").upsert({
      wa,
      reason,
      created_at: new Date().toISOString(),
    }, { onConflict: "wa" }).select().maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Gagal menambahkan nomor ke daftar hitam." }, { status: 500 });
    }

    // Bekukan semua iklan aktif yang terhubung dengan nomor ini
    await supa.from("listings").update({ status: "suspended" }).eq("seller_wa", wa);

    return NextResponse.json({ ok: true, item: data });
  }

  if (action === "remove_blacklist") {
    const id = body.id;
    const wa = body.wa ? String(body.wa).replace(/\D/g, "") : null;

    let query = supa.from("blacklist").delete();
    if (id) {
      query = query.eq("id", id);
    } else if (wa) {
      query = query.eq("wa", wa);
    } else {
      return NextResponse.json({ error: "Parameter id atau wa dibutuhkan." }, { status: 400 });
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: "Gagal menghapus dari daftar hitam." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
}
