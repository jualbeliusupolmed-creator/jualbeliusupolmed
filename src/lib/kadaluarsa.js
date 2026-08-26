/*
 * Menurunkan iklan yang masa tayangnya sudah lewat.
 *
 * Ini seharusnya pekerjaan /api/cron/expire. Rutenya sudah lama ada, dijadwalkan
 * tiap hari, dan mengerjakan lima hal: reminder H-3, reminder H-1, sapu OTP,
 * turunkan langganan, sapu obrolan. Yang tidak pernah ada di dalamnya adalah
 * satu hal yang namanya sendiri janjikan — menurunkan iklannya.
 *
 * Akibatnya terukur, dan besar. Diperiksa 26 Agustus 2026: `status='expired'`
 * berjumlah NOL sepanjang umur basis data, sementara 20 dari 45 iklan aktif
 * sudah lewat tenggat — median 50 hari, yang tertua sejak 20 Juni. Reminder H-3
 * dan H-1 terkirim rajin, tenggatnya lewat, lalu tidak terjadi apa-apa. Tidak
 * ada yang pernah perlu memperpanjang karena tidak ada yang pernah turun.
 *
 * Yang sengaja TIDAK dilakukan di sini: menurunkannya diam-diam begitu kode ini
 * mendarat. Dua puluh penjual sudah dua bulan melihat iklannya tayang; membuat
 * semuanya hilang dalam satu malam tanpa mereka tahu apa-apa adalah cara
 * memperbaiki basis data sambil merusak kepercayaan. Jadi penurunannya dipicu
 * manusia lewat tombol di panel admin, dan otomatisasinya baru menyala kalau
 * sakelarnya dinyalakan sendiri.
 */

const KOLOM = "id, title, seller_wa, seller_name, expires_at, listing_code";

/** Iklan yang berstatus aktif tapi tenggatnya sudah lewat. Tidak mengubah apa pun. */
export async function iklanKadaluarsa(supa, { batas = 200 } = {}) {
  const { data, error } = await supa
    .from("listings")
    .select(KOLOM)
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(batas);
  if (error) return { error };
  return { iklan: data || [] };
}

/**
 * Turunkan yang sudah lewat menjadi `expired`.
 *
 * Batasnya dipakai supaya penurunan pertama — yang menumpuk dua bulan — bisa
 * dikerjakan bertahap kalau memang diinginkan, alih-alih satu perintah besar
 * yang tidak bisa ditarik lagi.
 */
export async function turunkanKadaluarsa(supa, { batas = 200 } = {}) {
  const { iklan, error } = await iklanKadaluarsa(supa, { batas });
  if (error) return { error };
  if (!iklan.length) return { diturunkan: 0, iklan: [] };

  const { error: galat } = await supa
    .from("listings")
    .update({ status: "expired" })
    .in("id", iklan.map((l) => l.id));
  if (galat) return { error: galat };

  return { diturunkan: iklan.length, iklan };
}
