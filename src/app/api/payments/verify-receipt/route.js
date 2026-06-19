import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { verifyReceiptImage } from "@/lib/gemini";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const receiptFile = formData.get("receipt");
    const transactionId = formData.get("transactionId"); // Maps to midtrans_order_id
    const expectedAmount = formData.get("expectedAmount");

    if (!receiptFile) {
      return NextResponse.json({ success: false, error: "Gambar struk tidak ditemukan." }, { status: 400 });
    }

    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    const mimeType = receiptFile.type;

    // 1. Ekstrak data dari gambar menggunakan Gemini Vision
    const extractedData = await verifyReceiptImage(buffer, mimeType);

    // 2. Cek apakah ini benar-benar gambar struk
    if (!extractedData.is_struk_valid) {
      return NextResponse.json({ 
        success: false, 
        error: "Gambar ditolak. Sistem AI mendeteksi bahwa ini bukan struk transfer yang sah." 
      }, { status: 400 });
    }

    // 3. Validasi Nominal (Sangat Krusial)
    if (expectedAmount && Number(extractedData.nominal) !== Number(expectedAmount)) {
       return NextResponse.json({ 
         success: false, 
         error: `Nominal di struk (Rp ${extractedData.nominal?.toLocaleString("id-ID") || 0}) tidak sama dengan tagihan (Rp ${Number(expectedAmount).toLocaleString("id-ID")}). Transaksi ditolak.` 
       }, { status: 400 });
    }

    // 4. Update Database
    if (transactionId) {
      const supa = getAdminClient();
      
      // Update status payment menjadi paid dan kembalikan datanya
      const { data: payment } = await supa
        .from("payments")
        .update({ status: "paid" })
        .eq("midtrans_order_id", transactionId)
        .select("*, listings(title, seller_wa)")
        .single();

      if (payment) {
        // === LOGIK YANG SAMA DENGAN WEBHOOK MIDTRANS ===
        if (payment.type === "subscribe") {
          const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
          await supa
            .from("seller_profiles")
            .update({ subscription_tier: "pro", subscription_expires_at: until })
            .eq("wa", payment.meta?.wa);
        } else if (payment.meta?.unlock_wanted_id) {
          await supa.from("wanted_unlocks").insert({
              wanted_id: payment.meta.unlock_wanted_id,
              unlocked_by_wa: payment.meta.requester_wa || null
          });
        } else if (payment.meta?.wanted_id) {
          // Aktifkan postingan Cari Barang
          const { data: wanted } = await supa
            .from("wanted_listings")
            .update({ status: "active" })
            .eq("id", payment.meta.wanted_id)
            .select()
            .single();

          if (wanted) {
            // Kita bisa import postWantedToGroup dari lib/fonnte kalau butuh, 
            // tapi kita skip auto-post di sini agar fokus ke notif personal.
          }
        } else if (payment.listing_id) {
          // iklan / bump -> aktifkan & angkat ke atas
          if (payment.type === "iklan" || payment.type === "bump") {
            await supa
              .from("listings")
              .update({ status: "active", bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "featured") {
            const days = payment.meta?.days || 1;
            const until = new Date(Date.now() + days * 864e5).toISOString();
            await supa
              .from("listings")
              .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "renewal") {
            const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
            await supa
              .from("listings")
              .update({ status: "active", expired_at: until, bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "autobump") {
            const until = new Date(Date.now() + 7 * 864e5).toISOString(); // 7 Hari
            await supa
              .from("listings")
              .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id);
          } else if (payment.type === "sold_fee") {
            await supa
              .from("listings")
              .update({ status: "sold", stock: 0 })
              .eq("id", payment.listing_id);
          }
          
          // 5. Kirim Notifikasi Sukses via WhatsApp (Fonnte) ke Penjual
          if (payment.listings?.seller_wa) {
            const title = payment.listings.title || "Iklan Anda";
            const message = `🎉 *Halo! Pembayaran Sukses*\n\nSistem AI kami telah memvalidasi struk transfer sebesar *Rp ${payment.amount.toLocaleString("id-ID")}* untuk transaksi ${payment.type}.\n\nLayanan untuk *"${title}"* sudah diaktifkan otomatis! 🚀`;
            
            // Jangan await agar tidak menahan response ke client
            sendWa(payment.listings.seller_wa, message).catch(console.error);
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: extractedData });

  } catch (e) {
    console.error("verify-receipt error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
