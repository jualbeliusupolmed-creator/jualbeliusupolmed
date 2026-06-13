import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import ApproveUnlockClient from "./ApproveUnlockClient";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function ApproveUnlockPage({ searchParams }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }
  const id = searchParams?.id || "";
  
  const supa = getAdminClient();
  const { data: payment } = await supa
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  let wanted = null;
  if (payment?.meta?.unlock_wanted_id) {
    const { data } = await supa
      .from("wanted_listings")
      .select("*")
      .eq("id", payment.meta.unlock_wanted_id)
      .maybeSingle();
    wanted = data;
  }

  return (
    <ApproveUnlockClient 
      paymentId={id} 
      initialPayment={payment} 
      wanted={wanted} 
    />
  );
}
