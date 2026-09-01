import webpush from "web-push";
import { buildSlug } from "@/lib/slug";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = `mailto:${process.env.VAPID_EMAIL || "admin@jualbeliusupolmed.web.id"}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Kirim push notification ke satu subscription
 * @param {{endpoint, keys: {p256dh, auth}}} subscription
 * @param {{title, body, url, tag}} payload
 */
export async function sendPushNotification(subscription, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[webpush] VAPID keys not configured — skip push");
    return { ok: false };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, expired: true };
    }
    console.error("[webpush] error:", err.message);
    return { ok: false };
  }
}

/**
 * Kirim push ke semua subscription milik satu WA nomor
 * Hapus subscription yang sudah expired (410/404)
 */
export async function pushToWa(supa, wa, payload) {
  if (!wa) return;
  const { data: subs } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("wa", wa);
  if (!subs?.length) return;

  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    if (result.expired) {
      await supa.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

// Catatan: `pushCategorySubscribers()` dulu ada di sini dan tidak pernah
// dipanggil. Ia digantikan `pushKeSemua()` — lihat penjelasannya di bawah:
// push barang baru sekarang menyapa SEMUA peramban yang berlangganan, bukan
// cuma pelanggan satu kategori yang punya akun. Menyambungkannya kembali
// berarti orang yang sama menerima dua notifikasi untuk iklan yang sama.

/**
 * Kirim satu push ke SEMUA peramban yang berlangganan.
 *
 * Ini yang membuat "ada barang baru" sampai ke orang yang sedang tidak membuka
 * situs. Sebelumnya push hanya pernah dikirim ke pelanggan satu kategori, dan
 * hanya kepada orang yang punya akun — padahal yang paling ingin tahu ada
 * barang baru justru pembeli, dan pembeli tidak perlu punya akun untuk membeli.
 *
 * Tiga hal yang sengaja ada di sini:
 *
 *   - `kecualiWa` supaya penjualnya sendiri tidak dikabari tentang iklannya
 *     sendiri — notifikasi pertama yang orang terima jangan sampai terasa bodoh.
 *   - Kirimnya berkelompok (bukan satu-satu, bukan sekaligus): 20 sekali jalan.
 *     Ribuan koneksi serentak dari satu fungsi serverless adalah cara paling
 *     cepat untuk kena batas dan mengirim setengahnya saja.
 *   - Langganan yang dijawab 404/410 oleh peramban DIHAPUS. Tanpa ini tabelnya
 *     pelan-pelan penuh alamat mati, dan setiap pengumuman berikutnya membuang
 *     waktu untuk perangkat yang sudah tidak ada.
 */
export async function pushKeSemua(supa, payload, { kecualiWa = null, batas = 5000 } = {}) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[webpush] VAPID belum diatur — push ke semua dilewati");
    return { ok: false, alasan: "VAPID belum diatur" };
  }

  let q = supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, wa")
    .order("created_at", { ascending: false })
    .limit(batas);
  if (kecualiWa) q = q.or(`wa.is.null,wa.neq.${kecualiWa}`);

  const { data: subs, error } = await q;
  if (error) {
    console.error("[webpush] gagal membaca langganan:", error.message);
    return { ok: false, alasan: error.message };
  }
  if (!subs?.length) return { ok: true, total: 0, terkirim: 0, gagal: 0, dihapus: 0 };

  const mati = [];
  let terkirim = 0, gagal = 0;

  const UKURAN = 20;
  for (let i = 0; i < subs.length; i += UKURAN) {
    const kelompok = subs.slice(i, i + UKURAN);
    const hasil = await Promise.all(
      kelompok.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).then((r) => ({ sub, r }))
      )
    );
    for (const { sub, r } of hasil) {
      if (r.ok) terkirim++;
      else {
        gagal++;
        if (r.expired) mati.push(sub.id);
      }
    }
  }

  if (mati.length) {
    // Pembersihan tidak boleh menjatuhkan pengumuman yang sudah terkirim:
    // kegagalan di sini paling buruk berarti barisnya ikut lagi lain kali.
    try {
      await supa.from("push_subscriptions").delete().in("id", mati);
    } catch (e) {
      console.error("[webpush] gagal menghapus langganan mati:", e?.message);
    }
  }

  console.log(`[webpush] broadcast: ${terkirim} terkirim, ${gagal} gagal, ${mati.length} langganan mati dihapus`);
  return { ok: true, total: subs.length, terkirim, gagal, dihapus: mati.length };
}

/**
 * Pengumuman "ada barang baru" ke semua peramban.
 *
 * `tag` dibuat unik per iklan supaya dua iklan baru muncul sebagai dua
 * notifikasi, bukan yang kedua menimpa yang pertama. Kalau pengumuman untuk
 * iklan yang SAMA dikirim dua kali (mis. admin menekan Kirim ulang), tag yang
 * sama justru menggantikan notifikasi lama — bukan menumpuknya.
 */
export async function pushListingBaru(supa, listing) {
  if (!listing?.id || !listing?.title) return { ok: false, alasan: "listing tidak lengkap" };

  const harga = listing.price ? `Rp ${Number(listing.price).toLocaleString("id-ID")}` : "";
  const tempat = listing.campus && listing.campus !== "Semua" ? listing.campus : "Medan";
  const badan = [harga, listing.category, tempat].filter(Boolean).join(" · ");

  return pushKeSemua(
    supa,
    {
      title: ` ${listing.title}`,
      body: badan || "Barang baru baru saja tayang",
      url: `/produk/${buildSlug(listing.title, listing.id)}`,
      tag: `listing-${listing.id}`,
    },
    { kecualiWa: listing.seller_wa || null }
  );
}
