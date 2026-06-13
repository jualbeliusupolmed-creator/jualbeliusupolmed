import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import ApprovePaymentClient from "./ApprovePaymentClient";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function ApprovePaymentPage({ searchParams }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const id = searchParams?.id || "";
  const orderId = searchParams?.orderId || "";

  if (!id && !orderId) {
    return (
      <div className="mx-auto max-w-md p-8 text-center bg-white dark:bg-slate-900 rounded-2xl shadow mt-10 border border-gray-100 dark:border-slate-800">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Parameter Tidak Lengkap</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">ID Pembayaran atau Order ID wajib disertakan.</p>
      </div>
    );
  }

  const supa = getAdminClient();
  let paymentQuery = supa.from("payments").select("*");
  
  if (id) {
    paymentQuery = paymentQuery.eq("id", id);
  } else {
    paymentQuery = paymentQuery.eq("midtrans_order_id", orderId);
  }

  const { data: payment } = await paymentQuery.maybeSingle();

  let listing = null;
  let wanted = null;

  if (payment) {
    if (payment.listing_id) {
      const { data } = await supa
        .from("listings")
        .select("*")
        .eq("id", payment.listing_id)
        .maybeSingle();
      listing = data;
    } else if (payment.meta?.unlock_wanted_id) {
      const { data } = await supa
        .from("wanted_listings")
        .select("*")
        .eq("id", payment.meta.unlock_wanted_id)
        .maybeSingle();
      wanted = data;
    }
  }

  return (
    <ApprovePaymentClient 
      payment={payment} 
      listing={listing} 
      wanted={wanted} 
    />
  );
}
