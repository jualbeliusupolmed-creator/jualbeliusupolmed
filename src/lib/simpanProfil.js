import { getAdminClient } from "@/lib/supabaseAdmin";
import { periksaSlug } from "@/lib/toko";
import {
  KOLOM_PROFIL, peranProfil, saringIsian, normalisasiIsian, bentukProfil, userIdTeman,
} from "@/lib/profil";

/*
 * Satu-satunya penulis profil.
 *
 * Sebelum ini ada, `seller_profiles` ditulis dari empat tempat dengan empat
 * aturan. Yang paling mahal bukan duplikasinya, melainkan bahwa aturan yang
 * SAMA dijaga di satu tempat dan tidak di tempat lain — dan tidak ada yang tahu
 * tempat mana yang sedang dipakai.
 *
 * Contohnya nyata: aturan "ganti alamat toko yang sudah disetujui = harus
 * ditinjau ulang" ditulis rapi di /api/toko, lengkap dengan alasannya. Tapi
 * beberapa baris di bawahnya ada cadangan yang, kalau penyimpanan gagal,
 * mengulang tanpa `store_status` dan `store_requested_at`. Karena `store_gmaps`
 * tidak pernah ada di tabel, penyimpanan SELALU gagal, cadangannya SELALU
 * dipakai, dan yang dihapusnya persis kedua kolom yang menegakkan aturan itu.
 * Aturannya ada di kode, terbaca meyakinkan, dan tidak pernah sekali pun
 * berlaku.
 */

/** Apa yang boleh diubah, sudah dibersihkan, plus akibatnya pada status toko. */
export async function simpanProfil(wa, body, { supa = getAdminClient() } = {}) {
  const { data: sekarang, error: galatBaca } = await supa
    .from("seller_profiles").select(KOLOM_PROFIL).eq("wa", wa).maybeSingle();
  if (galatBaca) return { error: galatBaca, pesan: "Gagal memuat profil." };

  // Peran dibaca dari baris TERSIMPAN, bukan dari body. Kalau dibaca dari body,
  // siapa pun tinggal mengirim `account_type: "ukm"` untuk membuka field
  // organisasi bagi dirinya sendiri.
  const peran = peranProfil(sekarang || { wa });

  // Membuka toko adalah layanan mandiri; DISETUJUI tidak.
  //
  // Lapisan toko menyala dari `slug`/`store_name`, jadi orang yang belum punya
  // toko tidak akan pernah bisa mengisi nama tokonya — field-nya disaring
  // justru karena ia belum punya toko. Lingkaran itu diputus di sini: siapa pun
  // boleh menamai tokonya sendiri, dan itu tidak memberi hak apa-apa. Yang
  // menentukan tokonya tayang tetap `store_status`, dan itu hanya bergerak
  // lewat peninjauan admin — bukan lewat formulir ini.
  const membukaToko = typeof body?.store_name === "string" && body.store_name.trim() !== "";

  // Mendaftarkan organisasi juga layanan mandiri, dengan alasan yang sama —
  // dan dengan batas yang sama tegasnya. `/organisasi/daftar` sudah lama
  // terbuka untuk siapa saja tanpa syarat, jadi membiarkannya juga dilakukan
  // dari satu pintu bukan memberi hak baru; ia cuma menghapus keharusan
  // menemukan formulir lain. Yang TIDAK ikut mandiri adalah `ukm_verified`:
  // centang itu disaring keluar oleh FIELD_ORGANISASI dan hanya diberikan oleh
  // rute yang memeriksa kode undangan, atau oleh admin.
  const mendaftarOrganisasi =
    typeof body?.ukm_name === "string" && body.ukm_name.trim() !== "";

  const peranEfektif = {
    ...peran,
    toko: peran.toko || membukaToko,
    organisasi: peran.organisasi || mendaftarOrganisasi,
  };

  const isian = normalisasiIsian(saringIsian(body, peranEfektif));

  // `account_type` tidak pernah dibaca dari body apa adanya — satu-satunya
  // nilai yang boleh dituliskan sendiri adalah "ukm", dan hanya sebagai akibat
  // dari mengisi nama organisasi. Membacanya mentah berarti siapa pun bisa
  // menuliskan nilai apa pun ke kolom yang menentukan peran.
  if (mendaftarOrganisasi && !peran.organisasi) isian.account_type = "ukm";

  // ── Alamat toko ────────────────────────────────────────────────────────────
  // Slug tidak lewat saringIsian karena ia bukan sekadar teks: mengubahnya
  // punya akibat pada status persetujuan, dan bentuknya divalidasi tersendiri.
  let gantiAlamat = false;
  if (body?.slug !== undefined && body.slug !== null && String(body.slug).trim() !== "") {
    if (!peranEfektif.toko && !sekarang?.store_name) {
      return { pesanPengguna: "Isi nama toko dulu sebelum menentukan alamatnya.", status: 400 };
    }
    const hasil = periksaSlug(body.slug);
    if (!hasil.ok) return { pesanPengguna: hasil.alasan, status: 400 };
    if (hasil.slug !== sekarang?.slug) {
      isian.slug = hasil.slug;
      gantiAlamat = Boolean(sekarang?.slug);
    }
  }

  // Persetujuan admin diberikan untuk sebuah nama di sebuah alamat. Kalau
  // alamatnya boleh diganti sesudahnya tanpa ditinjau, izin untuk
  // "warung-ridho" bisa berpindah ke "admin-resmi" tanpa seorang pun melihatnya
  // lagi. Logo, jam buka, dan pengumuman boleh berubah kapan saja.
  if (gantiAlamat) {
    isian.store_status = "menunggu";
    isian.store_requested_at = new Date().toISOString();
  }

  if ("name" in isian && !isian.name) {
    return { pesanPengguna: "Nama wajib diisi.", status: 400 };
  }
  if ((peranEfektif.toko || isian.slug) && "store_name" in isian && !isian.store_name) {
    return { pesanPengguna: "Nama toko wajib diisi.", status: 400 };
  }

  if (Object.keys(isian).length) {
    // Tanpa cadangan yang menghapus kolom. Kalau penyimpanan gagal, itu harus
    // terlihat — bukan diganti diam-diam dengan versi yang membuang justru
    // kolom yang menegakkan aturannya.
    const { error } = await supa
      .from("seller_profiles")
      .upsert({ wa, name: isian.name ?? sekarang?.name ?? isian.store_name ?? "Penjual", ...isian },
              { onConflict: "wa" });
    if (error) {
      // 23505 = pelanggaran unique. Satu-satunya kolom unik yang bisa ditabrak
      // penjual di sini adalah slug, dan pesan bawaan Postgres tidak berguna
      // bagi orang yang cuma ingin menamai tokonya.
      if (error.code === "23505" || /duplicate key/i.test(error.message || "")) {
        return { pesanPengguna: "Alamat toko itu sudah dipakai penjual lain. Coba yang lain.", status: 409 };
      }
      return { error, pesan: "Gagal menyimpan profil." };
    }
  }

  // Satu identitas, satu nama — di profil maupun di setiap kartu iklannya.
  if (isian.name) {
    const { error } = await supa
      .from("listings").update({ seller_name: isian.name }).eq("seller_wa", wa);
    if (error) console.error("[profil] gagal menyeragamkan seller_name:", error.message);
  }

  const galatTeman = await selaraskanKartuTeman(supa, wa, isian, body?.teman, sekarang, peranEfektif);
  if (galatTeman) return galatTeman;

  return { profil: await muatProfil(supa, wa), gantiAlamat };
}

