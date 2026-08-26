import { hashIdentitas } from "@/lib/identitasHash";
import { adalahIdSintetis } from "@/lib/constants";
import { censorProfanity } from "@/lib/profanity";
import { BATAS, potong, normalisasiInstagram, normalisasiGmaps, aksenAman } from "@/lib/toko";

/*
 * Satu pintu untuk profil — satu tempat yang tahu apa isi sebuah profil,
 * siapa pemakainya, dan field mana milik siapa.
 *
 * Sebelum ini ada, "profil" disunting dari empat formulir yang tidak saling
 * kenal: panel Biodata di dashboard, halaman /dashboard/toko, formulir
 * pendaftaran organisasi, dan modal foto Cari Teman. Keempatnya menulis ke
 * tabel yang sama dengan aturan sendiri-sendiri, dan tiga dari empat menulis
 * kolom yang tidak ada — masing-masing gagal diam-diam dengan caranya sendiri.
 *
 * Yang dipersatukan di sini adalah ATURANNYA, bukan tampilannya. Tampilan
 * boleh berbeda (toko memang butuh ruang lebih luas daripada biodata), tapi
 * "field apa yang boleh diisi peran apa" hanya ditulis sekali, di sini.
 */

// ── Kolom nyata seller_profiles yang relevan ke profil ────────────────────────
// Diverifikasi ke skema produksi 26 Agustus 2026. `photo_url`, `whatsapp`,
// `instagram`, `id`, dan `updated_at` sengaja TIDAK ada di sini: keempatnya
// pernah dipakai kode dan tidak satu pun ada di tabel. Nomor pemilik adalah
// kunci utama `wa`; fotonya `avatar_url`.
export const KOLOM_PROFIL =
  "wa, name, bio, campus, faculty, avatar_url, anonymous_name, " +
  "account_type, ukm_name, ukm_category, ukm_instagram, ukm_verified, " +
  "slug, store_name, tagline, logo_url, banner_url, store_area, store_hours, " +
  "store_instagram, store_gmaps, store_accent, store_open, store_announcement, " +
  "store_status, store_requested_at, store_approved_at, store_reject_note, " +
  "store_updated_at, trusted_seller, distributor, subscription_tier, " +
  "subscription_expires_at, referral_code, free_bumps, email, auth_provider, created_at";

/*
 * Peran bukan satu pilihan, melainkan lapisan yang bisa menumpuk.
 *
 * Seorang ketua UKM bisa sekaligus punya toko dan ikut Cari Teman. Kalau peran
 * diperlakukan sebagai satu nilai ("dia UKM"), fitur tokonya hilang begitu ia
 * mendaftarkan organisasinya. Jadi yang dijawab di sini bukan "dia apa",
 * melainkan "lapisan apa saja yang menyala untuknya".
 */
export function peranProfil(p) {
  // `store_status` sengaja TIDAK ikut menentukan. Kolom itu punya nilai bawaan
  // 'draf' di basis data, jadi ia terisi untuk SETIAP baris — memakainya berarti
  // ke-173 profil di produksi dianggap punya toko, dan seksi Toko muncul untuk
  // orang yang tidak pernah membukanya. Yang benar-benar menandakan toko adalah
  // sesuatu yang harus diisi manusia: nama atau alamatnya. (Diperiksa 26 Agu
  // 2026: 173 baris punya store_status, hanya 3 punya slug/store_name.)
  const punyaToko = Boolean(p?.slug || p?.store_name);
  return {
    // Semua orang yang punya baris di seller_profiles adalah warga biasa:
    // identitas dasar selalu berlaku, tidak pernah dimatikan peran lain.
    dasar: true,
    toko: punyaToko,
    organisasi: p?.account_type === "ukm" || Boolean(p?.ukm_name),
    distributor: Boolean(p?.distributor),
    // Akun tanpa nomor telepon (daftar lewat email). Bukan peran, tapi ikut
    // menentukan apa yang boleh ditampilkan: tombol "chat via WhatsApp" pada
    // akun begini menunjuk nomor yang tidak ada.
    tanpaNomor: adalahIdSintetis(p?.wa),
  };
}

/*
 * Field yang boleh diubah, dikelompokkan per lapisan.
 *
 * Ditulis sebagai data, bukan sebagai rangkaian `if`, supaya satu-satunya cara
 * menambah field baru adalah menambahkannya ke daftar ini — dan dengan begitu
 * server dan formulir tidak bisa lagi punya pendapat yang berbeda tentang apa
 * yang boleh disimpan.
 */
export const FIELD_DASAR = ["name", "bio", "campus", "faculty", "avatar_url", "anonymous_name"];

export const FIELD_TOKO = [
  "store_name", "tagline", "logo_url", "banner_url", "store_area", "store_hours",
  "store_instagram", "store_gmaps", "store_accent", "store_open", "store_announcement",
];

// Sengaja TANPA `ukm_verified`. Centang resmi diberikan oleh kode undangan di
// /api/organisasi/daftar atau oleh admin — tidak pernah oleh pemiliknya sendiri
// lewat formulir. Memasukkannya ke sini akan mengulang persis lubang yang baru
// ditutup pagi ini, dari pintu yang berbeda.
export const FIELD_ORGANISASI = ["ukm_name", "ukm_category", "ukm_instagram"];

/** Field yang boleh disimpan oleh profil ini, sesuai lapisan yang menyala. */
export function fieldDiizinkan(peran) {
  const f = [...FIELD_DASAR];
  if (peran.toko) f.push(...FIELD_TOKO);
  if (peran.organisasi) f.push(...FIELD_ORGANISASI);
  return f;
}

