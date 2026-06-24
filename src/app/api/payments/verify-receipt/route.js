import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { verifyReceiptImage } from "@/lib/gemini";
import { sendWa, notifyAdminNewListing, postToGroup, postWantedToGroup } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";

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

    // 3. Validasi Nominal — cukup >= tagihan (boleh lebih, tidak boleh kurang)
    if (expectedAmount && Number(extractedData.nominal) < Number(expectedAmount)) {
       return NextResponse.json({
         success: false,
         error: `Nominal di struk (Rp ${extractedData.nominal?.toLocaleString("id-ID") || 0}) kurang dari tagihan (Rp ${Number(expectedAmount).toLocaleString("id-ID")}). Mohon transfer ulang dengan nominal yang benar.`
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
        .select("*, listings(id, title, price, category, condition, seller_name, seller_wa, listing_code, image_url, expires_at)")
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
            // Kirim notifikasi WA grup untuk Cari Barang
            postWantedToGroup(wanted).catch(console.error);
          }
        } else if (payment.listing_id) {
          // iklan / bump -> aktifkan & angkat ke atas
          if (payment.type === "iklan" || payment.type === "bump") {
            const { data: listing } = await supa
              .from("listings")
              .update({ status: "active", bumped_at: new Date().toISOString() })
              .eq("id", payment.listing_id)
              .select()
              .single();
              
            if (listing && payment.type === "iklan") {
              Promise.allSettled([
                notifyAdminNewListing(listing),
                postToGroup(listing),
              ]).catch(console.error);
            }
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
          
          // 5. Kirim Notifikasi Sukses via WhatsApp ke Penjual
          if (payment.listings?.seller_wa) {
            const ls = payment.listings;
            const productUrl = ls.id && ls.title
              ? `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/produk/${buildSlug(ls.title, ls.id)}`
              : null;
            const expDate = ls.expires_at
              ? new Date(ls.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
              : null;

            const typeMessages = {
              iklan:    `✅ *Iklan Kamu Sudah Tayang!* 🎉\n\n📦 *${ls.title}*\n${expDate ? `📅 Aktif hingga: *${expDate}*\n` : ""}🔑 Kode: *${ls.listing_code || "-"}*\n\nIklan sudah disebarkan ke grup WA marketplace!\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
              bump:     `🔼 *Iklan Berhasil Disundul!*\n\n📦 *${ls.title}* sudah naik ke atas.\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
              renewal:  `🔄 *Iklan Diperpanjang!*\n\n📦 *${ls.title}*\n${expDate ? `📅 Aktif hingga: *${expDate}*` : ""}`,
              featured: `⭐ *Featured Aktif!*\n\n📦 *${ls.title}* sekarang tampil sebagai Featured.\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
              autobump: `🔄 *AutoBump Aktif!*\n\n📦 *${ls.title}* akan otomatis disundul setiap hari.`,
            };
            const message = typeMessages[payment.type]
              || `✅ *Pembayaran Sukses*\n\nLayanan untuk *"${ls.title}"* sudah diaktifkan! 🚀`;

            sendWa(ls.seller_wa, message).catch(console.error);
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
