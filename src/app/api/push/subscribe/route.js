import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe — simpan atau hapus subscription
export async function POST(req) {
  try {
    const body = await req.json();
    const { wa, subscription, action } = body;

    // Nomor WA TIDAK lagi wajib.
    //
    // Dulu baris ini menolak siapa pun yang tidak punya akun, dan itu diam-diam
    // berarti "cuma penjual yang boleh dikabari" — padahal yang paling ingin
    // tahu ada barang baru adalah pembeli, dan pembeli tidak perlu punya akun
    // untuk membeli di sini. Sekarang nomor cuma pelengkap: kalau ada, dipakai
    // untuk notifikasi yang memang ditujukan ke orang itu (mis. tawaran masuk);
    // kalau tidak ada, perangkatnya tetap kebagian pengumuman umum.
    //
    // Butuh BAGIAN 25 di migrasi.sql (wa DROP NOT NULL). Sebelum migrasi itu
    // jalan, langganan tanpa nomor akan ditolak database — dan itu dijawab apa
    // adanya di bawah, bukan sebagai "berhasil" yang keliru.
    const normalizedWa = formatWa(wa || "") || null;

    const supa = getAdminClient();

    if (action === "unsubscribe") {
      if (subscription?.endpoint) {
        await supa.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      } else if (normalizedWa) {
        await supa.from("push_subscriptions").delete().eq("wa", normalizedWa);
      }
      return NextResponse.json({ ok: true, action: "unsubscribed" });
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "subscription tidak valid" }, { status: 400 });
    }

    // Upsert berdasarkan endpoint (satu device bisa berganti WA)
    const { error } = await supa.from("push_subscriptions").upsert(
      {
        wa: normalizedWa,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    );
    if (error) {
      // Paling mungkin: BAGIAN 25 belum dijalankan, jadi kolom wa masih NOT NULL.
      // Sebutkan apa yang harus dilakukan, jangan cuma "gagal".
      const belumMigrasi = /null value in column "wa"|not-null/i.test(error.message || "");
      return NextResponse.json({
        error: belumMigrasi
          ? "Langganan tanpa nomor WA belum diizinkan database — jalankan migrasi BAGIAN 25 dulu."
          : error.message,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "subscribed", anonim: !normalizedWa });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/push/subscribe — ambil VAPID public key
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });
  return NextResponse.json({ publicKey });
}
