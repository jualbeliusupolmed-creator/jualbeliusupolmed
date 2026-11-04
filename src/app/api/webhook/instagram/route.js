import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { verifyMetaSignature } from "@/lib/instagramDm";
import { handleInstagramDmEvent } from "@/lib/instagramDmRouter";

export const dynamic = "force-dynamic";

// Cache hanya untuk test lokal. Produksi memakai RPC PostgreSQL yang atomik.
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000; // 10 menit
const processedEvents = new Map();

function claimInMemory(eventId) {
  const now = Date.now();
  pruneTestEventCache();
  const seenAt = processedEvents.get(eventId);
  if (seenAt && now - seenAt < PROCESSED_EVENT_TTL_MS) {
    return { ok: true, duplicate: true, key: eventId, inMemory: true };
  }
  return { ok: true, duplicate: false, key: eventId, inMemory: true };
}

async function claimEvent(eventId) {
  if (!eventId) return { ok: true, duplicate: false, key: null };

  if (process.env.NODE_ENV === "test") {
    return claimInMemory(eventId);
  }

  const key = `ig_webhook:${eventId}`;
  try {
    const admin = getAdminClient();
    if (admin) {
      const { data, error } = await admin.rpc("hit_rate_limit", {
        p_key: key,
        p_window_seconds: Math.floor(PROCESSED_EVENT_TTL_MS / 1000),
      });
      if (!error && Number.isInteger(Number(data))) {
        return { ok: true, duplicate: Number(data) > 1, key };
      }
      if (error) {
        console.error("[Instagram Webhook] Durable event claim failed.", {
          code: error.code || "database_error",
        });
      } else {
        console.error("[Instagram Webhook] Durable event claim returned an invalid result.");
      }
    }
  } catch (error) {
    console.error("[Instagram Webhook] Durable event claim is unavailable.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return { ok: false, duplicate: false, key };
}

async function completeEvent(claim) {
  if (!claim?.key) return;
  if (claim.inMemory || claim.testOnly) {
    processedEvents.set(claim.key, Date.now());
    return;
  }
  // hit_rate_limit created the durable idempotency claim; keep it until TTL.
}

async function releaseEvent(claim) {
  if (!claim?.key) return;
  if (claim.inMemory || claim.testOnly) {
    processedEvents.delete(claim.key);
    return;
  }
  try {
    const admin = getAdminClient();
    if (admin) {
      await admin.from("rate_limit_hits").delete().eq("key", claim.key).catch(() => {});
    }
  } catch {
    console.error("[Instagram Webhook] Could not release failed event claim.");
  }
}

async function cleanupExpiredEventClaims() {
  pruneTestEventCache();
  if (process.env.NODE_ENV === "test") return;
  try {
    const admin = getAdminClient();
    if (admin) {
      await admin
        .from("rate_limit_hits")
        .delete()
        .like("key", "ig_webhook:%")
        .lt("expires_at", new Date().toISOString())
        .catch(() => {});
    }
  } catch {
    // Cleanup is best-effort; event processing itself still fails closed on RPC errors.
  }
}

function pruneTestEventCache() {
  const now = Date.now();
  if (processedEvents.size <= 2000) return;
  for (const [id, ts] of processedEvents.entries()) {
    if (now - ts > PROCESSED_EVENT_TTL_MS) processedEvents.delete(id);
  }
}

/**
 * GET: Verifikasi Webhook Meta (Handshake saat setup di Meta Developer Dashboard)
 * Wajib menggunakan token rahasia dari environment `META_WEBHOOK_VERIFY_TOKEN`.
 * Token konstan/hardcoded dilarang demi keamanan produksi.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const configuredToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!configuredToken) {
    console.error("[Instagram Webhook GET] META_WEBHOOK_VERIFY_TOKEN belum dikonfigurasi.");
    return new Response("Webhook verification token not configured", { status: 503 });
  }

  const isTokenValid = mode === "subscribe" && token === configuredToken;

  if (isTokenValid) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST: Penerima event pesan masuk dari Meta Instagram Messaging API
 * Wajib memvalidasi tanda tangan HMAC-SHA256 menggunakan App Secret Meta.
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET;

    // Gerbang Keamanan: Tolak jika secret server belum disetel
    if (!appSecret) {
      console.error("[Instagram Webhook POST] App Secret Meta belum dikonfigurasi di server.");
      return NextResponse.json({ error: "Server webhook configuration missing" }, { status: 503 });
    }

    // Gerbang Keamanan: Validasi signature wajib ada dan cocok
    if (!signature || !verifyMetaSignature(rawBody, signature, appSecret)) {
      console.warn("[Instagram Webhook POST] Signature tidak valid atau tidak disertakan");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Pastikan event dari objek instagram atau page
    if (payload.object === "instagram" || payload.object === "page") {
      const entries = Array.isArray(payload.entry) ? payload.entry : [];
      let processingFailed = false;

      for (const entry of entries) {
        const messagingEvents = Array.isArray(entry.messaging) ? entry.messaging : [];

        for (const event of messagingEvents) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id;

          // Abaikan pesan yang dikirim oleh bot kita sendiri (echo)
          if (event.message?.is_echo) {
            continue;
          }

          // Idempotensi: deteksi duplikasi ID pesan Meta
          const messageId = event.message?.mid || `${senderId}:${event.timestamp}`;
          const eventClaim = await claimEvent(messageId);
          if (!eventClaim.ok) {
            processingFailed = true;
            continue;
          }
          if (eventClaim.duplicate) {
            console.log("[Instagram Webhook] Event duplikat diabaikan.");
            continue;
          }

          const text = event.message?.text || "";
          const quickReplyPayload =
            event.message?.quick_reply?.payload ||
            event.postback?.payload ||
            "";
          const attachments = Array.isArray(event.message?.attachments)
            ? event.message.attachments
            : [];

          // Proses alur DM (Fokus Fase Jual Barang)
          try {
            await handleInstagramDmEvent({
              senderId,
              recipientId,
              text,
              quickReplyPayload,
              attachments,
            });
            await completeEvent(eventClaim);
          } catch (eventErr) {
            processingFailed = true;
            console.error("[Instagram Webhook] Gagal memproses event Instagram DM:", eventErr?.name || "Error");
            await releaseEvent(eventClaim);
          }
        }
      }

      await cleanupExpiredEventClaims();

      // Meta mengharuskan HTTP 200 respon cepat agar tidak mengirim ulang
      // Minta Meta mengirim ulang bila penanganan event gagal. Event sukses pada
      // instance ini sudah ditandai; dedupe lintas instance memerlukan inbox DB.
      return NextResponse.json(
        { status: processingFailed ? "EVENT_PROCESSING_FAILED" : "EVENT_RECEIVED" },
        { status: processingFailed ? 500 : 200 }
      );
    }

    return NextResponse.json({ status: "IGNORED" }, { status: 200 });
  } catch (err) {
    console.error("[Instagram Webhook] Handler error:", err?.name || "Error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
