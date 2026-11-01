import { NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/instagramDm";
import { handleInstagramDmEvent } from "@/lib/instagramDmRouter";

export const dynamic = "force-dynamic";

// In-memory cache untuk deduplikasi event Meta (mencegah double-execution saat Meta retry)
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000; // 10 menit
const processedEvents = new Map();

function isDuplicateEvent(eventId) {
  if (!eventId) return false;
  const now = Date.now();

  // Bersihkan cache jika sudah menampung lebih dari 2000 event
  if (processedEvents.size > 2000) {
    for (const [id, ts] of processedEvents.entries()) {
      if (now - ts > PROCESSED_EVENT_TTL_MS) processedEvents.delete(id);
    }
  }

  if (processedEvents.has(eventId)) {
    const ts = processedEvents.get(eventId);
    if (now - ts < PROCESSED_EVENT_TTL_MS) {
      return true;
    }
  }

  processedEvents.set(eventId, now);
  return false;
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
 * Wajib memvalidasi tanda tangan HMAC-SHA256 menggunakan `META_APP_SECRET`.
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET;

    // Gerbang Keamanan: Tolak jika secret server belum disetel
    if (!appSecret) {
      console.error("[Instagram Webhook POST] META_APP_SECRET belum dikonfigurasi di server.");
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
          if (messageId && isDuplicateEvent(messageId)) {
            console.log(`[Instagram Webhook] Event duplikat diabaikan: ${messageId}`);
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
          } catch (eventErr) {
            console.error("[Instagram Webhook] Gagal memproses event Instagram DM:", eventErr);
          }
        }
      }

      // Meta mengharuskan HTTP 200 respon cepat agar tidak mengirim ulang
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "IGNORED" }, { status: 200 });
  } catch (err) {
    console.error("[Instagram Webhook] Handler Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
