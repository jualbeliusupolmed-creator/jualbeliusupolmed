import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IG_HANDLE = /^[a-z0-9._]{1,30}$/;
const missingCatalog = (error) => ["42P01", "42883", "PGRST202", "PGRST205"].includes(error?.code);
const asText = (value, max, label) => {
  if (typeof value !== "string") throw new Error(`${label} harus berupa teks.`);
  return value.trim().slice(0, max);
};

function canAccessOrganization(actor) {
  return (
    actor?.role === "superadmin" ||
    actor?.roles?.some((r) => r.role_code === "province_admin") === true ||
    hasAdminPermission(actor, "organization", "read")
  );
}

function canManageProvince(actor, provinceId) {
  return actor?.role === "superadmin" || (actor?.scopes || []).some((scope) =>
    scope.scope_type === "province" && String(scope.scope_id || "").toLowerCase() === String(provinceId || "").toLowerCase()
  );
}

function stable(value) {
  return JSON.stringify(value);
}

function existingAccountsForScope(rows, scopeType, scopeId) {
  return (rows || [])
    .filter((row) => row.scope_type === scopeType && row.scope_id === scopeId && ["instagram", "whatsapp_channel"].includes(row.provider))
    .map((row) => ({ provider: row.provider, handle: row.handle }))
    .sort((a, b) => `${a.provider}:${a.handle}`.localeCompare(`${b.provider}:${b.handle}`));
}

function incomingAccountsForScope(accounts, scopeType, scopeId) {
  return accounts
    .filter((row) => row.scope_type === scopeType && row.scope_id === scopeId)
    .map((row) => ({ provider: row.provider, handle: row.handle }))
    .sort((a, b) => `${a.provider}:${a.handle}`.localeCompare(`${b.provider}:${b.handle}`));
}

