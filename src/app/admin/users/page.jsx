import UsersWorkspace from "@/components/admin/UsersWorkspace";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";

export default async function AdminUsersPage({ searchParams }) {
  const actor = await getAdminActor();
  const initialView = searchParams?.view === "profile-requests" ? "profile-requests" : "users";
  return <UsersWorkspace initialView={initialView} canManage={hasAdminPermission(actor, "users", "manage")} />;
}
