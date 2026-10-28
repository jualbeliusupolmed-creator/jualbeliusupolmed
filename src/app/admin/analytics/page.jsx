import AnalyticsWorkspace from "@/components/admin/AnalyticsWorkspace";
import { getAdminActor } from "@/lib/admin-access";

export default async function AdminAnalyticsPage() {
  const actor = await getAdminActor();
  return <AnalyticsWorkspace superadmin={actor?.role === "superadmin"} />;
}
