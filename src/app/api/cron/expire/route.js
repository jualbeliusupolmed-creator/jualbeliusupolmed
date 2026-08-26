import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakCron } from "@/lib/cronAuth";
import { sendWa } from "@/lib/fonnte";
import { formatWaForBaileys } from "@/lib/constants";
import { turunkanKadaluarsa } from "@/lib/kadaluarsa";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
// Loop kirim WA berjeda (anti-ban) mudah melewati batas default 10-15 detik —
// fungsi yang dibunuh di tengah loop meninggalkan sebagian penerima tanpa pesan.
export const maxDuration = 300;

// Vercel Cron harian jam 08:00.
// Kirim reminder H-3 dan H-1 sebelum iklan expired.
// Deduplication: cek window 24 jam sekitar titik H-3 / H-1.
export async function GET(req) {
  const tolak = tolakCron(req);
  if (tolak) return tolak;

  const supa = getAdminClient();
  const now = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
  let reminded = 0;

  // ── Reminder H-3: window 2.5 – 3.5 hari dari sekarang ───────────────────────
  const h3Min = new Date(now.getTime() + 2.5 * 864e5).toISOString();
  const h3Max = new Date(now.getTime() + 3.5 * 864e5).toISOString();

  const { data: expiringH3 } = await supa
    .from("listings")
    .select("id, listing_code, title, seller_wa, seller_name, expires_at")
    .eq("status", "active")
    .gte("expires_at", h3Min)
    .lte("expires_at", h3Max);

  for (const l of expiringH3 || []) {
    try {
      const expDate = new Date(l.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
      const kode = l.listing_code || l.id.slice(0, 8);
      const msg =
        `⚠️ *Iklan Hampir Berakhir — 3 Hari Lagi!*\n\n` +
        `Hei ${l.seller_name || "Penjual"},\n` +
        `Iklanmu *"${l.title}"* akan berakhir pada *${expDate}*.\n\n` +
        `Perpanjang sekarang agar tetap tayang:\n` +
        `💬 Ketik: *PERPANJANG ${kode}*\n` +
        `🌐 Dashboard: ${baseUrl}/dashboard\n\n` +
        `_Jangan sampai iklanmu hilang dari pencarian!_`;
      const waTarget = formatWaForBaileys(l.seller_wa);
      const res = await sendWa(waTarget, msg).catch(() => ({ ok: false }));
      if (res.ok) reminded++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (_) {}
  }

  // ── Reminder H-1: window 0.5 – 1.5 hari dari sekarang ───────────────────────
  const h1Min = new Date(now.getTime() + 0.5 * 864e5).toISOString();
  const h1Max = new Date(now.getTime() + 1.5 * 864e5).toISOString();

  const { data: expiringH1 } = await supa
    .from("listings")
    .select("id, listing_code, title, seller_wa, seller_name, expires_at")
    .eq("status", "active")
    .gte("expires_at", h1Min)
    .lte("expires_at", h1Max);

  for (const l of expiringH1 || []) {
    try {
      const expDate = new Date(l.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
      const kode = l.listing_code || l.id.slice(0, 8);
      const msg =
        `🚨 *Iklan Berakhir Besok!*\n\n` +
        `Hei ${l.seller_name || "Penjual"},\n` +
        `Iklanmu *"${l.title}"* berakhir *${expDate}* — besok!\n\n` +
        `Perpanjang SEKARANG sebelum terlambat:\n` +
        `💬 Ketik: *PERPANJANG ${kode}*\n` +
        `🌐 Dashboard: ${baseUrl}/dashboard`;
      const waTarget = formatWaForBaileys(l.seller_wa);
      const res = await sendWa(waTarget, msg).catch(() => ({ ok: false }));
      if (res.ok) reminded++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (_) {}
  }

  // ── Sapu OTP kedaluwarsa ────────────────────────────────────────────────────
  // Kode OTP berumur 5 menit, tapi barisnya tidak pernah dibuang: 24 baris
  // menumpuk sejak 11 Juni 2026, semuanya sudah mati. Tabel yang hanya tumbuh
  // itu bukan cuma berantakan — ia menyimpan bahan pemulihan akun lebih lama
  // dari kegunaannya. Dibersihkan di sini karena cron ini memang sudah berjalan
  // tiap hari dan tidak butuh jadwal baru.
  let otpDisapu = 0;
  {
    const { data: terhapus } = await supa
      .from("otps")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("wa");
    otpDisapu = terhapus?.length || 0;
  }

  // ── Turunkan langganan toko yang kedaluwarsa ────────────────────────────────
  // subscription_tier 'pro' dipasang saat pembayaran, tapi sebelum ini tidak
  // ada yang pernah menurunkannya lagi — penjual yang masa berlakunya habis
  // tiga bulan lalu tetap tercatat 'pro' di database, dan setiap pembaca yang
  // lupa ikut memeriksa subscription_expires_at akan mempercayainya. Penurunan
  // di sini membuat tier-nya sendiri jujur, bukan cuma tanggalnya. Menumpang
  // cron harian yang sudah ada, tidak butuh jadwal baru.
  let langgananDiturunkan = 0;
  {
    const { data: turun } = await supa
      .from("seller_profiles")
      .update({ subscription_tier: "free" })
      .neq("subscription_tier", "free")
      .lt("subscription_expires_at", new Date().toISOString())
      .select("wa");
    langgananDiturunkan = turun?.length || 0;
  }

  // ── Turunkan iklan yang tenggatnya lewat ────────────────────────────────────
  //
  // Bagian yang selama ini TIDAK ADA di rute bernama "expire". Ia mengirim
  // reminder H-3 dan H-1 dengan rajin, tenggatnya lewat, lalu tidak terjadi
  // apa-apa: `status='expired'` berjumlah nol sepanjang umur basis data.
  //
  // Dijaga sakelar `autoExpire` yang bawaannya mati. Menyalakannya adalah
  // keputusan pemilik, bukan efek samping dari kode ini mendarat — 20 iklan
  // yang menunggak dua bulan tidak pantas hilang dalam satu malam tanpa
  // pemiliknya diberi tahu. Sebelum sakelar dinyalakan, tunggakannya diberesi
  // lewat tombol di panel admin, yang memperlihatkan dulu apa yang akan turun.
  let iklanDiturunkan = 0;
  {
    const setelan = await getSettings();
    if (setelan.autoExpire) {
      const { diturunkan } = await turunkanKadaluarsa(supa);
      iklanDiturunkan = diturunkan || 0;
    }
  }

  // ── Sapu obrolan anonim yang sudah selesai ──────────────────────────────────
  // Fitur yang menjual keanoniman tidak pantas menyimpan isi obrolan selamanya.
  // Room `closed` berumur > 30 hari dihapus (chat_messages ikut lewat ON DELETE
  // CASCADE), dan room `waiting` yang tidak pernah dipasangkan disapu setelah
  // sehari — matchmaking hanya melirik yang berumur < 3 menit, sisanya bangkai.
  let chatDisapu = 0;
  {
    const batasClosed = new Date(Date.now() - 30 * 864e5).toISOString();
    // `active` ikut: room yang ditinggal tanpa menekan "keluar" diam di status
    // itu selamanya; 30 hari tanpa aktivitas artinya kedua pesertanya sudah pergi.
    const { data: closedLama } = await supa
      .from("chat_rooms")
      .delete()
      .in("status", ["closed", "active"])
      .lt("updated_at", batasClosed)
      .select("id");
    const batasWaiting = new Date(Date.now() - 864e5).toISOString();
    const { data: waitingBasi } = await supa
      .from("chat_rooms")
      .delete()
      .eq("status", "waiting")
      .lt("created_at", batasWaiting)
      .select("id");
    chatDisapu = (closedLama?.length || 0) + (waitingBasi?.length || 0);
  }

  return NextResponse.json({
    reminded,
    h3_checked: expiringH3?.length || 0,
    h1_checked: expiringH1?.length || 0,
    otp_disapu: otpDisapu,
    langganan_diturunkan: langgananDiturunkan,
    iklan_diturunkan: iklanDiturunkan,
    chat_disapu: chatDisapu,
  });
}
