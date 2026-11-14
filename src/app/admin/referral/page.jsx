import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import ReferralClient from "./ReferralClient";

export const dynamic = "force-dynamic";

export default async function AdminReferralPage() {
  if (!(await isAdmin())) {
    return <AdminLogin />;
  }

  return <ReferralClient />;
}
