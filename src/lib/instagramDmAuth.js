import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { sendWa } from "@/lib/fonnte";
import { generateDefaultSlug } from "@/lib/toko";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const MAX_ATTEMPTS = 3;

// In-memory fallback challenge store jika tabel belum dibuat di database lokal/test
const fallbackChallenges = new Map();
const fallbackLinks = new Map();

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "kampuskita-ig-link-salt";
}

export function hashOtp(otp) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(String(otp || "").trim())
    .digest("hex");
}

export function generateNumericOtp() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Cek apakah Instagram Sender ID sudah ditautkan ke akun WhatsApp penjual
 */
export async function getLinkedSeller(igSenderId) {
  const cleanSender = String(igSenderId || "").trim();
  if (!cleanSender) return { linked: false };

  // 1. Cek memory fallback
  if (fallbackLinks.has(cleanSender)) {
    const mem = fallbackLinks.get(cleanSender);
    return { linked: true, wa: mem.wa, campus: mem.campus || "Semua", profile: mem.profile };
  }

  try {
    const supa = getAdminClient();
    const { data: link, error: linkErr } = await supa
      .from("ig_seller_links")
      .select("ig_sender_id, wa, campus, linked_at")
      .eq("ig_sender_id", cleanSender)
      .maybeSingle();

    if (linkErr || !link) {
      return { linked: false };
    }

    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", link.wa)
      .maybeSingle();

    return {
      linked: true,
      wa: link.wa,
      campus: link.campus || "Semua",
      profile: profile || { wa: link.wa, name: "Penjual Kampus" },
    };
  } catch (err) {
    console.warn("[getLinkedSeller] database query error:", err?.message);
    return { linked: false };
  }
}

/**
 * Buat tantangan OTP penautan akun baru dan kirim via WhatsApp
 */
