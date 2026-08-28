import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Log kontak pembeli karangan untuk /admin-demo. Tidak menyentuh database —
// lihat catatan di ../audit/route.js.
//
// Tabel ini yang paling tidak boleh diperlihatkan apa adanya: satu barisnya
// memuat nomor WhatsApp pembeli DAN penjual sekaligus. Karena itu nomornya
// dikarang di rentang 0800000000x yang tidak pernah dipakai siapa pun, sama
// seperti sisa data demo.
const MENIT = 60_000;
const lalu = (m) => new Date(Date.now() - m * MENIT).toISOString();

const KONTAK = [
  ["USU1042", "iPhone XR 64GB Mulus", "Aisyah Nabila", "0800000001", "Bagas Pratama", "0800000011", "deal", 12, 8],
  ["USU1039", "Sepeda Motor Beat 2019", "Rizky Ananda", "0800000002", "Citra Ramadhani", "0800000012", "pending", 47, null],
  ["USU1036", "Kalkulator Casio FX-991EX", "Dimas Kurniawan", "0800000003", "Seseorang", null, "no_reply", 96, 60],
  ["USU1033", "Kos Putri Dekat Gerbang USU", "Elsa Wijaya", "0800000004", "Fajar Ramadhan", "0800000013", "deal", 190, 150],
  ["USU1031", "Pokemon TCG Booster Box", "Gilang Saputra", "0800000005", "Hana Lestari", "0800000014", "gagal", 320, null],
  ["USU1028", "Jasa Print & Jilid Skripsi", "Indah Permata", "0800000006", "Seseorang", null, "pending", 480, null],
  ["USU1025", "Laptop Asus VivoBook Ryzen 5", "Joko Susilo", "0800000007", "Kirana Dewi", "0800000015", "deal", 700, 640],
  ["USU1021", "Sepatu Crocs Classic Biru Muda", "Lutfi Hakim", "0800000008", "Maya Anggraini", "0800000016", "no_reply", 1180, null],
  ["USU1018", "Meja Belajar Lipat", "Nadia Safitri", "0800000009", "Seseorang", null, "pending", 1500, null],
  ["USU1014", "Buku Kalkulus Purcell Ed.9", "Oscar Halim", "0800000010", "Putri Ayu", "0800000017", "deal", 2100, 2040],
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 50);
  const dealStatus = searchParams.get("deal_status") || null;
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  let baris = KONTAK.map(
    (
      [listing_code, listing_title, seller_name, seller_wa, buyer_name, buyer_wa, deal_status, menit, followup],
      i,
    ) => ({
      id: `demo-kontak-${i + 1}`,
      listing_id: `demo-listing-${i + 1}`,
      listing_code,
      listing_title,
      seller_name,
      seller_wa,
      buyer_name,
      buyer_wa,
      deal_status,
      created_at: lalu(menit),
      followup_sent_at: followup == null ? null : lalu(followup),
    }),
  );

  if (dealStatus) baris = baris.filter((b) => b.deal_status === dealStatus);
  if (q) {
    baris = baris.filter((b) =>
      [b.buyer_name, b.buyer_wa, b.listing_title].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }

  const total = baris.length;
  return NextResponse.json({
    contacts: baris.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
