// Kompres + konversi gambar ke WebP di sisi browser sebelum upload.
// Hasil: ukuran kecil, load super cepat, hemat storage & kuota internet.
// Tidak membatasi ukuran input: foto resolusi tinggi dari kamera langsung dikompres cepat di browser.

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB input tolerance
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

// Mengembalikan pesan error (string) jika tidak valid, atau null jika OK.
export function validateImageFile(file) {
  if (!file) return "File tidak ada.";
  // Izinkan semua format gambar umum tanpa batasan MB
  if (file.type && !file.type.startsWith("image/") && !ACCEPTED.includes(file.type)) {
    return "Format harus JPG, PNG, atau WebP.";
  }
  return null;
}

// Resize ke maks 1200px sisi terpanjang lalu encode WebP (kualitas 0.78) secara cepat & ringan.
export async function compressImage(
  file,
  { maxSizePx = 1200, quality = 0.78 } = {}
) {
  if (typeof window === "undefined") return file;

  // 1. Jalur super cepat: createImageBitmap (hardware-accelerated, non-blocking)
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
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
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality)
        );

        if (blob) {
          const baseName = (file.name || "foto").replace(/\.[^/.]+$/, "");
          return new File([blob], `${baseName}.webp`, { type: "image/webp" });
        }
      }
    } catch {
      // Fallback ke Image biasa jika createImageBitmap tidak didukung format tersebut
    }
  }

  // 2. Jalur fallback: Image element standar
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
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const baseName = (file.name || "foto").replace(/\.[^/.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Jangan gagal jika browser gagal memuat, gunakan file asli
    };
    img.src = url;
  });
}
