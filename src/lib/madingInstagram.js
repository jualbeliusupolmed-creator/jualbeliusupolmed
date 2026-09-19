import { getAdminClient } from "@/lib/supabaseAdmin";
import { processInstagramQueue, siteOriginFromRequest } from "@/lib/instagramQueue";
import { layoutMadingInstagramPost } from "@/lib/madingInstagramImage";
import { waitUntil } from "@vercel/functions";

export { siteOriginFromRequest };

function menfessCredentials() {
  const accessToken = String(process.env.META_MENFESS_IG_ACCESS_TOKEN || process.env.META_IG_ACCESS_TOKEN || "").trim();
  const userId = String(process.env.META_MENFESS_IG_USER_ID || process.env.META_IG_USER_ID || "").trim();
  return { accessToken, userId };
}

export function captionForMading(post) {
  const heading = post.type === "info" ? "INFO KAMPUS" : "MENFESS USU POLMED";
  const title = post.title ? `${post.title}\n\n` : "";
  const productInfo = post.listings?.title
    ? `\n\n🛒 Tagged Produk Katalog: "${post.listings.title}"`
    : "";
  return `${heading}\n\n${title}${post.content}${productInfo}\n\n— ${post.sender_name || "Anonim"} · ${post.faculty || "USU / POLMED"}\n\n#USU #POLMED #MenfessUSU #MenfessPOLMED`.slice(0, 2200);
}

export async function queueMadingInstagram(postId, { supa = getAdminClient() } = {}) {
  const { data: post } = await supa
    .from("mading_posts")
    .select("id, status, instagram_status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "active") {
    throw new Error("Postingan Menfess belum aktif atau tidak ditemukan.");
  }
  if (post.instagram_status === "published") return { alreadyPublished: true };

  const now = new Date().toISOString();
  const { error } = await supa.from("mading_instagram_publications").upsert(
    {
      post_id: postId,
      status: "queued",
      attempts: 0,
      last_error: null,
      instagram_container_id: null,
      instagram_media_id: null,
      next_attempt_at: null,
      published_at: null,
      queued_at: now,
      updated_at: now,
    },
    { onConflict: "post_id" },
  );
  if (error) throw new Error("Gagal menambahkan Menfess ke antrean Instagram.");

  await supa
    .from("mading_posts")
    .update({
      instagram_status: "queued",
      instagram_media_id: null,
      instagram_published_at: null,
    })
    .eq("id", postId);
  return { queued: true };
}

export async function publishQueuedMadingInstagram({
  origin,
  postId = null,
  limit = 3,
}) {
  return processInstagramQueue({
    table: "mading_instagram_publications",
    targetColumn: "post_id",
    targetId: postId,
    limit,
    origin,
    credentials: menfessCredentials(),
    loadTarget: async (supa, id) => {
      const { data } = await supa
        .from("mading_posts")
        .select("id, type, sender_name, faculty, title, content, image_url, status, listing_id, listings:listing_id (id, title, price)")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    imagePath: (post) => {
      const layout = layoutMadingInstagramPost(post, "portrait");
      const totalPages = layout.pages?.length || 1;

      if (totalPages > 1) {
        return Array.from({ length: totalPages }).map((_, i) => `/api/mading/${post.id}/instagram-image?page=${i}`);
      }
      return `/api/mading/${post.id}/instagram-image?page=0`;
    },
    captionFor: captionForMading,
    afterStatus: async (supa, id, status, details = {}) => {
      const updates = { instagram_status: status };
      if (status === "published") {
        updates.instagram_media_id = details.mediaId || null;
        updates.instagram_published_at = details.publishedAt;
      }
      await supa.from("mading_posts").update(updates).eq("id", id);
    },
  });
}

export async function autoPublishMadingInstagram({ origin, postId, timeoutMs = 15000 }) {
  try {
    await queueMadingInstagram(postId);
    const publishPromise = publishQueuedMadingInstagram({ origin, postId, limit: 1 }).catch((err) => {
      console.error("[autoPublishMadingInstagram] publish error:", err);
      return [];
    });

    // Pertahankan proses background di Vercel Lambda setelah HTTP response terkirim
    if (typeof waitUntil === "function") {
      try {
        waitUntil(publishPromise);
      } catch (_) {}
    }

    if (!timeoutMs) return await publishPromise;
    return await Promise.race([
      publishPromise,
      new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ]);
  } catch (err) {
    console.error("[autoPublishMadingInstagram] error:", err);
    return [];
  }
}
