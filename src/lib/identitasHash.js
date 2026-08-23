import crypto from "crypto";

// Hash satu arah untuk identitas pengunjung anonim (IP, user_identifier).
//
// Kolom seperti mading_posts.author_ip_hash ada untuk satu hal: kalau terjadi
// pencemaran nama baik atau spam, pelakunya bisa dikaitkan antar-postingan dan
// diblokir — tanpa pernah menyimpan IP mentah di database yang datanya bisa
// bocor. Garamnya dari env supaya hash-nya tidak bisa dihitung ulang oleh orang
// yang cuma memegang isi database.
const GARAM =
  process.env.IP_HASH_SALT || process.env.CRON_SECRET || "jbup-garam-bawaan";

export function hashIdentitas(nilai) {
  if (!nilai) return null;
  return crypto
    .createHash("sha256")
    .update(`${GARAM}:${String(nilai)}`)
    .digest("hex");
}
