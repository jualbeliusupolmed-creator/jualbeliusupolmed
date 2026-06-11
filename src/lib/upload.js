import { getSupabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

// Upload daftar media ke bucket "listings". Item bisa berupa:
//   { url }   -> foto lama, dipakai apa adanya
//   { file }  -> File baru, di-upload lalu diambil public URL
// Mengembalikan array URL berurutan (elemen pertama = sampul).
export async function uploadMedia(media) {
  const supabase = getSupabase();
  const urls = [];

  const compressionOptions = {
    maxSizeMB: 0.2, // Max 200KB
    maxWidthOrHeight: 1200, // Max width/height
    useWebWorker: true,
  };

  for (const m of media) {
    if (m.url) {
      urls.push(m.url);
      continue;
    }
    if (!m.file) continue;
    
    let fileToUpload = m.file;
    try {
      fileToUpload = await imageCompression(m.file, compressionOptions);
    } catch (err) {
      console.warn("Gagal mengompresi gambar, menggunakan file asli:", err);
    }

    const ext = "webp"; // We can enforce webp or keep original
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("listings")
      .upload(path, fileToUpload, { cacheControl: "3600", upsert: false });
    if (error) throw new Error("Upload gambar gagal: " + error.message);
    const { data } = supabase.storage.from("listings").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
