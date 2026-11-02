import NationalAnalyticsWorkspace from "@/components/admin/NationalAnalyticsWorkspace";
import { getAdminActor } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const actor = await getAdminActor();
  return <NationalAnalyticsWorkspace superadmin={actor?.role === "superadmin"} />;
}