export async function createLinkChallenge({ igSenderId, wa, campus = "Semua" }) {
  const cleanSender = String(igSenderId || "").trim();
  const cleanWa = formatWa(wa);

  if (!cleanSender) return { ok: false, message: "ID Instagram tidak valid." };
  if (!cleanWa || cleanWa.length < 10) return { ok: false, message: "Nomor WhatsApp tidak valid." };

  const supa = getAdminClient();

  // Rate limit: cek permintaan pending dalam 10 menit terakhir
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supa
      .from("ig_link_challenges")
      .select("id", { count: "exact", head: true })
      .or(`ig_sender_id.eq.${cleanSender},wa.eq.${cleanWa}`)
      .gte("created_at", tenMinsAgo);

    if ((count || 0) >= 3) {
      return {
        ok: false,
        message: "Terlalu banyak permintaan verifikasi. Silakan tunggu 10 menit sebelum mencoba lagi.",
      };
    }
  } catch {
    // Non-fatal jika tabel belum ada
  }

  const otp = generateNumericOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Simpan challenge ke DB
  let dbSaved = false;
  try {
    const { error: insErr } = await supa.from("ig_link_challenges").insert({
      ig_sender_id: cleanSender,
      wa: cleanWa,
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      campus,
      expires_at: expiresAt,
      status: "pending",
    });
    if (!insErr) dbSaved = true;
  } catch (err) {
    console.warn("[createLinkChallenge] DB insert error, using fallback memory:", err?.message);
  }

  // Fallback memory jika DB belum dimigrasikan
  if (!dbSaved) {
    fallbackChallenges.set(`${cleanWa}`, {
      ig_sender_id: cleanSender,
      wa: cleanWa,
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      campus,
      expires_at: expiresAt,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  }

  // Kirim OTP via WhatsApp
  const waMsg = [
    "🔐 *Kode Verifikasi Penautan Kampus Kita*",
    "",
    `Kode verifikasi Anda adalah: *${otp}*`,
    "Masa berlaku: 5 menit.",
    "",
    `Balas pesan ini dengan: *VERIF ${otp}*`,
    "Atau ketik 6 digit kode di atas pada Instagram DM.",
    "",
    "⚠️ *PENTING:* Jangan berikan kode ini kepada siapa pun. Admin Kampus Kita tidak pernah meminta kode rahasia atau kata sandi Anda.",
  ].join("\n");

  try {
    await sendWa(cleanWa, waMsg);
  } catch (sendErr) {
    console.error("[createLinkChallenge] sendWa error:", sendErr?.message);
  }

  return { ok: true, wa: cleanWa, expiresAt, _debugOtp: process.env.NODE_ENV === "test" ? otp : undefined };
}

/**
 * Verifikasi kode OTP (baik dibalas lewat bot WA atau diketik di IG DM)
 */
export async function verifyLinkChallenge({ wa, otpInput, igSenderId = null }) {
  const cleanWa = formatWa(wa);
  const cleanOtp = String(otpInput || "").trim().replace(/\D/g, "");

  if (!cleanWa) return { ok: false, message: "Nomor WhatsApp tidak valid." };
  if (!cleanOtp || cleanOtp.length !== 6) return { ok: false, message: "Kode OTP harus berupa 6 digit angka." };

  const supa = getAdminClient();
  const inputHash = hashOtp(cleanOtp);
  const now = new Date();

  // 1. Cari challenge di Supabase
  let challenge = null;
  let isFromDb = false;

  try {
    let q = supa
      .from("ig_link_challenges")
      .select("*")
      .eq("wa", cleanWa)
      .eq("status", "pending");

    if (igSenderId) {
      q = q.eq("ig_sender_id", igSenderId);
    }

    const { data, error } = await q
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      challenge = data[0];
      isFromDb = true;
    }
  } catch {
    // Non-fatal
  }

  // 2. Fallback memory
  if (!challenge && fallbackChallenges.has(cleanWa)) {
    const mem = fallbackChallenges.get(cleanWa);
    if (mem.status === "pending" && (!igSenderId || mem.ig_sender_id === igSenderId)) {
      challenge = mem;
    }
  }

  if (!challenge) {
    return { ok: false, message: "Tidak ada permintaan verifikasi aktif untuk nomor ini atau kode telah kedaluwarsa." };
  }

  // Cek masa berlaku
  if (new Date(challenge.expires_at) < now) {
    if (isFromDb) {
      await supa.from("ig_link_challenges").update({ status: "expired" }).eq("id", challenge.id);
    } else {
      challenge.status = "expired";
    }
    return { ok: false, message: "Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru." };
  }

  // Cek batas percobaan
  if (challenge.attempts >= challenge.max_attempts) {
    if (isFromDb) {
      await supa.from("ig_link_challenges").update({ status: "failed" }).eq("id", challenge.id);
    } else {
      challenge.status = "failed";
    }
    return { ok: false, message: "Batas percobaan terlampaui. Silakan minta kode baru dari Instagram DM." };
  }

  // Validasi hash OTP
  if (challenge.otp_hash !== inputHash) {
    const newAttempts = (challenge.attempts || 0) + 1;
    if (isFromDb) {
      await supa
        .from("ig_link_challenges")
        .update({
          attempts: newAttempts,
          status: newAttempts >= challenge.max_attempts ? "failed" : "pending",
        })
        .eq("id", challenge.id);
    } else {
      challenge.attempts = newAttempts;
      if (newAttempts >= challenge.max_attempts) challenge.status = "failed";
    }
    return { ok: false, message: `Kode verifikasi salah. Sisa percobaan: ${Math.max(0, challenge.max_attempts - newAttempts)}.` };
  }

  // 3. Sukses Verifikasi!
  const targetSenderId = challenge.ig_sender_id;

  if (isFromDb) {
    await supa.from("ig_link_challenges").update({ status: "verified" }).eq("id", challenge.id);
  } else {
    challenge.status = "verified";
  }

  // Pastikan seller_profiles ada
  let profileName = `Pengguna IG (${targetSenderId.slice(-4)})`;
  try {
    const defaultSlug = generateDefaultSlug(profileName, cleanWa);
    await supa.from("seller_profiles").upsert(
      { wa: cleanWa, name: profileName, slug: defaultSlug },
      { onConflict: "wa", ignoreDuplicates: true }
    );
    const { data: p } = await supa.from("seller_profiles").select("name").eq("wa", cleanWa).maybeSingle();
    if (p?.name) profileName = p.name;
  } catch (err) {
    console.warn("[verifyLinkChallenge] seller_profiles upsert:", err?.message);
  }

  // Tautkan IG ke WA
  try {
    await supa.from("ig_seller_links").upsert({
      ig_sender_id: targetSenderId,
      wa: cleanWa,
      campus: challenge.campus || "Semua",
      linked_at: new Date().toISOString(),
    }, { onConflict: "ig_sender_id" });
  } catch (err) {
    console.warn("[verifyLinkChallenge] ig_seller_links upsert fallback to memory:", err?.message);
  }

  // Simpan juga di memory fallback
  fallbackLinks.set(targetSenderId, {
    ig_sender_id: targetSenderId,
    wa: cleanWa,
    campus: challenge.campus || "Semua",
    profile: { wa: cleanWa, name: profileName },
  });

  return {
    ok: true,
    igSenderId: targetSenderId,
    wa: cleanWa,
    profileName,
    campus: challenge.campus || "Semua",
  };
}
