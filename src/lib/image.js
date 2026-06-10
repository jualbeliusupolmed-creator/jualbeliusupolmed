// Kompres + konversi gambar ke WebP di sisi browser sebelum upload.
// Hasil: ukuran kecil, load cepat, hemat storage & bandwidth Supabase.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB input
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Mengembalikan pesan error (string) jika tidak valid, atau null jika OK.
export function validateImageFile(file) {
  if (!file) return "File tidak ada.";
  if (!file.type?.startsWith("image/") || !ACCEPTED.includes(file.type)) {
    return "Format harus JPG, PNG, atau WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(
      1
    )} MB). Maks. 5 MB.`;
  }
  return null;
}

// Resize ke maks 1000px sisi terpanjang lalu encode WebP (default kualitas 0.8).
export async function compressImage(
  file,
  { maxSizePx = 1000, quality = 0.8 } = {}
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSizePx || height > maxSizePx) {
        if (width > height) {
          height = Math.round((height / width) * maxSizePx);
          width = maxSizePx;
        } else {
          width = Math.round((width / height) * maxSizePx);
          height = maxSizePx;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Gagal kompres gambar"));
          const name = file.name.replace(/\.\w+$/, "") + ".webp";
          resolve(new File([blob], name, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = url;
  });
}