function assertProvinceScope(actor, catalog, current) {
  if (actor.role === "superadmin") return;
  if (!actor.roles?.some((role) => role.role_code === "province_admin")) {
    throw new Error("Hanya superadmin atau admin provinsi yang dapat mengubah katalog wilayah.");
  }

  const incomingProvinces = new Map(catalog.provinces.map((row) => [row.id, row]));
  const incomingUniversities = new Map(catalog.universities.map((row) => [row.id, row]));
  const incomingUnits = new Map(catalog.universities.flatMap((university) => university.units.map((unit) => [unit.id, { ...unit, universityId: university.id }])));
  const incomingAccounts = [
    ...catalog.provinces.flatMap((row) => [
      row.accounts.instagram && { provider: "instagram", scope_type: "province", scope_id: row.id, handle: row.accounts.instagram },
      row.accounts.whatsapp && { provider: "whatsapp_channel", scope_type: "province", scope_id: row.id, handle: row.accounts.whatsapp },
    ].filter(Boolean)),
    ...catalog.universities.flatMap((row) => [
      row.accounts.instagram && { provider: "instagram", scope_type: "university", scope_id: row.id, handle: row.accounts.instagram },
      row.accounts.whatsapp && { provider: "whatsapp_channel", scope_type: "university", scope_id: row.id, handle: row.accounts.whatsapp },
    ].filter(Boolean)),
  ];
  const currentProvinceIds = new Set(current.provinces.map((row) => row.id));
  if (catalog.provinces.some((row) => !currentProvinceIds.has(row.id))) {
    throw new Error("Penambahan provinsi baru hanya dapat dilakukan superadmin nasional.");
  }

  for (const previous of current.provinces) {
    const next = incomingProvinces.get(previous.id);
    if (!next) throw new Error("Provinsi yang sudah terdaftar tidak dapat dihapus.");
    if (!canManageProvince(actor, previous.id)) {
      const currentValue = { name: previous.name, active: previous.status === "active", accounts: existingAccountsForScope(current.accounts, "province", previous.id) };
      const nextValue = { name: next.name, active: next.active, accounts: incomingAccountsForScope(incomingAccounts, "province", previous.id) };
      if (stable(currentValue) !== stable(nextValue)) throw new Error("Admin provinsi hanya dapat mengubah data di provinsinya sendiri.");
    }
  }

  const currentUniversities = new Map(current.universities.map((row) => [row.id, row]));
  for (const university of catalog.universities) {
    const previous = currentUniversities.get(university.id);
    if (!previous) {
      if (!canManageProvince(actor, university.provinceId)) throw new Error("Universitas baru hanya boleh ditambahkan pada provinsi yang Anda kelola.");
      continue;
    }
    if (previous.province_id !== university.provinceId &&
        (!canManageProvince(actor, previous.province_id) || !canManageProvince(actor, university.provinceId))) {
      throw new Error("Universitas hanya boleh dipindahkan di antara provinsi yang Anda kelola.");
    }
    if (!canManageProvince(actor, previous.province_id)) {
      const currentValue = {
        code: previous.code, name: previous.name, provinceId: previous.province_id,
        active: previous.status === "active", emailDomains: previous.email_domains || [],
        units: current.units.filter((unit) => unit.university_id === previous.id).map((unit) => ({ id: unit.id, code: unit.code, name: unit.name, active: unit.status === "active" })).sort((a, b) => a.id.localeCompare(b.id)),
        accounts: existingAccountsForScope(current.accounts, "university", previous.id),
      };
      const nextValue = {
        code: university.code, name: university.name, provinceId: university.provinceId,
        active: university.active, emailDomains: university.emailDomains,
        units: university.units.map((unit) => ({ ...unit })).sort((a, b) => a.id.localeCompare(b.id)),
        accounts: incomingAccountsForScope(incomingAccounts, "university", previous.id),
      };
      if (stable(currentValue) !== stable(nextValue)) throw new Error("Admin provinsi hanya dapat mengubah universitas di provinsinya sendiri.");
    }
  }
  for (const previous of current.universities) {
    if (!incomingUniversities.has(previous.id)) throw new Error("Universitas yang sudah terdaftar tidak dapat dihapus.");
  }

  for (const unit of incomingUnits.values()) {
    const previousUniversity = currentUniversities.get(unit.universityId);
    if (!previousUniversity && !canManageProvince(actor, incomingUniversities.get(unit.universityId)?.provinceId)) {
      throw new Error("Unit baru hanya boleh ditambahkan di provinsi yang Anda kelola.");
    }
    if (previousUniversity && !canManageProvince(actor, previousUniversity.province_id) && !current.units.some((row) => row.id === unit.id && row.university_id === unit.universityId && row.code === unit.code && row.name === unit.name && row.status === (unit.active ? "active" : "inactive"))) {
      throw new Error("Admin provinsi hanya dapat mengubah unit di provinsinya sendiri.");
    }
  }
}

function legacyCatalog(settings) {
  const campuses = Array.isArray(settings.campuses) ? settings.campuses : [];
  const derived = [...new Map(campuses.map((campus) => {
    const id = String(campus.provinceId || campus.province_id || "").trim().toLowerCase();
    return [id, id ? { id, name: id.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), active: true, accounts: { instagram: "", whatsapp_channel: "" } } : null];
  }).filter(([id]) => id)).values()];
  const provinces = Array.isArray(settings.provinces) && settings.provinces.length
    ? settings.provinces.map((province) => ({ ...province, accounts: { instagram: province.instagramHandle || "", whatsapp_channel: province.whatsappChannel || "" } }))
    : derived;
  const universities = campuses.map((campus) => ({
    id: campus.id || String(campus.shortName || "").toLowerCase(),
    code: campus.shortName || "",
    name: campus.name || "",
    provinceId: campus.provinceId || campus.province_id || "",
    active: campus.active !== false,
    accounts: { instagram: campus.instagramHandle || "", whatsapp_channel: campus.whatsappChannel || "" },
    units: Array.isArray(campus.units) ? campus.units : [],
    emailDomains: Array.isArray(campus.emailDomains) ? campus.emailDomains : [],
  }));
  return { provinces, universities, catalogSource: "legacy-settings" };
}

