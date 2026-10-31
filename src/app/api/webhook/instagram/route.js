import { NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/instagramDm";
import { handleInstagramDmEvent } from "@/lib/instagramDmRouter";

export const dynamic = "force-dynamic";

/**
 * GET: Verifikasi Webhook Meta (Handshake saat setup di Meta Developer Dashboard)
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const configuredToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const isTokenValid =
    token === "kampuskita_meta_webhook_token" ||
    (configuredToken && token === configuredToken) ||
    (process.env.CRON_SECRET && token === process.env.CRON_SECRET);

  if (mode === "subscribe" && isTokenValid) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST: Penerima event pesan masuk dari Meta Instagram Messaging API
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET;

    // Verifikasi signature jika secret dikonfigurasi
    if (appSecret && !verifyMetaSignature(rawBody, signature, appSecret)) {
      console.warn("Instagram Webhook: Signature tidak valid");
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

          const text = event.message?.text || "";
          const quickReplyPayload =
            event.message?.quick_reply?.payload ||
            event.postback?.payload ||
            "";
          const attachments = Array.isArray(event.message?.attachments)
            ? event.message.attachments
            : [];

          // Proses alur DM (Jual Barang, Menfess, Cari Barang)
          try {
            await handleInstagramDmEvent({
              senderId,
              recipientId,
              text,
              quickReplyPayload,
              attachments,
            });
          } catch (eventErr) {
            console.error("Gagal memproses event Instagram DM:", eventErr);
          }
        }
      }

      // Meta mengharuskan HTTP 200 respon cepat agar tidak mengirim ulang
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "IGNORED" }, { status: 200 });
  } catch (err) {
    console.error("Instagram Webhook Handler Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

