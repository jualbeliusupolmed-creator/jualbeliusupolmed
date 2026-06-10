import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }
  redirect("/admin/overview");
}
