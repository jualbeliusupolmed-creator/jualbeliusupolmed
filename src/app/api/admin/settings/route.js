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
  const admin = getAdminClient();
  const { error: organizationCatalogError } = await admin.from("provinces").select("id").limit(1);
  if (organizationCatalogError && !["42P01", "PGRST205"].includes(organizationCatalogError.code)) {
    return NextResponse.json({ error: "Status katalog struktur organisasi tidak dapat diperiksa." }, { status: 503 });
  }
  return NextResponse.json({
    admin: {
      adminWa: settings.admin?.adminWa || "",
      groupJid: settings.admin?.groupJid || "",
      extraGroups: settings.admin?.extraGroups || "",
      channelJid: settings.admin?.channelJid || "",
      broadcastToWa: settings.admin?.broadcastToWa !== false,
      broadcastToInstagram: settings.admin?.broadcastToInstagram !== false,
      notifySellerOnPublish: settings.admin?.notifySellerOnPublish !== false,
    },
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
    organizationManagedRelationally: !organizationCatalogError,
    campuses: (Array.isArray(settings.campuses) ? settings.campuses : []).map((campus) => ({
      id: campus.id || String(campus.shortName || "").toLowerCase(),
      name: campus.name || "",
      shortName: campus.shortName || "",
      provinceId: campus.provinceId || campus.province_id || "",
      parentCampusId: campus.parentCampusId || "",
      instagramHandle: campus.instagramHandle || "",
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
    if (body.campuses !== undefined) {
      const admin = getAdminClient();
      const { error: catalogError } = await admin.from("provinces").select("id").limit(1);
      if (!catalogError) throw new Error("Katalog kampus sudah dikelola dari menu Struktur wilayah. Pengaturan ini tidak dapat menimpa struktur nasional.");
      if (catalogError.code !== "42P01" && catalogError.code !== "PGRST205") throw new Error("Status katalog wilayah tidak dapat diperiksa.");
    }
    if (body.admin && typeof body.admin === "object") {
      const admin = { ...current.admin };
      if (body.admin.adminWa !== undefined) admin.adminWa = safeText(String(body.admin.adminWa || ""), 30, "Nomor WA Admin");
      if (body.admin.groupJid !== undefined) admin.groupJid = safeText(String(body.admin.groupJid || ""), 100, "JID Grup");
      if (body.admin.extraGroups !== undefined) admin.extraGroups = safeText(String(body.admin.extraGroups || ""), 500, "Grup Tambahan");
      if (body.admin.channelJid !== undefined) admin.channelJid = safeText(String(body.admin.channelJid || ""), 200, "Saluran WA");
      if (body.admin.broadcastToWa !== undefined) admin.broadcastToWa = Boolean(body.admin.broadcastToWa);
      if (body.admin.broadcastToInstagram !== undefined) admin.broadcastToInstagram = Boolean(body.admin.broadcastToInstagram);
      if (body.admin.notifySellerOnPublish !== undefined) admin.notifySellerOnPublish = Boolean(body.admin.notifySellerOnPublish);
      rows.push({ key: "admin", value: admin, updated_at: new Date().toISOString() });
    }
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
        const previous = (Array.isArray(current.campuses) ? current.campuses : []).find((item) => String(item.id || item.shortName || "").toLowerCase() === id);
        const parentCampusId = safeText(String(campus.parentCampusId ?? previous?.parentCampusId ?? ""), 60, "Kampus induk").toLowerCase();
        const instagramHandle = safeText(String(campus.instagramHandle ?? previous?.instagramHandle ?? ""), 30, "Akun Instagram").replace(/^@/, "").toLowerCase();
        if (instagramHandle && !/^[a-z0-9._]{1,30}$/.test(instagramHandle)) throw new Error("Nama akun Instagram kampus tidak valid.");
        return { id, name, shortName, provinceId, parentCampusId, instagramHandle, active: campus.active !== false, emailDomains: domains };
      });
      const ids = campuses.map((campus) => campus.id);
      const shortNames = campuses.map((campus) => campus.shortName.toLowerCase());
      if (new Set(ids).size !== ids.length || new Set(shortNames).size !== shortNames.length) throw new Error("Kode kampus dan nama singkat harus unik.");
      if (!campuses.some((campus) => campus.active)) throw new Error("Sekurangnya satu kampus harus aktif.");
      const submittedIds = new Set(ids);
      if ([...existingIds].some((id) => !submittedIds.has(id))) throw new Error("Kampus yang sudah ada tidak dihapus. Nonaktifkan kampus jika tidak digunakan.");
      rows.push({ key: "campuses", value: campuses, updated_at: new Date().toISOString() });
      const currentProvinces = Array.isArray(current.provinces) ? current.provinces : [];
      const byProvince = new Map(currentProvinces.map((province) => [String(province.id || "").toLowerCase(), province]));
      for (const provinceId of new Set(campuses.map((campus) => campus.provinceId))) {
        if (!byProvince.has(provinceId)) byProvince.set(provinceId, { id: provinceId, name: provinceId.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), active: true });
      }
      if (byProvince.size) rows.push({ key: "provinces", value: [...byProvince.values()], updated_at: new Date().toISOString() });
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
