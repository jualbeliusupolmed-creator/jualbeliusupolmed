import { getAdminActor } from "@/lib/admin-access";
import { getWorkspaceOverview } from "@/lib/adminOverviewData";
import OverviewView from "@/components/admin/OverviewView";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const actor = await getAdminActor();
  const stats = await getWorkspaceOverview(actor);
  return <OverviewView stats={stats} actor={actor} />;
}
