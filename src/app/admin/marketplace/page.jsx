import MarketplaceWorkspace from "@/components/admin/MarketplaceWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ searchParams }) {
  const actor = await getAdminActor();
  const initialMode = ["wanted", "stores"].includes(searchParams?.mode) ? searchParams.mode : "listings";
  return <MarketplaceWorkspace initialMode={initialMode} canReview={hasAdminPermission(actor, "marketplace", "review")} canManage={hasAdminPermission(actor, "marketplace", "manage")} superadmin={actor?.role === "superadmin"} />;
}
