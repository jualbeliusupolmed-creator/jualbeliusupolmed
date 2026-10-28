import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "../AdminLogin";
import NotifikasiClient from "./NotifikasiClient";

export const dynamic = "force-dynamic";

export default async function AdminNotifikasiPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  return <NotifikasiClient />;
}