function accountMap(rows) {
  const byScope = new Map();
  for (const row of rows || []) {
    const key = `${row.scope_type}:${row.scope_id}`;
    const value = byScope.get(key) || {};
    if (!value[row.provider]) value[row.provider] = { id: row.id, handle: row.handle, status: row.status, externalAccountId: row.external_account_id || "" };
    byScope.set(key, value);
  }
  return byScope;
}

export async function GET() {
  const actor = await getAdminActor();
  if (!canAccessOrganization(actor)) return NextResponse.json({ error: "Struktur wilayah hanya dapat diakses admin berwenang." }, { status: 403 });
  const admin = getAdminClient();
  const [provinceResult, universityResult, unitResult, accountResult] = await Promise.all([
    admin.from("provinces").select("id,name,status").order("name"),
    admin.from("universities").select("id,code,province_id,name,status,email_domains").order("name"),
    admin.from("university_units").select("id,university_id,code,name,status").order("name"),
    admin.from("organization_social_accounts").select("id,provider,province_id,university_id,scope_type,scope_id,handle,status,external_account_id,updated_at").neq("status", "inactive").order("updated_at", { ascending: false }),
  ]);
  const error = [provinceResult.error, universityResult.error, unitResult.error, accountResult.error].find(Boolean);
  if (error) {
    if (!missingCatalog(error)) return NextResponse.json({ error: "Katalog struktur nasional gagal dimuat." }, { status: 503 });
    return NextResponse.json(legacyCatalog(await getSettings()));
  }
  const accounts = accountMap(accountResult.data);
  const unitsByUniversity = new Map();
  for (const unit of unitResult.data || []) {
    const rows = unitsByUniversity.get(unit.university_id) || [];
    rows.push({ id: unit.id, code: unit.code, name: unit.name, active: unit.status === "active" });
    unitsByUniversity.set(unit.university_id, rows);
  }
  return NextResponse.json({
    catalogSource: "relational",
    provinces: (provinceResult.data || []).map((item) => ({
      id: item.id, name: item.name, active: item.status === "active",
      accounts: accounts.get(`province:${item.id}`) || {},
    })),
    universities: (universityResult.data || []).map((item) => ({
      id: item.id, code: item.code, name: item.name, provinceId: item.province_id, active: item.status === "active",
      accounts: accounts.get(`university:${item.id}`) || {}, units: unitsByUniversity.get(item.id) || [], emailDomains: item.email_domains || [],
    })),
  });
}

function normalizeAccounts(input, required) {
  const accounts = input && typeof input === "object" ? input : {};
  const instagram = asText(String(accounts.instagram || "").replace(/^@/, ""), 120, "Akun Instagram").toLowerCase();
  const whatsapp = asText(String(accounts.whatsapp_channel || ""), 200, "Kanal WhatsApp");
  if (instagram && !IG_HANDLE.test(instagram)) throw new Error("Nama akun Instagram tidak valid.");
  if (whatsapp && !/^\d{5,30}@newsletter$/.test(whatsapp) && !/^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+(?:\?[A-Za-z0-9_=&%-]*)?$/i.test(whatsapp)) {
    throw new Error("Kanal WhatsApp harus berupa JID @newsletter atau tautan kanal WhatsApp HTTPS.");
  }
  if (required && (!instagram || !whatsapp)) throw new Error("Setiap provinsi aktif wajib mencatat akun Instagram dan kanal WhatsApp.");
  return { instagram, whatsapp };
}

