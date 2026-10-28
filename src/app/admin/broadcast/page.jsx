import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import BroadcastClient from "./BroadcastClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "broadcast");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <BroadcastClient sellers={data.sellersList || []} />;
}
