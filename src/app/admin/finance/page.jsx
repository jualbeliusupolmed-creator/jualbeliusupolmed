import FinanceWorkspace from "@/components/admin/FinanceWorkspace";
import { getAdminActor } from "@/lib/admin-access";

export default async function AdminFinancePage() {
  const actor = await getAdminActor();
  return <FinanceWorkspace canManage={actor?.role === "superadmin"} />;
}
