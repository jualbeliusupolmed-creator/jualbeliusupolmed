import { getActiveCampuses, getCampusProvinceId, getSettings } from "@/lib/settings";

const MAX_FEATURED = 12;

export function normalizeProvinceId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ? id : "";
}

export function provinceScopesForActor(actor) {
  if (actor?.role === "superadmin") return null;
  return [...new Set((actor?.scopes || [])
    .filter((scope) => scope.scope_type === "province")
    .map((scope) => normalizeProvinceId(scope.scope_id))
    .filter(Boolean))];
}

export function canManageFypProvince(actor, provinceId) {
  if (!actor) return false;
  if (actor.role !== "superadmin" && !actor.roles?.some((role) => role.role_code === "province_admin")) return false;
  const allowed = provinceScopesForActor(actor);
  return allowed === null || allowed.includes(normalizeProvinceId(provinceId));
}

export async function loadProvinceContext(supa, provinceId) {
  const { data: province, error: provinceError } = await supa
    .from("provinces")
    .select("id,name,status")
    .eq("id", provinceId)
    .maybeSingle();
  if (provinceError || !province || province.status !== "active") return null;

  const { data: universities, error: universityError } = await supa
    .from("universities")
    .select("id,code,name,province_id,status")
    .eq("province_id", provinceId)
    .eq("status", "active")
    .order("name")
    .limit(1000);
  if (universityError) throw new Error("Katalog kampus belum dapat diperiksa.");

  const settings = await getSettings();
  const legacyCampuses = getActiveCampuses(settings).filter((campus) => getCampusProvinceId(campus) === provinceId);
  const campusKeys = new Set([
    ...(universities || []).map((university) => university.code),
    ...legacyCampuses.map((campus) => campus.shortName),
  ].map((value) => String(value || "").trim()).filter(Boolean));

  return {
    province,
    universities: universities || [],
    campuses: [...campusKeys].map((shortName) => ({ shortName, provinceId })),
    universityIds: (universities || []).map((university) => university.id),
    campusCodes: [...campusKeys],
  };
}

export function matchesProvince(item, context) {
  return String(item?.seller_province_id || "") === String(context?.province?.id || "");
}

export async function findProvinceListings(supa, context, { ids, query, limit = 80 } = {}) {
  let request = supa.from("listings")
    .select("id,title,price,category,campus,university_id,seller_province_id,image_url,created_at,status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(Math.min(MAX_FEATURED * 10, Math.max(1, Number(limit) || 80)));

  if (ids) request = request.in("id", ids);
  if (query) request = request.ilike("title", `%${String(query).replace(/[%_,]/g, " ").slice(0, 80)}%`);
  request = request.eq("seller_province_id", context.province.id);

  const { data, error } = await request;
  if (error) throw new Error("Listing provinsi belum dapat dimuat.");
  return (data || []).filter((item) => matchesProvince(item, context));
}

export async function findRecentSoldProvinceListings(supa, context, { limit = 8 } = {}) {
  let request = supa.from("listings")
    .select("id,title,price,category,campus,university_id,seller_province_id,image_url,created_at,status")
    .eq("status", "sold")
    .order("created_at", { ascending: false })
    .limit(Math.min(12, Math.max(1, Number(limit) || 8)));

  request = request.eq("seller_province_id", context.province.id);

  const { data, error } = await request;
  if (error) throw new Error("Riwayat barang terjual di provinsi ini belum dapat dimuat.");
  return (data || []).filter((item) => matchesProvince(item, context)).slice(0, limit);
}

export async function readProvinceCuration(supa, context) {
  const key = `fyp_province_${context.province.id}`;
  const { data, error } = await supa.from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error("Kurasi FYP belum dapat dibaca.");
  const ids = Array.isArray(data?.value?.listing_ids)
    ? [...new Set(data.value.listing_ids.map((id) => String(id)))].slice(0, MAX_FEATURED)
    : [];
  const items = ids.length ? await findProvinceListings(supa, context, { ids, limit: MAX_FEATURED }) : [];
  const byId = new Map(items.map((item) => [String(item.id), item]));
  return { ids: ids.filter((id) => byId.has(id)), items: ids.map((id) => byId.get(id)).filter(Boolean) };
}

export { MAX_FEATURED };
