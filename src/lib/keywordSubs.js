import { formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import { rupiah } from "@/lib/fees";
import { sendWa } from "@/lib/fonnte";

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
}

/**
 * Tambah langganan keyword
 */
export async function addKeywordSubscription(supa, buyerWa, keyword) {
  const cleanWa = formatWa(buyerWa) || buyerWa;
  const cleanKw = String(keyword || "").trim().toLowerCase();
  if (!cleanKw || cleanKw.length < 2) {
    return { ok: false, message: "Kata kunci minimal 2 karakter." };
  }
  if (cleanKw.length > 50) {
    return { ok: false, message: "Kata kunci maksimal 50 karakter." };
  }

  // Cek kuota langganan per nomor (max 10 keyword)
  const { count } = await supa
    .from("keyword_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("buyer_wa", cleanWa);

  if ((count || 0) >= 10) {
    return { ok: false, message: "Maksimal memantau 10 kata kunci per nomor WA. Hapus pantauan lama dengan *.PANTAU OFF [kata kunci]* terlebih dahulu." };
  }

  const { error } = await supa
    .from("keyword_subscriptions")
    .upsert({ buyer_wa: cleanWa, keyword: cleanKw }, { onConflict: "buyer_wa,keyword" });

  if (error) {
    console.error("[keyword-subs] upsert error:", error.message);
    return { ok: false, message: "Gagal menyimpan pantauan kata kunci." };
  }

  return { ok: true, keyword: cleanKw };
}

/**
 * Hapus langganan keyword
 */
export async function removeKeywordSubscription(supa, buyerWa, keyword) {
  const cleanWa = formatWa(buyerWa) || buyerWa;
  const cleanKw = String(keyword || "").trim().toLowerCase();

  let query = supa.from("keyword_subscriptions").delete().eq("buyer_wa", cleanWa);
  if (cleanKw && cleanKw !== "all" && cleanKw !== "semua") {
    query = query.eq("keyword", cleanKw);
  }

  const { error, count } = await query;
  if (error) {
    console.error("[keyword-subs] delete error:", error.message);
    return { ok: false, message: "Gagal menghapus pantauan." };
  }

  return { ok: true, removedCount: count };
}

/**
 * Daftar langganan keyword milik user
 */
export async function listKeywordSubscriptions(supa, buyerWa) {
  const cleanWa = formatWa(buyerWa) || buyerWa;
  const { data, error } = await supa
    .from("keyword_subscriptions")
    .select("id, keyword, created_at")
    .eq("buyer_wa", cleanWa)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[keyword-subs] list error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Notifikasi ke subscriber keyword saat ada iklan baru tayang
 */
export async function notifyKeywordSubscribers(supa, listing) {
  try {
    if (!listing || !listing.title) return;
    const titleLower = (listing.title || "").toLowerCase();
    const descLower = (listing.description || "").toLowerCase();
    const fullText = `${titleLower} ${descLower}`;

    const { data: subs, error } = await supa
      .from("keyword_subscriptions")
      .select("id, buyer_wa, keyword");

    if (error || !subs?.length) return;

    // Filter yang cocok dengan kata kunci
    const matchedSubs = subs.filter(s => {
      if (!s.keyword) return false;
      // Jangan notif ke penjualnya sendiri
      if (s.buyer_wa === listing.seller_wa) return false;
      return fullText.includes(s.keyword.toLowerCase());
    });

    if (!matchedSubs.length) return;

    const url = `${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
    const imageUrl = listing.image_url || null;

    // Supaya satu buyer tidak dapat spam kalau matching multi-keyword dari 1 iklan
    const seenBuyer = new Set();

    for (const sub of matchedSubs) {
      if (seenBuyer.has(sub.buyer_wa)) continue;
      seenBuyer.add(sub.buyer_wa);

      const msg =
        ` *Iklan Baru Sesuai Pantauanmu!*\n\n` +
        `Ada barang yang cocok dengan kata kunci pantauan *"${sub.keyword}"*:\n\n` +
        ` *${listing.title}*\n` +
        ` ${rupiah(listing.price)}\n` +
        ` Kampus: ${listing.campus || "Semua"}\n` +
        ` Penjual: ${listing.seller_name || "Penjual"}\n\n` +
        ` Lihat detail barang:\n${url}\n\n` +
        `_Ingin berhenti memantau? Balas: *.PANTAU OFF ${sub.keyword}*_`;

      await sendWa(sub.buyer_wa, msg, imageUrl).catch(() => {});
      // Jeda 2 detik
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("[keyword-subs-notify] error:", err?.message);
  }
}
