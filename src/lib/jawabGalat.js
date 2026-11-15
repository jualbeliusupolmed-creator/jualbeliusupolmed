import { NextResponse } from "next/server";

export function jawabGalat(e, { status = 500, pesan } = {}) {
  const msg = e?.message || String(e);
  console.error("[api]", e?.stack || msg);

  // Specific user-facing messages based on error type
  let userMessage = pesan || "Terjadi kesalahan. Silakan coba lagi.";

  if (msg.includes("supabase") || msg.includes("Supabase") || msg.includes("database") || msg.includes("PGRST")) {
    userMessage = "Koneksi database bermasalah. Tim kami sudah diberitahu. Coba lagi dalam beberapa saat.";
  } else if (msg.includes("R2") || msg.includes("Cloudflare") || msg.includes("S3") || msg.includes("storage")) {
    userMessage = "Upload gambar gagal. Coba kompres foto atau coba lagi nanti.";
  } else if (msg.includes("session") || msg.includes("auth") || msg.includes("cookie") || msg.includes("unauthorized")) {
    userMessage = "Sesi Anda berakhir. Silakan login kembali.";
  } else if (msg.includes("rate limit") || msg.includes("429") || msg.includes("terlalu banyak")) {
    userMessage = "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
  } else if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
    userMessage = "Server terlalu lambat merespons. Coba lagi.";
  } else if (msg.includes("moderation") || msg.includes("terlarang") || msg.includes("prohibited")) {
    userMessage = "Iklan Anda tidak lolos moderasi. Periksa deskripsi dan foto.";
  } else if (msg.includes("universitas") || msg.includes("kampus") || msg.includes("provinsi")) {
    userMessage = "Pilih kampus di Profil terlebih dahulu sebelum memasang iklan.";
  } else if (msg.includes("settings") || msg.includes("pricing") || msg.includes("biaya")) {
    userMessage = "Sistem biaya iklan sedang diperbarui. Coba lagi sebentar.";
  } else if (msg.includes("payment") || msg.includes("midtrans") || msg.includes("QRIS")) {
    userMessage = "Sistem pembayaran bermasalah. Tim kami sudah diberitahu. Coba lagi nanti.";
  } else if (msg.includes("upload") || msg.includes("file") || msg.includes("sharp") || msg.includes("WebP")) {
    userMessage = "Upload foto gagal. Coba foto yang lebih kecil atau format JPG/PNG.";
  }

  return NextResponse.json({ error: userMessage }, { status });
}
