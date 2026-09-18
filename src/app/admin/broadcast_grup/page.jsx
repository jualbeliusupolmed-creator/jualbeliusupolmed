import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import GroupBroadcastPanel from "../GroupBroadcastPanel";

export const dynamic = "force-dynamic";

export default function AdminBroadcastGrupPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return <GroupBroadcastPanel />;
}
