// Jembatan hash -> WA untuk push notification chat anonim.
//
// chat_rooms.user1_id/user2_id sengaja berupa hash satu arah (lihat
// identitasHash.js) supaya lawan bicara tidak pernah tahu nomor asli siapa
// pun. Tapi untuk mengabari orang yang sudah pergi ("ada yang cocok!"),
// server butuh nomor aslinya. Tabel chat_identity_wa menyimpan pemetaan itu
// TERPISAH dari chat_rooms, supaya query `select("*")` di mana pun terhadap
// chat_rooms tidak bisa pernah membocorkan nomor WA ke klien.
export async function catatIdentitasWa(supa, userHash, wa) {
  if (!userHash || !wa) return;
  try {
    await supa
      .from("chat_identity_wa")
      .upsert({ user_hash: userHash, wa, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error("[chat] Gagal mencatat identitas untuk push:", e?.message || e);
  }
}

export async function cariWaDariHash(supa, userHash) {
  if (!userHash) return null;
  const { data } = await supa
    .from("chat_identity_wa")
    .select("wa")
    .eq("user_hash", userHash)
    .maybeSingle();
  return data?.wa || null;
}
