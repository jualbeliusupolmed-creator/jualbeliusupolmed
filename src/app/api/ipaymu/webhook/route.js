import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup, notifyWantedBuyers } from "@/lib/fonnte";
import { verifyIpaymuTransaction } from "@/lib/ipaymu";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // iPaymu mengirim data webhook dalam format x-www-form-urlencoded
    const textBody = await req.text();
    const params = new URLSearchParams(textBody);
    const data = Object.fromEntries(params.entries());

    const orderId = data.reference_id;
    const txStatus = data.status; // "berhasil", "pending", "expired", "batal"
    const statusCode = data.status_code;

    const trxId = data.trx_id;

    if (!orderId || !trxId) {
      return NextResponse.json({ error: "Missing reference_id or trx_id" }, { status: 400 });
    }

    // Verifikasi transaksi ke server iPaymu untuk mencegah POST palsu
    const verifiedData = await verifyIpaymuTransaction(trxId);
    
    // Pastikan reference_id dari API iPaymu cocok dengan yang dikirim webhook
    if (verifiedData.Reference_Id !== orderId) {
      return NextResponse.json({ error: "Reference ID mismatch" }, { status: 400 });
    }

    // Gunakan status dari API iPaymu yang terverifikasi (Status_Code)
    // 1 = Berhasil, -1 = Gagal/Batal/Expired, 0 = Pending
    const vStatusCode = String(verifiedData.Status_Code);
    const settled = vStatusCode === "1";
    const failed = vStatusCode === "-1";

    const newStatus = settled ? "paid" : failed ? "failed" : "pending";

    const supa = getAdminClient();

    // Cek status payment sebelumnya untuk mencegah duplicate processing
    const { data: oldPayment } = await supa
      .from("payments")
      .select("status")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!oldPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (oldPayment.status === "paid" && settled) {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    const { data: payment } = await supa
      .from("payments")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId) // tetap menggunakan kolom lama agar tidak perlu migrasi db
      .select()
      .single();

    if (payment && settled && payment.listing_id) {
      // iklan / bump -> aktifkan & angkat ke atas
      if (payment.type === "iklan" || payment.type === "bump") {
        const { data: listing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id)
          .select()
          .single();

        if (listing && payment.type === "iklan") {
          // notif admin + auto-post grup + matching engine
          notifyAdminNewListing(listing).catch(() => {});
          postToGroup(listing).catch(() => {});
          notifyWantedBuyers(listing).catch(() => {});
        }
      } else if (payment.type === "featured") {
        const days = payment.meta?.days || 1;
        const until = new Date(Date.now() + days * 864e5).toISOString();
        await supa
          .from("listings")
          .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "autobump") {
        const until = new Date(Date.now() + 7 * 864e5).toISOString(); // 7 Hari
        await supa
          .from("listings")
          .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "subscribe") {
        const wa = payment.meta?.wa;
        if (wa) {
          const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
          await supa
            .from("seller_profiles")
            .update({ 
              subscription_tier: "pro", 
              subscription_expires_at: until 
            })
            .eq("wa", wa);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ipaymu webhook error:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
