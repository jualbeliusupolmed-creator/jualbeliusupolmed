import UsersWorkspace from "@/components/admin/UsersWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export default async function AdminUsersPage() {
  const actor = await getAdminActor();
  return <UsersWorkspace canManage={hasAdminPermission(actor, "users", "manage")} />;
}
