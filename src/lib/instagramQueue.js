import { getAdminClient } from "@/lib/supabaseAdmin";
import { postToInstagram } from "@/lib/meta";

const MAX_ATTEMPTS = 3;
const STALE_PROCESSING_MS = 10 * 60_000;

export function siteOriginFromRequest(request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

function retryAt(attempts) {
  const minutes = Math.min(60, 5 * 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function processInstagramQueue({
  table,
  targetColumn,
  targetId = null,
  limit = 3,
  origin,
  credentials,
  loadTarget,
  imagePath,
  captionFor,
  afterStatus,
}) {
  if (!origin || !credentials?.userId || !credentials?.accessToken) {
    throw new Error("Konfigurasi Instagram belum lengkap.");
  }

  const supa = getAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  // Memulihkan worker yang berhenti setelah lock. Container lama tetap dipakai.
  await supa
    .from(table)
    .update({ status: "queued", next_attempt_at: null, updated_at: now })
    .eq("status", "processing")
    .lt("updated_at", staleBefore);

  let query = supa
    .from(table)
    .select(`id, ${targetColumn}, attempts, instagram_container_id, instagram_media_id`)
    .eq("status", "queued")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("queued_at", { ascending: true })
    .limit(Math.max(1, Math.min(10, Number(limit) || 3)));
  if (targetId) query = query.eq(targetColumn, targetId);

  const { data: queued, error } = await query;
  if (error) throw new Error("Antrean Instagram belum tersedia.");

  const results = [];
  for (const item of queued || []) {
    const attempts = (item.attempts || 0) + 1;
    const { data: locked } = await supa
      .from(table)
      .update({ status: "processing", attempts, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!locked) continue;

    if (afterStatus) await afterStatus(supa, item[targetColumn], "processing");

    try {
      const target = await loadTarget(supa, item[targetColumn]);
      if (!target) throw new Error("Konten tidak aktif atau tidak ditemukan.");

      const result = await postToInstagram(
        credentials.userId,
        credentials.accessToken,
        `${origin}${imagePath(target)}`,
        captionFor(target, origin),
        {
          creationId: item.instagram_container_id,
          onContainerCreated: async (containerId) => {
            const { error: containerError } = await supa
              .from(table)
              .update({ instagram_container_id: containerId, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            if (containerError) throw new Error("Gagal menyimpan status media Instagram.");
          },
        },
      );

      const publishedAt = new Date().toISOString();
      const mediaId = result.id || item.instagram_media_id || null;
      const { error: updateError } = await supa
        .from(table)
        .update({
          status: "published",
          instagram_container_id: result.creation_id || item.instagram_container_id || null,
          instagram_media_id: mediaId,
          published_at: publishedAt,
          updated_at: publishedAt,
          next_attempt_at: null,
          last_error: null,
        })
        .eq("id", item.id);
      if (updateError) throw new Error("Gagal menyimpan hasil publikasi Instagram.");

      if (afterStatus) {
        await afterStatus(supa, item[targetColumn], "published", {
          mediaId,
          publishedAt,
        });
      }
      results.push({ targetId: item[targetColumn], status: "published" });
    } catch (publishError) {
      const finalFailure = attempts >= MAX_ATTEMPTS;
      const message = String(publishError?.message || "Publikasi Instagram gagal")
        .replace(/[\r\n]+/g, " ")
        .slice(0, 500);
      const failedAt = new Date().toISOString();
      await supa
        .from(table)
        .update({
          status: finalFailure ? "failed" : "queued",
          last_error: message,
          next_attempt_at: finalFailure ? null : retryAt(attempts),
          updated_at: failedAt,
        })
        .eq("id", item.id);
      if (afterStatus) {
        await afterStatus(
          supa,
          item[targetColumn],
          finalFailure ? "failed" : "queued",
        );
      }
      results.push({
        targetId: item[targetColumn],
        status: finalFailure ? "failed" : "queued",
        error: message,
      });
    }
  }
  return results;
}

