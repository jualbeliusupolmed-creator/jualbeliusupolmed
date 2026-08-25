import { getAdminClient } from "@/lib/supabaseAdmin";
import { processInstagramQueue, siteOriginFromRequest } from "@/lib/instagramQueue";

export { siteOriginFromRequest };

function menfessCredentials() {
  return {
    accessToken:
      process.env.META_MENFESS_IG_ACCESS_TOKEN || process.env.META_IG_ACCESS_TOKEN,
    userId: process.env.META_MENFESS_IG_USER_ID || process.env.META_IG_USER_ID,
  };
}

export function captionForMading(post) {
  const heading = post.type === "info" ? "INFO KAMPUS" : "MENFESS USU POLMED";
  const title = post.title ? `${post.title}\n\n` : "";
  return `${heading}\n\n${title}${post.content}\n\n— ${post.sender_name || "Anonim"} · ${post.faculty || "USU / POLMED"}\n\n#USU #POLMED #MenfessUSU #MenfessPOLMED`.slice(0, 2200);
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
        .select("id, type, sender_name, faculty, title, content, image_url, status")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    imagePath: (post) => `/api/mading/${post.id}/instagram-image`,
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

export async function autoPublishMadingInstagram({ origin, postId }) {
  try {
    await queueMadingInstagram(postId);
    return await publishQueuedMadingInstagram({ origin, postId, limit: 1 });
  } catch {
    // Post website tetap berhasil; antrean tersimpan untuk cron/retry admin.
    return [];
  }
}