function normalizePayload(body) {
  if (!Array.isArray(body.provinces) || body.provinces.length > 100) throw new Error("Daftar provinsi tidak valid (maksimal 100).");
  if (!Array.isArray(body.universities) || body.universities.length < 1 || body.universities.length > 10000) throw new Error("Daftar universitas tidak valid (maksimal 10.000).");
  const provinces = body.provinces.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Data provinsi tidak valid.");
    const id = asText(String(item.id || ""), 60, "Kode provinsi").toLowerCase();
    const name = asText(String(item.name || ""), 100, "Nama provinsi");
    const active = item.active !== false;
    if (!SLUG.test(id) || name.length < 2) throw new Error("Kode dan nama provinsi wajib diisi dengan format yang benar.");
    return { id, name, active, accounts: normalizeAccounts(item.accounts, active) };
  });
  if (new Set(provinces.map((item) => item.id)).size !== provinces.length) throw new Error("Kode provinsi harus unik.");
  const activeProvinceIds = new Set(provinces.filter((item) => item.active).map((item) => item.id));
  const universities = body.universities.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Data universitas tidak valid.");
    const id = asText(String(item.id || ""), 60, "Kode universitas").toLowerCase();
    const code = asText(String(item.code || item.shortName || ""), 32, "Nama singkat universitas").toUpperCase();
    const name = asText(String(item.name || ""), 160, "Nama universitas");
    const provinceId = asText(String(item.provinceId || item.province_id || ""), 60, "Provinsi universitas").toLowerCase();
    const active = item.active !== false;
    if (!SLUG.test(id) || !/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(code) || name.length < 2 || !provinces.some((province) => province.id === provinceId)) throw new Error("Setiap universitas perlu kode, nama, dan provinsi terdaftar.");
    if (active && !activeProvinceIds.has(provinceId)) throw new Error("Universitas aktif harus berada di provinsi aktif.");
    const units = Array.isArray(item.units) ? item.units.map((unit) => {
      const unitId = asText(String(unit.id || ""), 60, "Kode unit").toLowerCase();
      const unitCode = asText(String(unit.code || ""), 40, "Kode unit").toUpperCase();
      const unitName = asText(String(unit.name || ""), 160, "Nama unit");
      if (!SLUG.test(unitId) || !/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(unitCode) || unitName.length < 2) throw new Error("Unit/cabang perlu kode dan nama yang valid.");
      return { id: unitId, code: unitCode, name: unitName, active: unit.active !== false };
    }) : [];
    if (new Set(units.map((unit) => unit.id)).size !== units.length || new Set(units.map((unit) => unit.code)).size !== units.length) throw new Error("Kode unit/cabang harus unik di setiap universitas.");
    const emailDomains = Array.isArray(item.emailDomains) ? [...new Set(item.emailDomains.map((domain) => asText(String(domain || "").replace(/^@/, ""), 253, "Domain email").toLowerCase()).filter(Boolean))] : [];
    if (emailDomains.some((domain) => !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))) throw new Error("Domain email universitas harus berupa domain yang valid tanpa @.");
    return { id, code, name, provinceId, active, accounts: normalizeAccounts(item.accounts, false), units, emailDomains };
  });
  if (new Set(universities.map((item) => item.id)).size !== universities.length || new Set(universities.map((item) => item.code.toLowerCase())).size !== universities.length) throw new Error("Kode dan nama singkat universitas harus unik.");
  if (universities.some((item) => item.active && !provinces.some((province) => province.id === item.provinceId && province.active))) throw new Error("Universitas aktif tidak boleh berada di provinsi nonaktif.");
  return { provinces, universities };
}

function legacyUniversities(universities) {
  return universities.map((item) => ({
    id: item.id, name: item.name, shortName: item.code, provinceId: item.provinceId,
    active: item.active, emailDomains: item.emailDomains || [], instagramHandle: item.accounts.instagram,
    whatsappChannel: item.accounts.whatsapp, units: item.units,
  }));
}

