import { getSupabase } from "@/lib/supabase";

// Upload daftar media ke bucket "listings". Item bisa berupa:
//   { url }   -> foto lama, dipakai apa adanya
//   { file }  -> File baru, di-upload lalu diambil public URL
// Mengembalikan array URL berurutan (elemen pertama = sampul).
export async function uploadMedia(media) {
  const supabase = getSupabase();
  const urls = [];
  for (const m of media) {
    if (m.url) {
      urls.push(m.url);
      continue;
    }
    if (!m.file) continue;
    const ext = m.file.name.split(".").pop() || "webp";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("listings")
      .upload(path, m.file, { cacheControl: "3600", upsert: false });
    if (error) throw new Error("Upload gambar gagal: " + error.message);
    const { data } = supabase.storage.from("listings").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
