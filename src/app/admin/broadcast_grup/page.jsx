import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "../AdminLogin";
import GroupBroadcastPanel from "../GroupBroadcastPanel";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastGrupPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  return <GroupBroadcastPanel />;
}
