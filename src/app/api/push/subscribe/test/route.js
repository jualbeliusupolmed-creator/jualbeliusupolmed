import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/webpush";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe/test — kirim push ke SEMUA pelanggan notifikasi.
//
// Namanya "test", kelakuannya siaran. Judul, isi, dan tautan tujuan datang dari
// badan permintaan, dan notifikasinya muncul di HP orang atas nama domain situs
// ini — persis bahan phishing yang meminjam kepercayaan merek sendiri. Sampai
// 21 Agustus 2026 rute ini tidak punya satu pun pemeriksaan.
//
// Gerbangnya sekarang sama dengan /api/admin/broadcast. Skalanya juga sudah
// berubah: sejak BAGIAN 25 migrasi, setiap pengunjung boleh berlangganan tanpa
// punya akun, jadi daftar tujuannya memang dirancang untuk tumbuh.
export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || "🔔 Test Push";
    const message = body.body || "Notifikasi push berfungsi!";
    const url = body.url || "/";

    const supa = getAdminClient();
    const { data: subs, error } = await supa
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (error) throw new Error(error.message);
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, message: "Tidak ada subscriber" });

    const payload = { title, body: message, url, tag: "admin-test" };
    let sent = 0;
    const expiredIds = [];

    for (const sub of subs) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      if (result.ok) sent++;
      if (result.expired) expiredIds.push(sub.id);
    }

    // Hapus subscription yang expired
    if (expiredIds.length > 0) {
      await supa.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return NextResponse.json({ ok: true, sent, total: subs.length, expired: expiredIds.length });
  } catch (err) {
    console.error("[push/test]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
