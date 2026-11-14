import { getAdminClient } from "@/lib/supabaseAdmin";
import { applyMarketplaceProvinceScope, loadProvinceMarketplaceScope } from "@/lib/marketplaceRegion";

function labelPhoto(url) {
  const value = String(url || "").trim();
  return /^https:\/\//i.test(value) || value.startsWith("/") ? value : "";
}

export async function fetchOpenPoBatches({ sellerWa, provinceId } = {}) {
  const supa = getAdminClient();
  let productIds = null;
  if (provinceId) {
    const scope = await loadProvinceMarketplaceScope(supa, provinceId);
    let productQuery = supa.from("open_po_products").select("id").eq("active", true);
    productQuery = applyMarketplaceProvinceScope(productQuery, scope);
    if (!productQuery) return [];
    const { data: products, error: productError } = await productQuery;
    if (productError) throw new Error("Open PO provinsi belum dapat dimuat.");
    productIds = (products || []).map((product) => product.id).filter(Boolean);
    if (!productIds.length) return [];
  }
  let query = supa
    .from("open_po_batches")
    .select("id,seller_wa,title,price_idr,quota,reserved_count,closes_at,pickup_point,pickup_note,status,created_at,product:open_po_products(name,description,category,unit,image_url,campus,university_id,active)")
    .eq("status", "open")
    .gt("closes_at", new Date().toISOString())
    .order("closes_at", { ascending: true })
    .limit(60);
  if (sellerWa) query = query.eq("seller_wa", sellerWa);
  if (productIds) query = query.in("product_id", productIds);
  const { data, error } = await query;
  if (error) throw new Error("Open PO belum dapat dimuat. Pastikan migrasi PO di proyek utama sudah diterapkan.");

  const rows = data || [];
  const sellerWas = [...new Set(rows.map((row) => row.seller_wa).filter(Boolean))];
  const sellers = new Map();
  if (sellerWas.length) {
    const { data: profiles } = await supa.from("seller_profiles").select("wa,name,faculty").in("wa", sellerWas);
    for (const profile of profiles || []) sellers.set(profile.wa, profile);
  }

  return rows.filter((batch) => batch.product?.active !== false && batch.reserved_count < batch.quota).map((batch) => {
    const seller = sellers.get(batch.seller_wa);
    return {
      id: batch.id,
      title: batch.title,
      name: batch.product?.name || batch.title,
      description: batch.product?.description || "",
      category: batch.product?.category || "Lainnya",
      unit: batch.product?.unit || "pcs",
      price: Number(batch.price_idr || 0),
      quota: batch.quota,
      reserved: batch.reserved_count,
      closes_at: batch.closes_at,
      pickup_point: batch.pickup_point,
      pickup_note: batch.pickup_note,
      seller_name: seller?.name || "Penjual JB",
      faculty: seller?.faculty || "",
      photo: labelPhoto(batch.product?.image_url),
      campus: batch.product?.campus || "",
      university_id: batch.product?.university_id || "",
      status: batch.status,
      url: `/open-po?batch=${encodeURIComponent(batch.id)}`,
    };
  });
}
