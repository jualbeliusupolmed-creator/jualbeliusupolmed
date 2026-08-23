// Struktur biaya — sumber kebenaran tunggal untuk PERHITUNGANNYA.
//
// Berkas ini sengaja TIDAK mengimpor apa pun: ia dipakai komponen klien maupun
// rute server, jadi tidak boleh menyeret kode server ke dalam bundel peramban.
// `lib/settings.js` mengimpor dari sini, bukan sebaliknya.
//
// Sejarahnya perlu diingat: perhitungan yang sama pernah hidup di TIGA tempat
// sekaligus — di sini (angka keras), di lib/settings.js (dari database), dan
// diketik ulang di halaman /daftar-harga. Yang MENAGIH cuma yang dari database,
// jadi begitu pemilik mengubah tarif dari panel admin, angka di layar dan angka
// di tagihan diam-diam berbeda. Sekarang tarifnya selalu dioper sebagai argumen
// `pricing`; angka di bawah cuma jaring pengaman kalau setelannya belum termuat.

export const TARIF_BAWAAN = {
  adBarang: 2000,
  adPoster: 10000,
  bump: 1000,
  featuredPerDay: 5000,
  featuredMaxPerDay: 10000,
  proMonthly: 49000,
  autobump_7_days: 15000,
  adTiers: [
    { upto: 50000, flat: 2000 },
    { upto: 100000, flat: 3000 },
    { upto: 500000, flat: 5000 },
    { upto: 1000000, flat: 7000 },
    { upto: null, pct: 1 },
  ],
  soldTiers: [
    { upto: 50000, flat: 0 },
    { upto: 100000, pct: 10 },
    { upto: null, pct: 5 },
  ],
};

// Nama lama, dipertahankan supaya impor yang sudah ada tidak putus.
export const FEES = {
  iklan_barang: TARIF_BAWAAN.adBarang,
  iklan_poster: TARIF_BAWAAN.adPoster,
  bump: TARIF_BAWAAN.bump,
  featured_min: TARIF_BAWAAN.featuredPerDay,
  featured_max: TARIF_BAWAAN.featuredMaxPerDay,
  autobump_7_days: TARIF_BAWAAN.autobump_7_days,
};

// `x || bawaan` MEMBUANG angka 0, dan 0 itu nilai yang sah di sini: "gratis".
// Bug yang lahir dari situ tidak kelihatan di kode maupun di panel — pemilik
// menyetel Iklan Poster jadi 0, panel menyimpannya dengan benar, lalu server
// tetap menagih Rp10.000 karena `0 || 10000` bernilai 10000.
export function angkaSetelan(nilai, bawaan) {
  if (nilai === null || nilai === "" || nilai === undefined) return bawaan;
  const n = Number(nilai);
  return Number.isFinite(n) ? n : bawaan;
}

function dariJenjang(tiers, nilai) {
  for (const t of tiers) {
    if (t.upto == null || nilai < t.upto) {
      return t.flat != null ? t.flat : Math.round((nilai * (t.pct || 0)) / 100);
    }
  }
  return null;
}

// Biaya iklan saat memasang (sebelum deal). `pricing` = settings.pricing.
export function adFeeFrom(pricing, type, price = 0) {
  if (type === "poster") return angkaSetelan(pricing?.adPoster, TARIF_BAWAAN.adPoster);
  const p = Number(price) || 0;
  const tiers = Array.isArray(pricing?.adTiers) && pricing.adTiers.length
    ? pricing.adTiers
    : TARIF_BAWAAN.adTiers;
  const hasil = dariJenjang(tiers, p);
  return hasil == null ? TARIF_BAWAAN.adBarang : hasil;
}

// Biaya admin sesudah barang TERJUAL. Daftar jenjang KOSONG artinya memang
// tidak ada komisi — bukan "belum diisi", jadi jangan jatuh ke bawaan.
export function soldFeeFrom(pricing, price) {
  const p = Number(price) || 0;
  const tiers = Array.isArray(pricing?.soldTiers) ? pricing.soldTiers : TARIF_BAWAAN.soldTiers;
  const hasil = dariJenjang(tiers, p);
  return hasil == null ? 0 : hasil;
}

export function featuredRateFrom(pricing, perDayReq) {
  const min = angkaSetelan(pricing?.featuredPerDay, TARIF_BAWAAN.featuredPerDay);
  const max = angkaSetelan(pricing?.featuredMaxPerDay, min);
  if (perDayReq == null) return min;
  return Math.min(max, Math.max(min, Number(perDayReq) || min));
}

// Tidak ada lagi pembungkus "tanpa setelan" di sini. Dulu ada `adFee(type, price)`
// dan `soldFee(price)` yang memakai angka keras, dan justru itu yang dipakai
// seluruh layar sementara server menagih dari database. Menghapusnya membuat
// kekeliruan yang sama tidak bisa terulang diam-diam: sekarang setiap pemanggil
// WAJIB menyodorkan `pricing`, dan yang belum memuatnya tetap dapat jawaban benar
// lewat TARIF_BAWAAN karena `adFeeFrom(undefined, ...)` jatuh ke sana sendiri.

export function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
