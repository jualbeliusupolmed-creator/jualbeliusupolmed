import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { createKlikQrisTransaction } from "@/lib/klikqris";
import { loadLidPhoneMap, migrateLidToPhone } from "@/lib/lidMigrate";

export const dynamic = "force-dynamic";

// POST /api/payments/unlock-wanted  { wanted_id, method, requester_wa } -> kembalikan link Midtrans Rp 2.000 atau buat invoice manual
export async function POST(req) {
  try {
    const { wanted_id, method, requester_wa } = await req.json();
    if (!wanted_id) {
      return NextResponse.json({ error: "wanted_id wajib diisi" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Dapatkan data wanted listing
    const { data: wanted, error } = await supa
      .from("wanted_listings")
      .select("*")
      .eq("id", wanted_id)
      .single();

    if (error || !wanted) {
      return NextResponse.json({ error: "Postingan Cari Barang tidak ditemukan" }, { status: 404 });
    }

    // Guard LID: postingan lama via bot bisa menyimpan LID (ID internal WA),
    // bukan nomor HP. Jangan pernah terima pembayaran kalau nomornya tak ada.
    if (!formatWa(wanted.buyer_wa)) {
      const digits = String(wanted.buyer_wa || "").split("@")[0].replace(/:\d+$/, "");
      const lidMap = await loadLidPhoneMap(supa);
      const phone = lidMap.get(digits);
      if (phone) {
        await migrateLidToPhone(supa, digits, phone);
        wanted.buyer_wa = phone;
      } else {
        return NextResponse.json(
          { error: "Nomor WhatsApp pembeli untuk postingan ini belum tersedia, jadi kontaknya tidak bisa dibuka. Silakan pilih postingan lain." },
          { status: 409 }
        );
      }
    }

    const amount = 2000; // Tarif Rp 2.000 untuk buka kontak pembeli

    if (method === "manual") {
      // Nomor WA pemohon opsional — kontak pembeli tampil langsung di layar
      // setelah struk diverifikasi AI; WA hanya untuk salinan cadangan.
      const formattedRequesterWa = formatWa(requester_wa) || null;

      const orderId = `MNL-${wanted.id.slice(0, 8)}-${Date.now()}`;

      // Catat transaksi di tabel payments
      const { data: paymentRow, error: insertErr } = await supa.from("payments").insert({
        listing_id: null,
        type: "iklan", // bypass check constraint
        amount,
        status: "pending",
        midtrans_order_id: orderId,
        meta: { unlock_wanted_id: wanted.id, requester_wa: formattedRequesterWa, method: "manual" }
      }).select().single();

      if (insertErr || !paymentRow) {
        throw new Error(insertErr?.message || "Gagal mencatat transaksi manual");
      }

      return NextResponse.json({ success: true, paymentId: paymentRow.id, orderId });
    }

    const orderId = `UNL-${wanted.id.slice(0, 8)}-${Date.now()}`;

    // Catat transaksi di tabel payments
    await supa.from("payments").insert({
      listing_id: null,
      type: "iklan", // bypass check constraint
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { unlock_wanted_id: wanted.id, requester_wa: formatWa(requester_wa) }
    });

    // Buat pesan yang lebih ringkas.
    const shortTitle = wanted.title.length > 30 ? wanted.title.substring(0, 30) + "..." : wanted.title;
    const returnUrl = `https://wa.me/${wanted.buyer_wa}?text=${encodeURIComponent(
      `Halo ${wanted.buyer_name}, saya ada barang "${shortTitle}".`
    )}`;

    const { qrisUrl, signature, totalAmount } = await createKlikQrisTransaction(
      orderId, amount, `Buka kontak pembeli`
    );
    await supa.from("payments").update({
      meta: { unlock_wanted_id: wanted.id, requester_wa: formatWa(requester_wa), final_amount: totalAmount, klikqris_signature: signature }
    }).eq("midtrans_order_id", orderId);

    return NextResponse.json({ paymentUrl: qrisUrl, orderId, amount, finalAmount: totalAmount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
