import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { sendWa } from "@/lib/fonnte";
import { findSellerProfileByPhone } from "@/lib/seller-profile-identity";
import { rateLimitDistributed } from "@/lib/rateLimit";
import { resolveInstagramUserId } from "@/lib/instagramDm";
import { getSettings, isAllowedCampus } from "@/lib/settings";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const MAX_ATTEMPTS = 3;

// In-memory state dipakai hanya oleh test terisolasi. Production selalu fail closed.
const fallbackChallenges = new Map();
const fallbackLinks = new Map();

/** Resolve the campus from the signed webhook recipient, never from chat input. */
export async function resolveInstagramCampus(recipientId) {
  const recipient = String(recipientId || "").trim();
  if (!recipient) return process.env.NODE_ENV === "test" ? "Semua" : null;

  try {
    const supa = getAdminClient();
    const { data: accountMap, error } = await supa
      .from("system_settings")
      .select("value")
      .eq("key", "instagram_campus_accounts")
      .maybeSingle();
    if (error) return null;

    const mappedCampus = accountMap?.value?.[recipient];
    if (mappedCampus) {
      const settings = await getSettings();
      return isAllowedCampus(mappedCampus, settings) ? mappedCampus : null;
    }

    // Compatibilitas sementara untuk akun katalog gabungan yang sudah ada.
    const catalogId = await resolveInstagramUserId("katalog");
    return catalogId && recipient === String(catalogId) ? "Semua" : null;
  } catch {
    return null;
  }
}

function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "test") return "test-only-ig-link-secret";
  throw new Error("SESSION_SECRET belum dikonfigurasi untuk OTP penautan Instagram.");
}

export function hashOtp(otp) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(String(otp || "").trim())
    .digest("hex");
}

function matchesOtpHash(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""), "hex");
  const expectedBuffer = Buffer.from(String(expected || ""), "hex");
  return actualBuffer.length === expectedBuffer.length && actualBuffer.length > 0 &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function generateNumericOtp() {
  return String(crypto.randomInt(100000, 1_000_000));
}

/**
 * Cek apakah Instagram Sender ID sudah ditautkan ke akun WhatsApp penjual
 */
export async function getLinkedSeller(igSenderId) {
  const cleanSender = String(igSenderId || "").trim();
  if (!cleanSender) return { linked: false };

  // Memory hanya untuk unit test; jangan pernah menganggap cache proses sebagai tautan produksi.
  if (process.env.NODE_ENV === "test" && fallbackLinks.has(cleanSender)) {
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

    if (linkErr) return { linked: false, error: "storage_unavailable" };
    if (!link) return { linked: false };

    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", link.wa)
      .maybeSingle();

    if (!profile) return { linked: false, error: "profile_unavailable" };
    const sellerWa = formatWa(profile.phone_wa || profile.wa);
    if (!sellerWa) return { linked: false, error: "profile_phone_unavailable" };

    return {
      linked: true,
      // wa untuk listing/kontak; profileWa adalah identitas kanonis profil JB.
      wa: sellerWa,
      profileWa: profile.wa,
      campus: link.campus || "Semua",
      profile,
    };
  } catch (err) {
    console.error("[getLinkedSeller] Database lookup failed.");
    return { linked: false, error: "storage_unavailable" };
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

  if (process.env.NODE_ENV !== "test" && !process.env.SESSION_SECRET) {
    return { ok: false, message: "Layanan verifikasi belum siap. Silakan coba lagi nanti." };
  }

  // Jangan izinkan penggantian identitas IG yang sudah ditautkan lewat alur OTP biasa.
  try {
    const { data: existingLink, error: linkError } = await supa
      .from("ig_seller_links")
      .select("ig_sender_id")
      .eq("ig_sender_id", cleanSender)
      .maybeSingle();
    if (linkError) return { ok: false, message: "Status akun belum dapat diperiksa." };
    if (existingLink) return { ok: false, message: "Akun Instagram ini sudah tertaut. Hubungi admin jika perlu mengganti akun." };

    const [igLimit, waLimit] = await Promise.all([
      rateLimitDistributed(`ig_link:sender:${cleanSender}`, { limit: 3, windowMs: 600_000 }),
      rateLimitDistributed(`ig_link:phone:${cleanWa}`, { limit: 3, windowMs: 600_000 }),
    ]);
    if (!igLimit.ok || !waLimit.ok) {
      return {
        ok: false,
        message: "Terlalu banyak permintaan verifikasi. Silakan tunggu 10 menit sebelum mencoba lagi.",
      };
    }
  } catch {
    return { ok: false, message: "Layanan verifikasi sedang tidak tersedia." };
  }

  const otp = generateNumericOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Simpan challenge ke database sebelum mengirim kode. Production tidak memakai cache proses.
  let savedChallenge = false;
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
    if (!insErr) savedChallenge = true;
  }
  catch {
    savedChallenge = false;
  }
  if (!savedChallenge) {
    return { ok: false, message: "Kode verifikasi belum dapat disiapkan. Coba lagi nanti." };
  }

  // Kirim OTP via WhatsApp
  const waMsg = [
    "🔐 *Kode Verifikasi Penautan Kampus Kita*",
    "",
    `Kode verifikasi Anda adalah: *${otp}*`,
    "Masa berlaku: 5 menit.",
    "",
    `Balas pesan ini dengan: *VERIF ${otp}*`,
    "Masukkan 6 digit kode ini hanya pada proses verifikasi di Instagram DM yang kamu mulai.",
    "",
    "⚠️ *PENTING:* Jangan berikan kode ini kepada siapa pun. Admin Kampus Kita tidak pernah meminta kode rahasia atau kata sandi Anda.",
  ].join("\n");

  try {
    const delivery = await sendWa(cleanWa, waMsg, null, 300);
    if (!delivery?.ok) {
      await supa.from("ig_link_challenges").delete().eq("ig_sender_id", cleanSender).eq("wa", cleanWa).eq("otp_hash", otpHash);
      return { ok: false, message: "Kode verifikasi gagal dikirim. Coba lagi nanti." };
    }
  } catch {
    await supa.from("ig_link_challenges").delete().eq("ig_sender_id", cleanSender).eq("wa", cleanWa).eq("otp_hash", otpHash);
    return { ok: false, message: "Layanan WhatsApp sedang tidak tersedia. Coba lagi nanti." };
  }

  return { ok: true, wa: cleanWa, expiresAt, _debugOtp: process.env.NODE_ENV === "test" ? otp : undefined };
}

