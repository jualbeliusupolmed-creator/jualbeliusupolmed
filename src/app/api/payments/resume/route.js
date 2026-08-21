import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/payments/resume  { listing_id, type? }
//
// "Lanjutkan bayar" — penjual menutup layar QRIS sebelum sempat transfer, lalu
// menekan tombolnya lagi dari dasbor. Tugas rute ini HANYA menemukan tagihan
// yang sudah ada dan mengembalikan nomor pesanannya; nominalnya tidak pernah
// dihitung ulang di sini (lihat catatan "tagihan lama" di bawah).
//
// Nomor penjualnya diambil dari kuki sesi, BUKAN dari badan permintaan. Dulu
// rute ini membandingkan `listing.seller_wa` dengan `seller_wa` kiriman klien —
// dua nilai yang dua-duanya dikirim penyerang, dan yang satunya tercetak di
// halaman produk untuk dibaca siapa saja. Itu bukan otorisasi, itu pengetikan
// ulang. Badan permintaan masih boleh memuat `seller_wa`; nilainya diabaikan.
export async function POST(req) {
  try {
    const body = await req.json();
    const { listing_id } = body;

    if (!listing_id) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const sesiWa = getSellerSession();
    if (!sesiWa) {
      return NextResponse.json(
        { error: "Sesi sudah habis. Masuk lagi untuk melanjutkan pembayaran." },
        { status: 401 }
      );
    }

    const paymentType = body.type === "sold_fee" ? "sold_fee" : "iklan";
    const supa = getAdminClient();

    const { data: listing, error } = await supa
      .from("listings")
      .select("id, title, seller_wa, status")
      .eq("id", listing_id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }

    if (listing.seller_wa !== sesiWa) {
      return NextResponse.json({ error: "Iklan ini bukan milik akun yang sedang masuk" }, { status: 403 });
    }

    // Status iklan yang sah berbeda per jenis tagihan, dan ini bukan detail
    // sepele: biaya terjual (`sold_fee`) justru ditagih SESUDAH iklan tayang
    // atau terjual. Dulu keduanya diadu dengan syarat yang sama
    // (`status !== "pending"` → tolak), jadi ketiga tombol "Bayar Tagihan" di
    // dasbor selalu dijawab 400 dan tidak ada satu pun tagihan komisi yang bisa
    // dilanjutkan dari situs.
    const statusSah = paymentType === "sold_fee" ? ["active", "sold"] : ["pending"];
    if (!statusSah.includes(listing.status)) {
      return NextResponse.json(
        {
          error:
            paymentType === "sold_fee"
              ? "Iklan ini tidak sedang menunggu pembayaran komisi"
              : "Iklan ini tidak sedang pending",
        },
        { status: 400 }
      );
    }

    // Tagihan diambil dari server, bukan dihitung ulang. Tarif bisa berubah di
    // /admin/settings sesudah tagihan terbit; yang harus dibayar penjual adalah
    // angka saat tagihan dibuat, bukan angka hari ini.
    const { data: tagihan } = await supa
      .from("payments")
      .select("id, amount, type, midtrans_order_id, meta")
      .eq("listing_id", listing.id)
      .eq("status", "pending")
      .eq("type", paymentType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tagihan) {
      return NextResponse.json({ error: "Tidak ada pembayaran pending" }, { status: 400 });
    }

    // Tagihan yang sama dipakai ulang, TIDAK dibuat baru. Sebelumnya tiap
    // penekanan tombol menyisipkan satu baris `payments` tambahan — 460 dari 497
    // baris (93%) berakhir pending selamanya, dan tiap baris membawa nomor
    // pesanan berbeda sehingga struk untuk nomor lama tidak pernah cocok lagi.
    const amount = Number(tagihan.meta?.final_amount || tagihan.amount) || 0;

    return NextResponse.json({
      paymentUrl: "/qris.png",
      orderId: tagihan.midtrans_order_id,
      paymentId: tagihan.id,
      amount,
      finalAmount: amount,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
