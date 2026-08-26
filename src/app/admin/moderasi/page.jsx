import { getAdminClient } from "@/lib/supabaseAdmin";
import ModerasiClient from "@/components/admin/ModerasiClient";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ModerasiPage() {
  const supa = getAdminClient();

  const [pendingRes, reportsRes, profilesRes, feesRes, feeOffersRes] = await Promise.all([
    supa
      .from("listings")
      .select("id, title, seller_wa, seller_name, price, category, image_url, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supa
      .from("reports")
      .select("id, reason, listing_id, reporter_wa, created_at, listings(title)")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supa
      .from("profile_change_requests")
      .select("id, seller_wa, field, current_value, requested_value, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supa
      .from("payments")
      .select("id, amount, listing_id, created_at, listings(title, seller_wa)")
      .eq("type", "sold_fee")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supa
      .from("listings")
      .select("id, title, listing_code, seller_wa, seller_name, fee_offer, created_at, payments(amount)")
      .eq("fee_offer_status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const pendingListings = pendingRes.data || [];
  const openReports = reportsRes.data || [];
  const pendingProfiles = profilesRes.data || [];
  const pendingFees = feesRes.data || [];
  const pendingFeeOffers = feeOffersRes.data || [];

  const total = pendingListings.length + openReports.length + pendingProfiles.length + pendingFees.length + pendingFeeOffers.length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Antrean Moderasi"
        description={`${total} item butuh peninjauan admin.`}
        actions={
          <form action="" method="get">
            <button 
              type="submit" 
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Segarkan Data</span>
            </button>
          </form>
        }
      />

      <ModerasiClient
        pendingListings={pendingListings}
        openReports={openReports}
        pendingProfiles={pendingProfiles}
        pendingFees={pendingFees}
        pendingFeeOffers={pendingFeeOffers}
      />
    </div>
  );
}