export async function PUT(request) {
  const actor = await getAdminActor();
  if (!canAccessOrganization(actor)) return NextResponse.json({ error: "Struktur wilayah hanya dapat dikelola admin berwenang." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  let catalog;
  try { catalog = normalizePayload(body); }
  catch (error) { return NextResponse.json({ error: error.message || "Struktur nasional tidak valid." }, { status: 400 }); }

  const admin = getAdminClient();
  if (actor.role !== "superadmin" && !actor.roles?.some((role) => role.role_code === "province_admin")) {
    return NextResponse.json({ error: "Katalog wilayah hanya dapat diubah superadmin atau admin provinsi." }, { status: 403 });
  }
  const { data: preservedSocialAccounts, error: socialAccountsError } = await admin
    .from("organization_social_accounts")
    .select("provider,scope_type,scope_id,handle");
  if (socialAccountsError) return NextResponse.json({ error: "Akun sosial gagal diperiksa sebelum katalog disimpan." }, { status: 503 });
  const provinces = catalog.provinces.map(({ id, name, active, accounts }) => ({
    id, name, active,
    instagramHandle: accounts.instagram,
    whatsappChannel: accounts.whatsapp,
  }));
  const universities = catalog.universities.map(({ id, code, name, provinceId, active, emailDomains }) => ({ id, code, name, province_id: provinceId, active, email_domains: emailDomains }));
  const units = catalog.universities.flatMap((university) => university.units.map((unit) => ({
    id: unit.id, university_id: university.id, code: unit.code, name: unit.name, active: unit.active,
  })));
  const accounts = [
    ...catalog.provinces.flatMap((province) => [
      province.accounts.instagram ? { provider: "instagram", scope_type: "province", scope_id: province.id, handle: province.accounts.instagram } : null,
      province.accounts.whatsapp ? { provider: "whatsapp_channel", scope_type: "province", scope_id: province.id, handle: province.accounts.whatsapp } : null,
    ]),
    ...catalog.universities.flatMap((university) => [
      university.accounts.instagram ? { provider: "instagram", scope_type: "university", scope_id: university.id, handle: university.accounts.instagram } : null,
      university.accounts.whatsapp ? { provider: "whatsapp_channel", scope_type: "university", scope_id: university.id, handle: university.accounts.whatsapp } : null,
    ]),
  ].filter(Boolean);
  const supportedProviders = new Set(["instagram", "whatsapp_channel"]);
  const desiredAccountKeys = new Set(accounts.map((row) => `${row.provider}:${row.scope_type}:${row.scope_id}:${row.handle}`));
  for (const existing of preservedSocialAccounts || []) {
    const key = `${existing.provider}:${existing.scope_type}:${existing.scope_id}:${existing.handle}`;
    if (!supportedProviders.has(existing.provider) && !desiredAccountKeys.has(key)) {
      accounts.push(existing);
      desiredAccountKeys.add(key);
    }
  }
  const campuses = legacyUniversities(catalog.universities);
  if (actor.role !== "superadmin") {
    const [provinceResult, universityResult, unitResult, accountResult] = await Promise.all([
      admin.from("provinces").select("id,name,status"),
      admin.from("universities").select("id,code,province_id,name,status,email_domains"),
      admin.from("university_units").select("id,university_id,code,name,status"),
    ]);
    const readError = [provinceResult.error, universityResult.error, unitResult.error].find(Boolean);
    if (readError) return NextResponse.json({ error: "Tidak dapat memeriksa cakupan katalog yang tersimpan." }, { status: 503 });
    try {
      assertProvinceScope(actor, catalog, {
        provinces: provinceResult.data || [],
        universities: universityResult.data || [],
        units: unitResult.data || [],
        accounts: preservedSocialAccounts || [],
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
  }
  const { error } = await admin.rpc("replace_national_organization", {
    p_provinces: provinces,
    p_universities: universities,
    p_units: units,
    p_accounts: accounts,
    p_legacy_campuses: campuses,
    p_actor_id: actor.userId,
  });
  if (error) {
    if (missingCatalog(error)) return NextResponse.json({ error: "Migrasi katalog organisasi belum diterapkan; simpan akan aktif setelah fondasi database siap." }, { status: 503 });
    const known = ["Provinsi tersimpan tidak dapat dihapus", "Universitas tersimpan tidak dapat dihapus", "Unit kampus tersimpan tidak dapat dihapus"].find((message) => error.message?.includes(message));
    return NextResponse.json({ error: known || "Struktur organisasi gagal disimpan." }, { status: known ? 400 : 503 });
  }
  await admin.from("admin_audit_events").insert({ actor_id: actor.userId, action: "organization_structure_updated", target_id: "organization", metadata: { provinceCount: provinces.length, universityCount: universities.length, unitCount: units.length, accountCount: accounts.length } });
  return NextResponse.json({ ok: true, catalogSource: "relational" });
}