/**
 * Verifikasi OTP yang diketik pengguna di DM IG setelah kode dikirim ke WA.
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

  // In-memory challenge hanya aktif untuk unit test.
  if (process.env.NODE_ENV === "test" && !challenge && fallbackChallenges.has(cleanWa)) {
    const mem = fallbackChallenges.get(cleanWa);
    if (mem.status === "pending" && (!igSenderId || mem.ig_sender_id === igSenderId)) {
      challenge = mem;
    }
  }

  if (!challenge && !isFromDb) {
    return { ok: false, message: "Tidak ada permintaan verifikasi aktif untuk nomor ini atau kode telah kedaluwarsa." };
  }

  // Cek masa berlaku
  if (new Date(challenge.expires_at) < now) {
    if (isFromDb) {
      await supa.from("ig_link_challenges").update({ status: "expired" }).eq("id", challenge.id).eq("status", "pending");
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
  if (!matchesOtpHash(inputHash, challenge.otp_hash)) {
    const newAttempts = (challenge.attempts || 0) + 1;
    if (isFromDb) {
      const { data: attemptUpdate, error: attemptError } = await supa
        .from("ig_link_challenges")
        .update({
          attempts: newAttempts,
          status: newAttempts >= challenge.max_attempts ? "failed" : "pending",
        })
        .eq("id", challenge.id)
        .eq("status", "pending")
        .eq("attempts", challenge.attempts)
        .select("id")
        .maybeSingle();
      if (attemptError || !attemptUpdate) {
        return { ok: false, message: "Percobaan OTP sedang diproses. Coba lagi sebentar." };
      }
    } else {
      challenge.attempts = newAttempts;
      if (newAttempts >= challenge.max_attempts) challenge.status = "failed";
    }
    return { ok: false, message: `Kode verifikasi salah. Sisa percobaan: ${Math.max(0, challenge.max_attempts - newAttempts)}.` };
  }

  // 3. Sukses Verifikasi!
  const targetSenderId = challenge.ig_sender_id;

  // Tautkan hanya ke profil JB yang sudah ada. OTP membuktikan kepemilikan WA,
  // tetapi tidak membuat akun web baru atau menetapkan kata sandi lewat DM.
  let profile;
  try {
    let profileResult = await findSellerProfileByPhone(supa, cleanWa, "*");
    if (profileResult.error) {
      // Compatibilitas untuk skema lama yang belum memiliki phone_wa.
      profileResult = await supa.from("seller_profiles").select("*").eq("wa", cleanWa).maybeSingle();
    }
    if (profileResult.error) return { ok: false, message: "Profil akun belum dapat diperiksa. Coba lagi nanti." };
    profile = profileResult.data;
    if (!profile) {
      return { ok: false, message: "Nomor ini belum terhubung ke akun Jual Beli. Daftar atau masuk di situs resmi, lalu ulangi penautan." };
    }
  } catch {
    return { ok: false, message: "Profil akun belum dapat diperiksa. Coba lagi nanti." };
  }

  if (isFromDb) {
    const { data: consumed, error: consumeError } = await supa
      .from("ig_link_challenges")
      .update({ status: "verified" })
      .eq("id", challenge.id)
      .eq("status", "pending")
      .eq("attempts", challenge.attempts)
      .select("id")
      .maybeSingle();
    if (consumeError || !consumed) {
      return { ok: false, message: "Kode sudah digunakan atau perlu diminta ulang." };
    }
  } else {
    challenge.status = "verified";
  }

  const profileName = profile.name || "Penjual Kampus";
  try {
    const { error: linkError } = await supa.from("ig_seller_links").insert({
      ig_sender_id: targetSenderId,
      wa: profile.wa,
      campus: challenge.campus || "Semua",
      linked_at: new Date().toISOString(),
    });
    if (linkError) return { ok: false, message: "Akun belum dapat ditautkan. Minta kode baru dan coba lagi." };

    if (process.env.NODE_ENV === "test") {
      fallbackLinks.set(targetSenderId, {
        ig_sender_id: targetSenderId,
        wa: formatWa(profile.phone_wa || profile.wa),
        profileWa: profile.wa,
        campus: challenge.campus || "Semua",
        profile,
      });
    }

    return {
      ok: true,
      igSenderId: targetSenderId,
      wa: formatWa(profile.phone_wa || profile.wa),
      profileWa: profile.wa,
      profileName,
      campus: challenge.campus || "Semua",
    };
  } catch {
    return { ok: false, message: "Profil akun belum dapat ditautkan. Coba lagi nanti." };
  }
}
