import { getSupabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";

// Upload daftar media ke bucket "listings". Item bisa berupa:
//   { url }   -> foto lama, dipakai apa adanya
//   { file }  -> File baru, di-upload lalu diambil public URL
// Mengembalikan array URL berurutan (elemen pertama = sampul).

// Pastikan hasilnya benar-benar WebP sebelum diunggah secara cepat tanpa pemborosan kompresi ulang.
async function jadikanWebp(file) {
  // Jika file sudah WebP terkompresi (dari MediaUploader), langsung pakai tanpa re-compress!
  if (file.type === "image/webp" && file.size <= 800 * 1024) {
    return file;
  }
  try {
    return await compressImage(file);
  } catch (err) {
    console.warn("Kompresi gambar gagal, memakai berkas asli:", err);
    return file;
  }
}

export async function uploadMedia(media) {
  const supabase = getSupabase();
  if (!Array.isArray(media) || !media.length) return [];

  // Upload paralel menggunakan Promise.all untuk kecepatan maksimal di jaringan seluler
  const results = await Promise.all(
    media.map(async (m) => {
      if (m.url) return m.url;
      if (!m.file) return null;

      const berkas = await jadikanWebp(m.file);

      // Nama berkas berisi waktu + acak
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage
        .from("listings")
        .upload(path, berkas, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) throw new Error("Upload gambar gagal: " + error.message);
      const { data } = supabase.storage.from("listings").getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return results.filter(Boolean);
}
