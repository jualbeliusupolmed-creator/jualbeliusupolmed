import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function isSuperadmin(actor) {
  return actor?.role === "superadmin";
}

function safeUrl(value, label) {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") throw new Error("invalid");
    return url.toString();
  } catch {
    throw new Error(label + " harus berupa alamat HTTPS yang valid.");
  }
}

function safeText(value, max, label) {
  if (typeof value !== "string") throw new Error(label + " harus berupa teks.");
  return value.trim().slice(0, max);
}

export async function GET() {
  const actor = await getAdminActor();
  if (!isSuperadmin(actor)) return NextResponse.json({ error: "Pengaturan platform hanya untuk superadmin." }, { status: 403 });
  const settings = await getSettings();
  return NextResponse.json({
    site: {
      heroTitle: settings.site?.heroTitle || "",
      heroSubtitle: settings.site?.heroSubtitle || "",
      footerTagline: settings.site?.footerTagline || "",
      metaTitle: settings.site?.metaTitle || "",
      metaDescription: settings.site?.metaDescription || "",
      logoUrl: settings.site?.logoUrl || "",
      faviconUrl: settings.site?.faviconUrl || "",
    },
    pricing: {
      freeMode: !!settings.pricing?.freeMode,
      listingDays: Number(settings.pricing?.listingDays) || 14,
      adBarang: Number(settings.pricing?.adBarang) || 0,
      adPoster: Number(settings.pricing?.adPoster) || 0,
      bump: Number(settings.pricing?.bump) || 0,
      featuredPerDay: Number(settings.pricing?.featuredPerDay) || 0,
      featuredMaxPerDay: Number(settings.pricing?.featuredMaxPerDay) || 0,
      renewalFee: Number(settings.pricing?.renewalFee) || 0,
      proMonthly: Number(settings.pricing?.proMonthly) || 0,
    },
    areas: Array.isArray(settings.areas) ? settings.areas : [],
    campuses: (Array.isArray(settings.campuses) ? settings.campuses : []).map((campus) => ({
      id: campus.id || String(campus.shortName || "").toLowerCase(),
      name: campus.name || "",
      shortName: campus.shortName || "",
      provinceId: campus.provinceId || campus.province_id || "",
      active: campus.active !== false,
      emailDomains: Array.isArray(campus.emailDomains) ? campus.emailDomains : [],
    })),
  });
}

export async function PUT(req) {
  const actor = await getAdminActor();
  if (!isSuperadmin(actor)) return NextResponse.json({ error: "Pengaturan platform hanya untuk superadmin." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const current = await getSettings();
  const rows = [];
  try {
    if (body.site && typeof body.site === "object") {
      const site = { ...current.site };
      const textFields = { heroTitle: 160, heroSubtitle: 300, footerTagline: 300, metaTitle: 160, metaDescription: 320 };
      for (const [key, max] of Object.entries(textFields)) {
        if (body.site[key] !== undefined) site[key] = safeText(body.site[key], max, key);
      }
      if (body.site.logoUrl !== undefined) site.logoUrl = safeUrl(body.site.logoUrl, "Logo");
      if (body.site.faviconUrl !== undefined) site.faviconUrl = safeUrl(body.site.faviconUrl, "Favicon");
      rows.push({ key: "site", value: site, updated_at: new Date().toISOString() });
    }
    if (body.pricing && typeof body.pricing === "object") {
      const pricing = { ...current.pricing };
      if (body.pricing.freeMode !== undefined) {
        if (typeof body.pricing.freeMode !== "boolean") throw new Error("Mode gratis harus berupa pilihan aktif atau nonaktif.");
        pricing.freeMode = body.pricing.freeMode;
      }
      const moneyKeys = ["adBarang", "adPoster", "bump", "featuredPerDay", "featuredMaxPerDay", "renewalFee", "proMonthly"];
      for (const key of moneyKeys) {
        if (body.pricing[key] === undefined) continue;
        const amount = Number(body.pricing[key]);
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000) throw new Error("Nilai biaya harus bilangan bulat antara 0 dan 100.000.000.");
        pricing[key] = amount;
      }
      if (body.pricing.listingDays !== undefined) {
        const days = Number(body.pricing.listingDays);
        if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("Masa tayang harus antara 1 dan 365 hari.");
        pricing.listingDays = days;
      }
      rows.push({ key: "pricing", value: pricing, updated_at: new Date().toISOString() });
    }
    if (body.areas !== undefined) {
      if (!Array.isArray(body.areas) || body.areas.length > 60) throw new Error("Daftar area tidak valid.");
      const areas = [...new Set(body.areas.map((value) => safeText(String(value || ""), 60, "Nama area")).filter(Boolean))];
      rows.push({ key: "areas", value: areas, updated_at: new Date().toISOString() });
    }
    if (body.campuses !== undefined) {
      if (!Array.isArray(body.campuses) || body.campuses.length < 1 || body.campuses.length > 100) throw new Error("Katalog harus memiliki 1 sampai 100 kampus.");
      const existingIds = new Set((Array.isArray(current.campuses) ? current.campuses : []).map((campus) => String(campus.id || campus.shortName || "").toLowerCase()));
      const campuses = body.campuses.map((campus) => {
        if (!campus || typeof campus !== "object") throw new Error("Data kampus tidak valid.");
        const id = safeText(String(campus.id || ""), 60, "Kode kampus").toLowerCase();
        const name = safeText(String(campus.name || ""), 120, "Nama kampus");
        const shortName = safeText(String(campus.shortName || ""), 32, "Nama singkat kampus").toUpperCase();
        const provinceId = safeText(String(campus.provinceId || ""), 60, "Kode provinsi").toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(provinceId) || !name || !shortName) throw new Error("Kode kampus, nama, nama singkat, dan kode provinsi wajib valid.");
        const domains = Array.isArray(campus.emailDomains) ? [...new Set(campus.emailDomains.map((value) => safeText(String(value || ""), 120, "Domain email").toLowerCase()).filter(Boolean))] : [];
        if (domains.some((domain) => !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain))) throw new Error("Domain email harus berupa nama domain tanpa tanda @.");
        return { id, name, shortName, provinceId, active: campus.active !== false, emailDomains: domains };
      });
      const ids = campuses.map((campus) => campus.id);
      const shortNames = campuses.map((campus) => campus.shortName.toLowerCase());
      if (new Set(ids).size !== ids.length || new Set(shortNames).size !== shortNames.length) throw new Error("Kode kampus dan nama singkat harus unik.");
      if (!campuses.some((campus) => campus.active)) throw new Error("Sekurangnya satu kampus harus aktif.");
      const submittedIds = new Set(ids);
      if ([...existingIds].some((id) => !submittedIds.has(id))) throw new Error("Kampus yang sudah ada tidak dihapus. Nonaktifkan kampus jika tidak digunakan.");
      rows.push({ key: "campuses", value: campuses, updated_at: new Date().toISOString() });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || "Pengaturan tidak valid." }, { status: 400 });
  }
  if (!rows.length) return NextResponse.json({ error: "Tidak ada pengaturan yang berubah." }, { status: 400 });
  const supa = getAdminClient();
  const { error } = await supa.from("settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: "Pengaturan gagal disimpan." }, { status: 503 });
  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: "platform_settings_updated", target_id: "settings", metadata: { keys: rows.map((row) => row.key) } });
  return NextResponse.json({ ok: true });
}