/*
 * Kartu Cari Teman mengikuti biodata, tapi keberadaannya tidak pernah terjadi
 * sebagai efek samping.
 *
 * Menyunting nama di dashboard tidak boleh diam-diam memajang seseorang di
 * fitur perkenalan yang tidak pernah ia buka — foto dan fakultasnya ikut
 * terpampang ke mahasiswa lain tanpa ia meminta. Jadi kartu baru hanya lahir
 * kalau sakelarnya dinyalakan sendiri.
 */
async function selaraskanKartuTeman(supa, wa, isian, t = {}, sekarang, peran) {
  const userId = userIdTeman(wa);
  const { data: kartu } = await supa
    .from("teman_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!kartu && t?.aktif !== true) return null;

  const potong = (v, n) => String(v ?? "").trim().slice(0, n);
  const ikut = {};
  if (isian.name) ikut.display_name = isian.name;
  if ("bio" in isian) ikut.bio = isian.bio;
  if (isian.campus) ikut.campus = isian.campus;
  if (isian.faculty) ikut.faculty = isian.faculty;
  if (isian.avatar_url) ikut.photo_url = isian.avatar_url;
  if (t?.batch !== undefined) ikut.batch = potong(t.batch, 10);
  if (t?.intent !== undefined) ikut.intent = potong(t.intent, 40);
  if (t?.instagram !== undefined) ikut.instagram = potong(String(t.instagram).replace(/^@/, ""), 40);
  if (t?.gender !== undefined) ikut.gender = potong(t.gender, 16);
  if (t?.target_gender !== undefined) ikut.target_gender = potong(t.target_gender, 16);
  if (t?.aktif !== undefined) ikut.is_active = t.aktif !== false;
  ikut.updated_at = new Date().toISOString();

  if (kartu) {
    const { error } = await supa.from("teman_profiles").update(ikut).eq("user_id", userId);
    if (error) console.error("[profil] gagal menyelaraskan kartu teman:", error.message);
    return null;
  }

  // `photo_url` NOT NULL di teman_profiles — kartu tanpa foto ditolak basis
  // data, dan penolakan itu akan terbaca seperti "gagal menyimpan biodata"
  // padahal yang kurang cuma fotonya.
  const foto = ikut.photo_url || isian.avatar_url || sekarang?.avatar_url || "";
  if (!foto) {
    return { pesanPengguna: "Cari Teman butuh satu foto profil. Unggah fotonya dulu, lalu aktifkan lagi.", status: 400 };
  }
  const { error } = await supa.from("teman_profiles").insert({
    user_id: userId,
    photo_url: foto,
    photo_urls: [foto],
    display_name: ikut.display_name || sekarang?.name || "Anak Kampus",
    bio: ikut.bio ?? sekarang?.bio ?? "",
    campus: ikut.campus || sekarang?.campus || "USU",
    faculty: ikut.faculty || sekarang?.faculty || "Umum",
    batch: ikut.batch || "2024",
    intent: ikut.intent || "Teman Santai ",
    instagram: ikut.instagram || "",
    whatsapp: peran.tanpaNomor ? "" : wa,
    gender: ikut.gender || "all",
    target_gender: ikut.target_gender || "all",
    is_active: true,
  });
  if (error) return { error, pesan: "Gagal membuat kartu Cari Teman." };
  return null;
}

export async function muatProfil(supa, wa) {
  const { data: sp } = await supa
    .from("seller_profiles").select(KOLOM_PROFIL).eq("wa", wa).maybeSingle();
  const { data: tp } = await supa
    .from("teman_profiles").select("*").eq("user_id", userIdTeman(wa)).maybeSingle();
  return bentukProfil(sp || { wa }, tp);
}
