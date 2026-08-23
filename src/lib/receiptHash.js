import crypto from "crypto";

/**
 * Menghitung SHA-256 hash dari buffer gambar struk.
 * @param {Buffer} buffer 
 * @returns {string} hex hash
 */
export function computeImageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Mengecek apakah hash gambar struk sudah pernah terdaftar di database.
 * @param {import("@supabase/supabase-js").SupabaseClient} supa 
 * @param {string} hash 
 * @returns {Promise<{ isDuplicate: boolean, record?: object }>}
 */
export async function checkReceiptHashDuplicate(supa, hash) {
  try {
    const { data, error } = await supa
      .from("receipt_hashes")
      .select("id, payment_id, wa, amount, created_at")
      .eq("hash", hash)
      .maybeSingle();

    if (error) {
      // Jika tabel belum dimigrasi di production, jangan gagalkan alur pembayaran
      console.warn("[receipt-hash] check error / table may not exist yet:", error.message);
      return { isDuplicate: false };
    }

    if (data) {
      return { isDuplicate: true, record: data };
    }
    return { isDuplicate: false };
  } catch (err) {
    console.warn("[receipt-hash] unexpected error checking hash:", err?.message);
    return { isDuplicate: false };
  }
}

/**
 * Menyimpan hash gambar struk setelah pembayaran diverifikasi berhasil.
 * @param {import("@supabase/supabase-js").SupabaseClient} supa 
 * @param {string} hash 
 * @param {object} metadata { payment_id, wa, amount }
 */
export async function saveReceiptHash(supa, hash, { payment_id, wa, amount }) {
  try {
    const { error } = await supa
      .from("receipt_hashes")
      .insert({
        hash,
        payment_id: payment_id || null,
        wa: wa || null,
        amount: amount || null,
      });
    if (error) {
      console.warn("[receipt-hash] save error:", error.message);
    }
  } catch (err) {
    console.warn("[receipt-hash] unexpected error saving hash:", err?.message);
  }
}
