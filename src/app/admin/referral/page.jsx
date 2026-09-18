import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import ReferralClient from "./ReferralClient";

export const dynamic = "force-dynamic";

export default function AdminReferralPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return <ReferralClient />;
}
