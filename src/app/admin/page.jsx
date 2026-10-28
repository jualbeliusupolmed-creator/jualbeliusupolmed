import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await getAdminActor())) return null;
  redirect("/admin/overview");
}
