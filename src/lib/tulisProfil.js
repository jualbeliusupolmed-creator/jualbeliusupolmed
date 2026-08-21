// Menulis baris seller_profiles yang membawa penanda `wa_verified`, dan tetap
// berhasil kalau kolom itu belum ada di database.
//
// Kolomnya dibuat oleh supabase/migration_daftar_tanpa_otp.sql, yang harus
// dijalankan manual dari SQL Editor. Selama belum dijalankan, PostgREST menolak
// SELURUH baris hanya karena satu kolom asing — dan yang ikut mati bukan
// penandanya, melainkan pendaftaran dan "Lupa PIN": dua-duanya satu-satunya
// pintu masuk yang ada. Penanda verifikasi itu penting; pintu masuk yang jalan
// lebih penting. Jadi: coba dengan penanda, kalau kolomnya tidak ada tulis
// tanpa penanda dan berisik di log supaya migrasinya tidak terlupa selamanya.
function kolomWaVerifiedHilang(error) {
  if (!error) return false;
  // PGRST204 = kolom tidak dikenal di cache skema PostgREST.
  return error.code === "PGRST204" || /wa_verified/.test(error.message || "");
}

// wa diisi → UPDATE baris itu; wa kosong → INSERT baris baru.
// Mengembalikan error Supabase (atau null/undefined kalau berhasil).
export async function tulisProfil(supa, baris, wa = null) {
  const kirim = (isi) => wa
    ? supa.from("seller_profiles").update(isi).eq("wa", wa)
    : supa.from("seller_profiles").insert(isi);

  let { error } = await kirim(baris);
  if (kolomWaVerifiedHilang(error) && "wa_verified" in baris) {
    console.warn(
      "[profil] Kolom wa_verified tidak ada — jalankan supabase/migration_daftar_tanpa_otp.sql "
      + "di Supabase. Baris ditulis tanpa penanda verifikasi."
    );
    const { wa_verified, ...tanpaPenanda } = baris;
    ({ error } = await kirim(tanpaPenanda));
  }
  return error;
}
