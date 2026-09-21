// Rate limiter sederhana berbasis memory. Cukup sebagai lapisan pertahanan
// pertama untuk skala Marketplace.
//
// Catatan: di serverless (Vercel) memory TIDAK dibagi antar-instance, jadi ini
// bukan jaminan ketat — untuk batas keras gunakan Vercel Firewall / Upstash.

const hits = new Map(); // key -> array timestamp (ms)

export function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// { ok: true } atau { ok: false, retryAfter: <detik> }
export function rateLimit(key, { limit = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);

  if (arr.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter };
  }

  arr.push(now);
  hits.set(key, arr);

  // Bersihkan sesekali agar Map tidak membengkak tanpa batas.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }
  return { ok: true };
}

/**
 * Rate limiter serverless terdistribusi.
 * Memakai Upstash Redis REST API bila UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN tersedia,
 * dengan fallback aman ke in-memory sliding window bila belum dikonfigurasi.
 */
export async function rateLimitDistributed(key, { limit = 5, windowMs = 60_000 } = {}) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return rateLimit(key, { limit, windowMs });
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const redisKey = `rl:${key}`;
    // Pipeline INCR & EXPIRE via Upstash REST API
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec],
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      return rateLimit(key, { limit, windowMs });
    }

    const data = await res.json();
    const count = Number(data?.[0]?.result || 1);

    if (count > limit) {
      return { ok: false, retryAfter: windowSec };
    }

    return { ok: true };
  } catch {
    // Graceful fallback ke in-memory jika jaringan redis bermasalah
    return rateLimit(key, { limit, windowMs });
  }
}

