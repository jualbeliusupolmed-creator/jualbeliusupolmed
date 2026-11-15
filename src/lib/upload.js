import { compressImage } from "@/lib/image";

// Upload daftar media ke endpoint server /api/upload (pakai service role, bypass RLS).
// Item bisa berupa:
//   { url }   -> foto lama, dipakai apa adanya
//   { file }  -> File baru, di-upload lalu diambil public URL
// Mengembalikan array URL berurutan (elemen pertama = sampul).

async function uploadFileToServer(file, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload gambar gagal");
      return data.url;
    } catch (err) {
      console.warn(`[upload] Attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      // Exponential backoff
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

export async function uploadMedia(media) {
  if (!Array.isArray(media) || !media.length) return [];

  const results = await Promise.all(
    media.map(async (m) => {
      if (m.url) return m.url;
      if (!m.file) return null;

      try {
        return await uploadFileToServer(m.file);
      } catch (err) {
        console.error("Upload gagal:", err);
        throw err;
      }
    })
  );

  return results.filter(Boolean);
}
