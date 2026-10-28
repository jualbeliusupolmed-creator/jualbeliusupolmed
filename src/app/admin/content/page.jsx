import ContentWorkspace from "@/components/admin/ContentWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export default async function AdminContentPage() {
  const actor = await getAdminActor();
  return <ContentWorkspace canReview={hasAdminPermission(actor, "content", "review")} canManage={hasAdminPermission(actor, "content", "manage")} superadmin={actor?.role === "superadmin"} />;
}
