import { Suspense } from "react";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import BroadcastClient from "../broadcast/BroadcastClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupPostPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "broadcast");
  } catch (_) {}

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Memuat pusat siaran...</div>}>
      <BroadcastClient sellers={data.sellersList || []} initialTab="riwayat" />
    </Suspense>
  );
}
