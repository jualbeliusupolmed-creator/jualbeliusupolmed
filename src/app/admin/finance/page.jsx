import FinanceWorkspace from "@/components/admin/FinanceWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export default async function AdminFinancePage({ searchParams }) {
  const actor = await getAdminActor();
  const initialOrderId = String(searchParams?.orderId || "").slice(0, 120);
  return <FinanceWorkspace canManage={hasAdminPermission(actor, "finance", "manage")} initialOrderId={initialOrderId} />;
}
