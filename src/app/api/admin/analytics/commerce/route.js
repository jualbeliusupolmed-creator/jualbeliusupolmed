import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, resolveAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, getActiveCampuses, getCampusProvinceId } from "@/lib/settings";
import { applyListingScope, buildListingScopeValues } from "@/lib/adminListingScope";

export const dynamic = "force-dynamic";

const PROVINCE_ID = "sumatera-utara";
const LISTING_ID_CAP = 20000;
const CONTACT_BATCH_SIZE = 250;

async function countContacts(supa, listingIds, since, status) {
  let total = 0;
  for (let offset = 0; offset < listingIds.length; offset += CONTACT_BATCH_SIZE) {
    let query = supa.from("buyer_contacts").select("id", { count: "exact", head: true })
      .in("listing_id", listingIds.slice(offset, offset + CONTACT_BATCH_SIZE))
      .gte("created_at", since);
    if (status) query = query.eq("deal_status", status);
    const { count, error } = await query;
    if (error) throw error;
    total += count || 0;
  }
  return total;
}

export async function GET() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "analytics", "read")) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  }

  try {
    const settings = await getSettings();
    const campuses = getActiveCampuses(settings);
    const provinceCampuses = campuses.filter((campus) => getCampusProvinceId(campus) === PROVINCE_ID);
    const allowedCampusNames = actor.role === "superadmin"
      ? provinceCampuses.map((campus) => campus.shortName)
      : resolveAdminCampusScope(actor.scopes, campuses).filter((name) =>
        provinceCampuses.some((campus) => campus.shortName.toLowerCase() === name.toLowerCase())
      );
    const scopedCampuses = provinceCampuses.filter((campus) =>
      allowedCampusNames.some((name) => campus.shortName.toLowerCase() === name.toLowerCase())
    );
    const scope = buildListingScopeValues(allowedCampusNames, scopedCampuses);
    const supa = getAdminClient();
    const statuses = ["active", "pending", "sold"];
    const listingCounts = await Promise.all([null, ...statuses].map(async (status) => {
      let query = supa.from("listings").select("id", { count: "exact", head: true });
      if (status) query = query.eq("status", status);
      const { count, error } = await applyListingScope(query, scope);
      if (error) throw error;
      return count || 0;
    }));

    // Ambil ID listing saja; buyer_contacts dibaca hanya dalam bentuk jumlah/status,
    // tanpa nomor telepon, nama pembeli, atau kontak penjual.
    const listingIds = [];
    for (let offset = 0; offset < LISTING_ID_CAP; offset += 1000) {
      const query = applyListingScope(supa.from("listings").select("id").order("id").range(offset, offset + 999), scope);
      const { data, error } = await query;
      if (error) throw error;
      listingIds.push(...(data || []).map((row) => row.id));
      if (!data || data.length < 1000) break;
    }
    const listingIdsCapped = listingIds.length >= LISTING_ID_CAP;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [contactAttempts, sellerReportedDeal, sellerReportedFailed] = await Promise.all([
      countContacts(supa, listingIds, since, null),
      countContacts(supa, listingIds, since, "deal"),
      countContacts(supa, listingIds, since, "gagal"),
    ]);

    return NextResponse.json({
      provinceId: PROVINCE_ID,
      provinceName: "Sumatera Utara",
      universityCount: scopedCampuses.length,
      universityScopeIds: scopedCampuses.flatMap((campus) => [campus.id, campus.shortName].filter(Boolean).map((value) => String(value).toLowerCase())),
      windowDays: 30,
      coverage: listingIdsCapped ? "capped" : "complete",
      counts: {
        listings: listingCounts[0],
        activeListings: listingCounts[1],
        pendingListings: listingCounts[2],
        soldListings: listingCounts[3],
        contactAttempts,
        sellerReportedDeal,
        sellerReportedFailed,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Ringkasan operasional belum dapat dimuat." }, { status: 503 });
  }
}
