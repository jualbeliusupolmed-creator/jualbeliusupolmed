import { NextResponse } from "next/server";
import crypto from "crypto";

// Gerbang tunggal untuk semua rute /api/cron/*.
//
// Sebelum 21 Agustus 2026 tiap rute menulis pemeriksaannya sendiri, dan
// keempatnya sepakat pada satu hal yang keliru: kalau `CRON_SECRET` tidak
// diset, gerbangnya dibuka.
//
//   auto-bump, distributor-digest : `if (SECRET && auth !== ...)` — tanpa
//       SECRET, syaratnya tidak pernah benar dan siapa pun boleh masuk tanpa
//       header apa pun sama sekali.
//   broadcast, expire             : mundur ke `!!headers.get("x-vercel-cron")`,
//       padahal itu header HTTP biasa yang bisa diketik siapa saja.
//
// `broadcast` mengirim WhatsApp massal, `expire` menurunkan iklan orang. Jadi
// gerbang ini sekarang fail-closed, meniru yang sudah dilakukan /api/wa/baileys
// terhadap BAILEYS_API_TOKEN: tanpa rahasia, tidak ada yang lewat.
//
// Konsekuensi yang disengaja: kalau CRON_SECRET belum diisi di Vercel, keempat
// cron berhenti bekerja dan menjawab 503 dengan alasannya. Cron yang diam dan
// terlihat di log lebih baik daripada cron yang bisa dipicu orang luar.
export function tolakCron(req) {
  const rahasia = process.env.CRON_SECRET;
  const tokenBot = process.env.BAILEYS_API_TOKEN;
  if (!rahasia && !tokenBot) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET belum diset di lingkungan produksi. Rute cron sengaja " +
          "ditutup sampai rahasianya diisi — tanpa itu, siapa pun bisa " +
          "memicunya.",
      },
      { status: 503 }
    );
  }

  const dikirim = req.headers.get("authorization") || "";

  const cocok = (expectedToken) => {
    if (!expectedToken) return false;
    const diharapkan = `Bearer ${expectedToken}`;
    const a = crypto.createHash("sha256").update(dikirim).digest();
    const b = crypto.createHash("sha256").update(diharapkan).digest();
    return crypto.timingSafeEqual(a, b);
  };

  if (cocok(rahasia) || cocok(tokenBot)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
