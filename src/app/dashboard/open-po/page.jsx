import { redirect } from "next/navigation";
import { getSellerSession } from "@/lib/auth";
import UserOpenPoWorkspace from "@/components/open-po/UserOpenPoWorkspace";

export const dynamic = "force-dynamic";

export default function UserOpenPoPage() {
  if (!getSellerSession()) redirect("/dashboard/login?next=%2Fdashboard%2Fopen-po");
  return <UserOpenPoWorkspace />;
}
