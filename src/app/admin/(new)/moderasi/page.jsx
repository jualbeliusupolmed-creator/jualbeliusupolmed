import { getAdminClient } from "@/lib/supabaseAdmin";
import ModerasiClient from "@/components/admin/ModerasiClient";

export const dynamic = "force-dynamic";

export default async function ModerasiPage() {
  const supa = getAdminClient();

  const [pendingRes, reportsRes, profilesRes, feesRes] = await Promise.all([
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
  ]);

  const pendingListings = pendingRes.data || [];
  const openReports = reportsRes.data || [];
  const pendingProfiles = profilesRes.data || [];
  const pendingFees = feesRes.data || [];

  const total = pendingListings.length + openReports.length + pendingProfiles.length + pendingFees.length;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold dark:text-white">Antrian Moderasi</h1>
          <p className="mt-0.5 text-sm text-gray-400">{total} item perlu perhatian</p>
        </div>
        <form action="" method="get">
          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </form>
      </div>

      <ModerasiClient
        pendingListings={pendingListings}
        openReports={openReports}
        pendingProfiles={pendingProfiles}
        pendingFees={pendingFees}
      />
    </div>
  );
}
