// Rate limiter terdistribusi untuk Next.js Serverless (Vercel).
// 1. Upstash Redis REST API (jika UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN ada)
// 2. Supabase atomic RPC hit_rate_limit (menyimpan ke tabel rate_limit_hits)
// 3. Fallback ke in-memory Map (sliding window)

import { getAdminClient } from "@/lib/supabaseAdmin";

const hits = new Map(); // key -> array timestamp (ms)

export function getClientIp(req) {
  if (!req) return "unknown";
  const headers = req.headers;
  if (!headers) return "unknown";

  const xff = typeof headers.get === "function" ? headers.get("x-forwarded-for") : headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();

  const realIp = typeof headers.get === "function" ? headers.get("x-real-ip") : headers["x-real-ip"];
  return realIp ? String(realIp).trim() : "unknown";
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
 */
export async function rateLimitDistributed(key, { limit = 5, windowMs = 60_000 } = {}) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis REST API
  if (redisUrl && redisToken) {
    try {
      const redisKey = `jb_rl:${key}`;
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

      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result || 1);
        if (count > limit) {
          return { ok: false, retryAfter: windowSec };
        }
        return { ok: true };
      }
    } catch {
      // lanjut ke Supabase
    }
  }

  // 2. Supabase atomic RPC hit_rate_limit
  try {
    const supa = getAdminClient();
    if (supa) {
      const { data, error } = await supa.rpc("hit_rate_limit", {
        p_key: key,
        p_window_seconds: windowSec,
      });

      if (!error && typeof data === "number") {
        if (data > limit) {
          return { ok: false, retryAfter: windowSec };
        }
        return { ok: true };
      }
    }
  } catch {
    // lanjut ke in-memory
  }

  // 3. Graceful fallback ke in-memory
  return rateLimit(key, { limit, windowMs });
}
