import { redirect } from "next/navigation";
import { getSellerSessionAsync } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UserOpenPoPage() {
  if (!await getSellerSessionAsync()) redirect("/dashboard/login?next=%2Fdashboard%2Fopen-po");
  redirect("/dashboard?tab=open-po");
}
