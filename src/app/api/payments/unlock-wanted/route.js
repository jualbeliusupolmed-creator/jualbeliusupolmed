import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { getSellerSession } from "@/lib/auth";
import { loadLidPhoneMap, migrateLidToPhone } from "@/lib/lidMigrate";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/payments/unlock-wanted  { wanted_id, method, requester_wa }
// -> terbitkan (atau pakai ulang) tagihan QRIS Rp 2.000 untuk membuka kontak pembeli.
//
// Dipanggil saat pemohon menekan "Kirim & Verifikasi AI", BUKAN saat jendela
// QRIS dibuka. Dulu sebaliknya: sekadar melihat-lihat sudah menerbitkan tagihan,
// dan 346 dari 460 baris pending di tabel `payments` lahir dari situ.
export async function POST(req) {
  try {
    const { wanted_id, method, requester_wa, check } = await req.json();
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

    // Mode periksa: dipanggil saat jendela QRIS dibuka, hanya untuk memastikan
    // kontaknya memang bisa dibuka (penjaga LID di atas). Tidak menerbitkan
    // tagihan apa pun — supaya pemohon tahu SEBELUM transfer, bukan sesudah.
    if (check) {
      return NextResponse.json({ ok: true });
    }

    const amount = 2000; // Tarif Rp 2.000 untuk buka kontak pembeli

    // Selalu alur QRIS statis + verifikasi struk oleh AI (tanpa gateway).
    //
    // Nomor pemohon diambil dari kuki sesi, bukan dari badan permintaan. Nomor
    // itu bukan sekadar catatan: /verify-receipt memakainya sebagai TUJUAN
    // kiriman salinan kontak pembeli. Nomor kiriman klien berarti siapa pun yang
    // membayar Rp 2.000 bisa menyuruh sistem mengirim kontak orang lain ke nomor
    // pilihannya sendiri.
    //
    // Pengunjung tanpa akun tetap boleh membuka kontak — memang itu rancangannya
    // — hanya saja tidak ada salinan WA untuk mereka: kontaknya tampil di layar
    // begitu struknya lolos. Nomor yang mereka ketik tetap dicatat sebagai
    // `requester_wa_diklaim`, untuk jejak, tidak pernah sebagai tujuan kirim.
    const waSesi = getSellerSession();
    const formattedRequesterWa = waSesi ? formatWa(waSesi) : null;
    const waDiklaim = !waSesi ? formatWa(requester_wa) || null : null;

    // Pakai ulang tagihan yang masih menggantung milik pemohon yang sama.
    //
    // Kenapa hanya kalau nomornya diketahui: dua orang anonim yang membuka
    // postingan yang sama tidak bisa dibedakan. Kalau tagihannya dipakai
    // bersama, yang pertama membayar menandainya `paid`, lalu struk orang
    // kedua dijawab "sudah dibayar" oleh /verify-receipt — dan orang kedua
    // tidak pernah menerima kontak yang sudah dia bayar.
    if (formattedRequesterWa) {
      const { data: tagihanLama } = await supa
        .from("payments")
        .select("id, midtrans_order_id, amount")
        .eq("status", "pending")
        .eq("type", "wanted")
        .eq("meta->>unlock_wanted_id", wanted.id)
        .eq("meta->>requester_wa", formattedRequesterWa)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tagihanLama) {
        return NextResponse.json({
          success: true,
          paymentId: tagihanLama.id,
          orderId: tagihanLama.midtrans_order_id,
          paymentUrl: "/qris.png",
          amount: tagihanLama.amount,
          finalAmount: tagihanLama.amount,
        });
      }
    }

    const orderId = `MNL-${wanted.id.slice(0, 8)}-${Date.now()}`;

    // type "wanted" — bukan "iklan". Komentar lamanya bilang "bypass check
    // constraint", dan itu memang benar sampai BAGIAN 9 migrasi menambahkan
    // 'wanted' ke payments_type_check. Sesudah itu label "iklan" tinggal
    // merusak laporan: /admin/keuangan sudah punya baris untuk jenis "wanted"
    // yang selamanya kosong, sementara 346 pembukaan kontak menumpuk di
    // kolom "Iklan Baru".
    const { data: paymentRow, error: insertErr } = await supa.from("payments").insert({
      listing_id: null,
      type: "wanted",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: {
        unlock_wanted_id: wanted.id,
        requester_wa: formattedRequesterWa,
        requester_wa_diklaim: waDiklaim,
        method: "manual",
        final_amount: amount,
      }
    }).select().single();

    if (insertErr || !paymentRow) {
      throw new Error(insertErr?.message || "Gagal mencatat transaksi");
    }

    return NextResponse.json({ success: true, paymentId: paymentRow.id, orderId, paymentUrl: "/qris.png", amount, finalAmount: amount });
  } catch (e) {
    return jawabGalat(e);
  }
}
