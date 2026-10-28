import MarketplaceWorkspace from "@/components/admin/MarketplaceWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const actor = await getAdminActor();
  return <MarketplaceWorkspace canReview={hasAdminPermission(actor, "marketplace", "review")} canManage={hasAdminPermission(actor, "marketplace", "manage")} superadmin={actor?.role === "superadmin"} />;
}
