import { getSupabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { compressImage } from "@/lib/image";

// Upload daftar media ke bucket "listings". Item bisa berupa:
//   { url }   -> foto lama, dipakai apa adanya
//   { file }  -> File baru, di-upload lalu diambil public URL
// Mengembalikan array URL berurutan (elemen pertama = sampul).
//
// Semua yang masuk ke storage WAJIB WebP. Dulu tidak begitu: opsi kompresi di
// bawah tidak menyebut fileType, dan browser-image-compression mempertahankan
// format aslinya — jadi berkas JPEG diunggah dengan nama berakhiran ".webp".
// Peramban tetap menampilkannya (yang menentukan header Content-Type, bukan
// namanya), sehingga tidak ada yang kelihatan rusak, tapi hematnya hilang: foto
// HP 3 MB bisa 2-3 kali lebih besar sebagai JPEG dibanding WebP di mutu yang
// sama, dan itu kuota pembeli yang membuka iklannya.
const OPSI_KOMPRES = {
  maxSizeMB: 0.2, // 200 KB
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp",
};

// Pastikan hasilnya benar-benar WebP sebelum diunggah. compressImage() memakai
// canvas.toBlob("image/webp") — jalur kedua yang tidak bergantung pada pustaka
// kompresi, dan didukung semua peramban yang masih dipakai (Chrome, Firefox,
// Safari 14+).
async function jadikanWebp(file) {
  try {
    const hasil = await imageCompression(file, OPSI_KOMPRES);
    if (hasil.type === "image/webp") return hasil;
    return await compressImage(hasil);
  } catch (err) {
    console.warn("Kompresi gagal, dikonversi lewat canvas:", err);
    return await compressImage(file);
  }
}

export async function uploadMedia(media) {
  const supabase = getSupabase();
  const urls = [];

  for (const m of media) {
    if (m.url) {
      urls.push(m.url);
      continue;
    }
    if (!m.file) continue;

    const berkas = await jadikanWebp(m.file);

    // Nama berkas berisi waktu + acak, jadi satu URL tidak pernah menunjuk isi
    // yang berbeda. Karena itu boleh disimpan peramban selama setahun.
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
    urls.push(data.publicUrl);
  }
  return urls;
}