/**
 * Saring isian mentah menjadi hanya yang boleh ditulis peran ini.
 *
 * Penyaringannya di sisi server, bukan di formulir. Formulir yang tidak
 * menampilkan field toko tidak menghalangi siapa pun mengirim `store_name`
 * lewat curl; yang menghalangi adalah daftar ini.
 */
export function saringIsian(isian, peran) {
  const boleh = new Set(fieldDiizinkan(peran));
  const bersih = {};
  for (const [k, v] of Object.entries(isian || {})) {
    if (boleh.has(k) && v !== undefined) bersih[k] = v;
  }
  return bersih;
}

/*
 * Hanya gambar dari penyimpanan kita sendiri.
 *
 * Tanpa ini, kolom logo/sampul/foto profil bisa diisi URL mana pun — termasuk
 * pelacak yang dimuat ulang setiap kali halaman toko dibuka pengunjung, di
 * halaman yang justru dibangun untuk disebar ke banyak orang.
 *
 * Dulu penjaga ini hanya ada di /api/toko dan hanya menjaga logo & sampul;
 * `avatar_url` — foto yang tampil di kartu iklan, direktori organisasi, dan
 * kartu Cari Teman — tidak dijaga siapa pun. Sekarang ketiganya lewat sini.
 *
 * Hostnya dibaca dari NEXT_PUBLIC_SUPABASE_URL, bukan dipatok ".supabase.co":
 * kalau penyimpanannya suatu saat pindah ke domain sendiri, memaku akhiran itu
 * akan diam-diam menolak setiap gambar yang baru diunggah.
 */
export function bersihkanGambar(nilai) {
  const teks = String(nilai ?? "").trim();
  if (!teks) return null;
  try {
    const u = new URL(teks);
    if (u.protocol !== "https:") return null;
    let hostSah = null;
    try { hostSah = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname; } catch {}
    const sah = hostSah ? u.hostname === hostSah : u.hostname.endsWith(".supabase.co");
    return sah ? u.toString() : null;
  } catch { return null; }
}

const GAMBAR = ["avatar_url", "logo_url", "banner_url"];

const BATAS_IDENTITAS = {
  name: 60, bio: BATAS.bio, campus: 30, faculty: 60,
  anonymous_name: 24, avatar_url: 500, logo_url: 500, banner_url: 500,
  ukm_name: 80, ukm_category: 40,
};

// Teks yang dibaca orang lain lewat sensor yang sama dengan mading & obrolan.
const DISENSOR = ["name", "bio", "anonymous_name", "store_name", "tagline", "store_announcement", "ukm_name"];

/*
 * Pembersihan isian — satu aturan, dipakai /api/profil DAN /api/toko.
 *
 * Batas panjang dan normalisasi field toko datang dari lib/toko.js, tempat
 * mereka sudah lama tinggal; yang ditambahkan di sini hanya field identitas dan
 * organisasi. Menyalinnya ke sini akan mengulang kesalahan yang sedang
 * dibereskan: dua tempat memutuskan hal yang sama, lalu pelan-pelan berbeda —
 * tagline dipotong 90 huruf lewat satu pintu dan 120 lewat pintu lain, dan
 * tidak ada yang tahu mana yang benar.
 */
export function normalisasiIsian(isian) {
  const out = {};
  for (const [k, v] of Object.entries(isian || {})) {
    if (v === undefined) continue;
    if (k === "store_open") { out[k] = v !== false; continue; }
    if (k === "store_instagram" || k === "ukm_instagram") { out[k] = normalisasiInstagram(v); continue; }
    if (k === "store_gmaps") { out[k] = normalisasiGmaps(v); continue; }
    if (k === "store_accent") { out[k] = aksenAman(v); continue; }
    if (GAMBAR.includes(k)) { out[k] = bersihkanGambar(v); continue; }

    const batas = BATAS_IDENTITAS[k] ?? BATAS[k] ?? 300;
    let teks = potong(v, batas);
    if (teks && DISENSOR.includes(k)) teks = censorProfanity(teks);
    out[k] = teks;
  }
  return out;
}

/** Identitas Cari Teman milik profil ini. */
export function userIdTeman(wa) {
  return wa ? hashIdentitas(wa) : null;
}

/**
 * Satu bentuk profil untuk seluruh aplikasi.
 *
 * Menggabungkan baris seller_profiles dengan kartu Cari Teman-nya, lalu
 * menyertakan lapisan perannya. Yang membaca tidak perlu tahu data itu datang
 * dari dua tabel, dan tidak perlu menebak sendiri "ini akun toko atau bukan".
 */
export function bentukProfil(sp, tp) {
  const peran = peranProfil(sp);
  return {
    ...sp,
    peran,
    teman: tp
      ? {
          id: tp.id,
          photo_url: tp.photo_url,
          photo_urls: tp.photo_urls,
          display_name: tp.display_name,
          batch: tp.batch,
          intent: tp.intent,
          instagram: tp.instagram,
          gender: tp.gender,
          target_gender: tp.target_gender,
          is_active: tp.is_active,
        }
      : null,
    // Nomor yang bisa dihubungi — kosong untuk akun daftar-lewat-email, supaya
    // pemakainya tidak menampilkan tombol WhatsApp ke nomor yang tidak ada.
    nomor: peran.tanpaNomor ? "" : sp?.wa || "",
  };
}
