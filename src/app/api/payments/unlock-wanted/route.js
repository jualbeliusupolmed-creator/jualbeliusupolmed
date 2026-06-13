import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createPaymentLink } from "@/lib/ipaymu";

export const dynamic = "force-dynamic";

// POST /api/payments/unlock-wanted  { wanted_id } -> kembalikan link iPaymu Rp 2.000
export async function POST(req) {
  try {
    const { wanted_id } = await req.json();
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

    const amount = 2000; // Tarif Rp 2.000 untuk buka kontak pembeli
    const orderId = `UNL-${wanted.id.slice(0, 8)}-${Date.now()}`;

    // Catat transaksi di tabel payments
    await supa.from("payments").insert({
      listing_id: null,
      type: "iklan", // bypass check constraint
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { unlock_wanted_id: wanted.id }
    });

    // Buat returnUrl mengarah langsung ke WhatsApp pembeli asli dengan pesan terformat
    // CATATAN: iPaymu sering gagal jika URL terlalu panjang atau memuat banyak karakter aneh,
    // jadi kita buat pesan yang lebih ringkas.
    const shortTitle = wanted.title.length > 30 ? wanted.title.substring(0, 30) + "..." : wanted.title;
    const returnUrl = `https://wa.me/${wanted.buyer_wa}?text=${encodeURIComponent(
      `Halo ${wanted.buyer_name}, saya ada barang "${shortTitle}".`
    )}`;

    let paymentUrl = null;
    try {
      const tx = await createPaymentLink({
        orderId,
        amount,
        customerName: "Penjual",
        customerWa: "081111111111", // WA Dummy karena kita tidak tahu siapa penjualnya (belum login)
        itemName: `Buka Kontak: ${wanted.title}`.substring(0, 50),
        returnUrl,
      });
      paymentUrl = tx.url;
    } catch (e) {
      console.error("unlock-wanted payment charge:", e?.message);
      return NextResponse.json({ error: "Gagal membuat gerbang pembayaran" }, { status: 500 });
    }

    return NextResponse.json({ paymentUrl, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
