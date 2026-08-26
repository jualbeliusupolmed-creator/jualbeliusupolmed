import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";

// Satu jawaban untuk "apakah pemanggil ini benar-benar pemiliknya?".
//
// Dipisah jadi satu berkas bukan demi kerapian. Sampai 26 Agustus 2026 enam
// rute /api/payments/* menjawab pertanyaan itu sendiri-sendiri, dan hasilnya
// enam jawaban yang berbeda:
//
//   bump, featured, subscribe, autobump, sponsored — tidak menanyakannya sama
//       sekali. `listing_id` dari body langsung dipakai, jadi siapa pun yang
//       tahu satu id iklan bisa memotong kuota `free_bumps` pemiliknya atau
//       menumpuk tagihan pending atas namanya.
//   renew — bertanya, tapi kepada pihak yang salah: `seller_wa` dibaca dari
//       body lalu dicocokkan dengan `listing.seller_wa`. Penyerang tinggal
//       mengirim keduanya dengan nilai yang sama dan pemeriksaannya lolos.
//       Identitas yang diakui sendiri oleh pengirim bukan identitas.
//
// Sekarang keenamnya memanggil fungsi yang sama, dan identitasnya hanya datang
// dari kuki bertanda tangan — nilai yang tidak bisa dikarang pengirim.
//
// Mengembalikan NextResponse bila harus ditolak, atau null bila boleh lanjut.
export function tolakBukanPemilik(pemilikWa, { aksi = "melakukan ini" } = {}) {
  const wa = getSellerSession();
  if (!wa) {
    return NextResponse.json({ error: `Login dulu untuk ${aksi}.` }, { status: 401 });
  }
  if (!pemilikWa || wa !== pemilikWa) {
    return NextResponse.json({ error: "Ini bukan milikmu." }, { status: 403 });
  }
  return null;
}
