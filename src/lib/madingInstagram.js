import { getAdminClient } from "@/lib/supabaseAdmin";
import { postToInstagram } from "@/lib/meta";

export function siteOriginFromRequest(request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

function captionFor(post) {
  const heading = post.type === "info" ? "INFO KAMPUS" : "MENFESS USU POLMED";
  const title = post.title ? `${post.title}\n\n` : "";
  return `${heading}\n\n${title}${post.content}\n\n— ${post.sender_name || "Anonim"} · ${post.faculty || "USU / POLMED"}\n\n#USU #POLMED #MenfessUSU #MenfessPOLMED`.slice(0, 2200);
}

// Mengambil antrean dengan lock status agar sebuah Menfess tidak dapat terbit dua kali.
export async function publishQueuedMadingInstagram({ origin, postId = null, limit = 3 }) {
  const accessToken = process.env.META_IG_ACCESS_TOKEN;
  const instagramUserId = process.env.META_IG_USER_ID;
  if (!accessToken || !instagramUserId || !origin) {
    throw new Error("Konfigurasi Instagram belum lengkap.");
  }

  const supa = getAdminClient();
  let query = supa
    .from("mading_instagram_publications")
    .select("id, post_id, attempts")
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(limit);
  if (postId) query = query.eq("post_id", postId);

  const { data: queued, error } = await query;
  if (error) throw new Error("Antrean Instagram belum tersedia.");

  const results = [];
  for (const item of queued || []) {
    const { data: locked } = await supa
      .from("mading_instagram_publications")
      .update({ status: "processing", attempts: (item.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!locked) continue;

    try {
      const { data: post, error: postError } = await supa
        .from("mading_posts")
        .select("id, type, sender_name, faculty, title, content, status")
        .eq("id", item.post_id)
        .eq("status", "active")
        .maybeSingle();
      if (postError || !post) throw new Error("Post Menfess tidak aktif atau tidak ditemukan.");

      const result = await postToInstagram(
        instagramUserId,
        accessToken,
        `${origin}/api/mading/${post.id}/instagram-image`,
        captionFor(post)
      );
      const now = new Date().toISOString();
      await Promise.all([
        supa.from("mading_instagram_publications").update({
          status: "published", instagram_media_id: result.id || null, published_at: now,
          updated_at: now, last_error: null,
        }).eq("id", item.id),
        supa.from("mading_posts").update({
          instagram_status: "published", instagram_media_id: result.id || null, instagram_published_at: now,
        }).eq("id", item.post_id),
      ]);
      results.push({ postId: item.post_id, status: "published" });
    } catch (publishError) {
      const message = String(publishError?.message || "Gagal menerbitkan ke Instagram").slice(0, 500);
      await Promise.all([
        supa.from("mading_instagram_publications").update({ status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", item.id),
        supa.from("mading_posts").update({ instagram_status: "failed" }).eq("id", item.post_id),
      ]);
      results.push({ postId: item.post_id, status: "failed", error: message });
    }
  }

  return results;
}
