import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "../AdminLogin";
import GroupPostsClient from "./GroupPostsClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupPostPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  return <GroupPostsClient />;
}
