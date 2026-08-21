import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kata pencarian karangan untuk /admin-demo/tren. Tidak menyentuh database —
// lihat catatan di ../keuangan/route.js.
const PENCARIAN = [
  ["laptop bekas", 184, 12], ["kos putri", 152, 8], ["kalkulator casio", 131, 5],
  ["motor beat", 118, 3], ["buku kalkulus", 96, 7], ["kos dekat usu", 88, 9],
  ["iphone bekas", 81, 4], ["meja belajar", 74, 6], ["jaket almamater", 67, 2],
  ["sepeda lipat", 61, 3], ["printer bekas", 58, 1], ["jasa print skripsi", 54, 5],
  ["kulkas mini", 49, 0], ["tv bekas murah", 44, 0], ["kamera dslr", 41, 0],
  ["headset gaming", 38, 4], ["kipas angin", 35, 2], ["rak buku", 31, 3],
  ["sepatu futsal", 28, 2], ["tas ransel", 26, 3], ["ac portable", 22, 0],
  ["gitar akustik", 19, 0], ["mesin cuci mini", 17, 0], ["monitor 24 inch", 15, 1],
];

export async function GET(req) {
  const hari = Math.min(90, Math.max(7, parseInt(new URL(req.url).searchParams.get("days") || "30")));
  const skala = hari / 30;

  const semua = PENCARIAN.map(([query, dasar, avgResults]) => ({
    query,
    count: Math.max(1, Math.round(dasar * skala)),
    avgResults,
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total: semua.reduce((t, q) => t + q.count, 0),
    top: semua.slice(0, 30),
    noResult: semua.filter((q) => q.avgResults === 0).slice(0, 20),
  });
}
