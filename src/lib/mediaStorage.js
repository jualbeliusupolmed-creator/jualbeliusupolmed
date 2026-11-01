import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getAdminClient } from "@/lib/supabaseAdmin";

/**
 * Inisialisasi klien S3 untuk Cloudflare R2 jika kredensial tersedia di environment.
 */
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Upload gambar buffer ke Cloudflare R2 (prioritas utama, $0 egress).
 * Jika R2 belum dikonfigurasi atau gagal, otomatis fallback ke Supabase Storage.
 *
 * @param {Buffer} buffer - Buffer file gambar (WebP/PNG/JPG)
 * @param {string} path - Path target (misal: "listings/1730430000-abcde.webp")
 * @param {string} contentType - MIME type (default: "image/webp")
 * @returns {Promise<{ url: string, provider: "r2" | "supabase" }>}
 */
export async function uploadMedia(buffer, path, contentType = "image/webp") {
  const r2Client = getR2Client();
  const bucketName = process.env.R2_BUCKET || "kampuskita-media";

  if (r2Client) {
    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: path,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      // URL publik: jika ada domain khusus R2 (misal https://media.kampuskita.my.id)
      const publicBase = (
        process.env.R2_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_R2_URL ||
        `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      ).replace(/\/$/, "");

      return {
        url: `${publicBase}/${path}`,
        provider: "r2",
      };
    } catch (err) {
      console.warn(
        `[mediaStorage] Gagal upload ke Cloudflare R2 (${err.message}), fallback ke Supabase Storage.`
      );
    }
  }

  // Fallback aman: Supabase Storage 'listings' bucket
  const supa = getAdminClient();
  const { error: uploadError } = await supa.storage
    .from("listings")
    .upload(path, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
  }

  const { data } = supa.storage.from("listings").getPublicUrl(path);
  return {
    url: data.publicUrl,
    provider: "supabase",
  };
}

