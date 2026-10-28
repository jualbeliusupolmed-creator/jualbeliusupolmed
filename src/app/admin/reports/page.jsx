import ReportsWorkspace from "@/components/admin/ReportsWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const actor = await getAdminActor();
  return <ReportsWorkspace canManage={hasAdminPermission(actor, "reports", "manage")} />;
}
