/**
 * Shared Listing Schema & Sanitization (Client & Server)
 * Memastikan data iklan valid, harga bersih dari string rancu (seperti '0m', '1,3jt'),
 * dan judul terformat rapi.
 */

import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";
import { CATEGORY_PRICE_LIMITS } from "@/lib/moderationRules";

const VALID_CATEGORIES = CATEGORIES.map((c) => c.name);

/**
 * Normalisasi format harga string atau number ke integer rupiah murni
 * Contoh yang dinormalisasi:
 * - 1300000 -> 1300000
 * - "1.300.000" -> 1300000
 * - "Rp 1.300.000" -> 1300000
 * - "1300000" -> 1300000
 *
 * Contoh yang DITOLAK (melemparkan error):
 * - "0m", "1,3jt", "50k", "nego", "free", "0" (untuk barang berbayar)
 */
export function normalizePriceInput(rawPrice, type = "barang", category = "") {
  if (rawPrice === null || rawPrice === undefined || rawPrice === "") {
    throw new Error("Harga wajib diisi.");
  }

  // Jika barang bertipe gratis atau kategori Hibah, harga 0 diperbolehkan
  if (type === "gratis" || category === "Hibah") {
    return 0;
  }

  const str = String(rawPrice).trim().toLowerCase();

  // Tolak format singkatan seperti '0m', '1,3jt', '50k', 'nego'
  if (/[a-z]/i.test(str.replace(/^rp\s*/i, ""))) {
    throw new Error(
      "Format harga tidak valid (jangan gunakan singkatan seperti '0m', '1,3jt', atau '50k'). Masukkan angka rupiah murni, contoh: 1300000 atau 1.300.000."
    );
  }

  // Bersihkan 'Rp', spasi, titik, koma jika koma bukan desimal
  const cleanedDigits = str.replace(/^rp\s*/i, "").replace(/[.\s]/g, "").replace(/,/g, "");
  const num = parseInt(cleanedDigits, 10);

  if (isNaN(num) || num <= 0) {
    throw new Error("Harga barang harus lebih dari Rp 0. Jika ingin memberikan secara cuma-cuma, pilih tipe 'gratis'.");
  }

  const maxLimit = CATEGORY_PRICE_LIMITS[category] || 50_000_000;
  if (num > maxLimit) {
    throw new Error(`Harga maksimal untuk kategori ${category || "ini"} adalah Rp ${maxLimit.toLocaleString("id-ID")}.`);
  }

  return num;
}

/**
 * Sanitasi dan perapian judul iklan
 * - Trim & kolaps multiple spasi
 * - Cegah ALL CAPS berlebihan (misal: 'JUAL LAPTOP CEPAT BU BANGET')
 */
export function sanitizeListingTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  let title = rawTitle.replace(/\s+/g, " ").trim();

  // Cek apakah judul ALL CAPS (panjang > 10 dan lebih dari 70% huruf kapital)
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 8) {
    const uppercaseCount = (title.match(/[A-Z]/g) || []).length;
    if (uppercaseCount / letters.length > 0.7) {
      // Ubah ke Title Case yang rapi tanpa merusak singkatan merek 2-3 huruf (seperti HP, PC, ROG, RAM, SSD, USU)
      title = title
        .toLowerCase()
        .split(" ")
        .map((word) => {
          if (["hp", "pc", "rog", "ram", "ssd", "hdd", "usu", "polmed", "vga", "rtx", "gtx"].includes(word)) {
            return word.toUpperCase();
          }
          if (/^\d+(?:gb|tb|mb)$/i.test(word)) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    }
  }

  return title;
}

/**
 * Zod Schema Lengkap untuk Listing
 */
export const listingInputSchema = z.object({
  seller_name: z
    .string()
    .trim()
    .min(2, "Nama penjual minimal 2 karakter.")
    .max(80, "Nama penjual maksimal 80 karakter."),
  seller_wa: z
    .string()
    .trim()
    .regex(/^(?:\+62|62|0)8[0-9]{8,12}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890)."),
  title: z
    .string()
    .trim()
    .min(5, "Judul barang minimal 5 karakter.")
    .max(80, "Judul barang maksimal 80 karakter.")
    .transform((val) => sanitizeListingTitle(val)),
  description: z
    .string()
    .trim()
    .max(3000, "Deskripsi maksimal 3000 karakter.")
    .default(""),
  price: z.union([z.number(), z.string()]),
  stock: z
    .union([z.number(), z.string()])
    .transform((val) => Math.max(1, parseInt(String(val), 10) || 1))
    .pipe(z.number().int().min(1, "Stok minimal 1 item.")),
  category: z.string().default(VALID_CATEGORIES[0] || "Elektronik"),
  type: z.enum(["barang", "sewa", "jasa", "gratis"]).default("barang"),
  campus: z.string().default("Semua"),
  area: z.string().default(""),
  condition: z.enum(["new", "used"]).default("used"),
  rental_period: z.string().optional().default("harian"),
  specs: z.record(z.any()).optional().default({}),
  image_url: z.string().optional().default(""),
  images: z.array(z.string()).optional().default([]),
  website: z.string().optional(), // Honeypot field
  honeypot: z.string().optional(), // Honeypot field
});

/**
 * Validasi spesifikasi elektronik untuk HP/Laptop
 */
export function validateElectronicsSpecs(category, title, specs = {}) {
  if (category !== "Elektronik") return { valid: true };
  const lowerTitle = (title || "").toLowerCase();

  const isLaptopOrPhone =
    lowerTitle.includes("laptop") ||
    lowerTitle.includes("macbook") ||
    lowerTitle.includes("notebook") ||
    lowerTitle.includes("iphone") ||
    lowerTitle.includes("samsung") ||
    lowerTitle.includes("xiaomi") ||
    lowerTitle.includes("redmi") ||
    lowerTitle.includes("oppo") ||
    lowerTitle.includes("vivo") ||
    lowerTitle.includes("infinix") ||
    lowerTitle.includes("hp");

  if (isLaptopOrPhone) {
    const hasBrand = specs.brand || specs.merk;
    const hasModel = specs.model || specs.tipe;
    if (!hasBrand && !hasModel) {
      return {
        valid: false,
        warning: "Untuk laptop dan ponsel, disarankan mencantumkan Merk dan Model agar pembeli mudah menemukan barangmu.",
      };
    }
  }

  return { valid: true };
}
