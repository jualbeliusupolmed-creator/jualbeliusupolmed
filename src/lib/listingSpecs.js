const CATEGORY_SPEC_MAP = {
  Elektronik: {
    fields: [
      { key: "brand", label: "Brand", placeholder: "Apple, Asus, Lenovo" },
      { key: "model", label: "Model", placeholder: "MacBook Air M1, Vivobook 14" },
      { key: "storage", label: "RAM / Storage", placeholder: "8 GB / 256 GB SSD" },
      { key: "warranty", label: "Garansi", placeholder: "Tidak ada / sisa 3 bulan" },
      { key: "minus", label: "Minus", placeholder: "Battery health 84%, lecet tipis" },
    ],
    template: [
      "Brand:",
      "Model:",
      "RAM / Storage:",
      "Kelengkapan:",
      "Garansi:",
      "Minus:",
      "Alasan jual:",
    ],
    filters: [
      { key: "brand", label: "Apple" },
      { key: "brand", label: "Asus" },
      { key: "brand", label: "Lenovo" },
      { key: "storage", label: "SSD" },
      { key: "storage", label: "RAM 16 GB" },
      { key: "warranty", label: "Masih garansi" },
    ],
  },
  Fashion: {
    fields: [
      { key: "size", label: "Ukuran", placeholder: "M, 38, all size" },
      { key: "gender", label: "Cocok untuk", placeholder: "Pria, wanita, unisex" },
      { key: "material", label: "Bahan", placeholder: "Cotton combed, denim" },
      { key: "condition_note", label: "Kondisi detail", placeholder: "Like new, dipakai 2x" },
      { key: "minus", label: "Minus", placeholder: "Tidak ada / noda kecil" },
    ],
    template: [
      "Ukuran:",
      "Cocok untuk:",
      "Bahan:",
      "Kondisi detail:",
      "Minus:",
      "Lokasi COD:",
    ],
    filters: [
      { key: "size", label: "S" },
      { key: "size", label: "M" },
      { key: "size", label: "L" },
      { key: "gender", label: "Unisex" },
      { key: "condition_note", label: "Like new" },
    ],
  },
  Buku: {
    fields: [
      { key: "author", label: "Penulis", placeholder: "Tulis nama penulis" },
      { key: "publisher", label: "Penerbit", placeholder: "Gramedia, Erlangga" },
      { key: "year", label: "Tahun / Edisi", placeholder: "2023 / edisi 4" },
      { key: "notes", label: "Coretan / highlight", placeholder: "Ada highlight tipis" },
      { key: "cover", label: "Kondisi cover", placeholder: "Mulai menguning / mulus" },
    ],
    template: [
      "Judul buku:",
      "Penulis:",
      "Penerbit:",
      "Tahun / Edisi:",
      "Ada coretan / highlight:",
      "Kondisi cover:",
    ],
    filters: [
      { key: "notes", label: "Tanpa coretan" },
      { key: "cover", label: "Mulus" },
      { key: "publisher", label: "Erlangga" },
      { key: "publisher", label: "Gramedia" },
    ],
  },
  "Buku Kuliah": {
    fields: [
      { key: "course", label: "Mata kuliah", placeholder: "Kalkulus, Anatomi" },
      { key: "semester", label: "Semester", placeholder: "Semester 1, 3, 5" },
      { key: "author", label: "Penulis", placeholder: "Tulis nama penulis" },
      { key: "notes", label: "Coretan / highlight", placeholder: "Ada rangkuman warna" },
      { key: "campus_fit", label: "Cocok untuk", placeholder: "USU Kedokteran, POLMED TI" },
    ],
    template: [
      "Mata kuliah:",
      "Semester:",
      "Penulis:",
      "Edisi:",
      "Ada coretan / highlight:",
      "Cocok untuk jurusan:",
    ],
    filters: [
      { key: "semester", label: "Semester 1" },
      { key: "semester", label: "Semester 3" },
      { key: "semester", label: "Semester 5" },
      { key: "notes", label: "Tanpa highlight" },
    ],
  },
  Makanan: {
    fields: [
      { key: "variant", label: "Varian", placeholder: "Coklat, pedas, mix" },
      { key: "portion", label: "Porsi / ukuran", placeholder: "250 gr, 1 box" },
      { key: "preorder", label: "Sistem order", placeholder: "Ready / PO H-1" },
      { key: "expired", label: "Expired / best before", placeholder: "31 Agustus 2026" },
      { key: "pickup", label: "Pickup / antar", placeholder: "COD FIB, delivery sekitar kampus" },
    ],
    template: [
      "Varian:",
      "Porsi / ukuran:",
      "Ready stock / preorder:",
      "Expired / best before:",
      "Bisa ambil di:",
    ],
    filters: [
      { key: "preorder", label: "Ready" },
      { key: "preorder", label: "PO H-1" },
      { key: "pickup", label: "Delivery" },
      { key: "pickup", label: "COD Kampus" },
    ],
  },
  Kos: {
    fields: [
      { key: "gender", label: "Putra / Putri", placeholder: "Putra, putri, campur" },
      { key: "bathroom", label: "Kamar mandi", placeholder: "Dalam / luar" },
      { key: "facilities", label: "Fasilitas utama", placeholder: "AC, WiFi, laundry" },
      { key: "distance", label: "Jarak ke kampus", placeholder: "5 menit ke USU" },
      { key: "rules", label: "Aturan", placeholder: "Boleh tamu, bebas jam malam" },
    ],
    template: [
      "Putra / Putri:",
      "Kamar mandi:",
      "Fasilitas utama:",
      "Jarak ke kampus:",
      "Harga sudah termasuk:",
      "Aturan penting:",
    ],
    filters: [
      { key: "facilities", label: "AC" },
      { key: "facilities", label: "WiFi" },
      { key: "bathroom", label: "Kamar mandi dalam" },
      { key: "gender", label: "Putri" },
      { key: "gender", label: "Putra" },
      { key: "distance", label: "Dekat USU" },
      { key: "distance", label: "Dekat POLMED" },
    ],
  },
  Jasa: {
    fields: [
      { key: "service_type", label: "Jenis jasa", placeholder: "Desain poster, edit video, joki" },
      { key: "turnaround", label: "Estimasi selesai", placeholder: "2 jam, 1 hari" },
      { key: "revisions", label: "Revisi", placeholder: "2x revisi, unlimited minor" },
      { key: "delivery", label: "Output / pengiriman", placeholder: "PDF, Canva, datang ke lokasi" },
      { key: "coverage", label: "Area layanan", placeholder: "USU, POLMED, online" },
    ],
    template: [
      "Jenis jasa:",
      "Estimasi selesai:",
      "Jumlah revisi:",
      "Output yang diterima:",
      "Area layanan:",
      "Portofolio singkat:",
    ],
    filters: [
      { key: "service_type", label: "Desain" },
      { key: "service_type", label: "Edit video" },
      { key: "service_type", label: "Joki tugas" },
      { key: "coverage", label: "Online" },
      { key: "coverage", label: "USU" },
      { key: "coverage", label: "POLMED" },
      { key: "turnaround", label: "1 hari" },
    ],
  },
};

export function getListingSpecConfig(category) {
  return CATEGORY_SPEC_MAP[category] || CATEGORY_SPEC_MAP.Elektronik;
}

export function sanitizeListingSpecs(category, specs) {
  const config = getListingSpecConfig(category);
  const allowedKeys = new Set(config.fields.map((field) => field.key));
  return Object.fromEntries(
    Object.entries(specs || {})
      .filter(([key, value]) => allowedKeys.has(key) && String(value || "").trim())
      .map(([key, value]) => [key, String(value).trim().slice(0, 160)])
  );
}

export function buildListingDescriptionTemplate(category) {
  return getListingSpecConfig(category).template.join("\n");
}

export function formatListingSpecs(category, specs) {
  const safeSpecs = sanitizeListingSpecs(category, specs);
  const config = getListingSpecConfig(category);
  return config.fields
    .map((field) => {
      const value = safeSpecs[field.key];
      return value ? { key: field.key, label: field.label, value } : null;
    })
    .filter(Boolean);
}

export function getListingSpecFilters(category) {
  const config = getListingSpecConfig(category);
  return config.filters || [];
}

export function buildSpecFilterToken(key, value) {
  const safeKey = String(key || "").trim();
  const safeValue = String(value || "").trim();
  return safeKey && safeValue ? `${safeKey}:${safeValue}` : "";
}

export function parseSpecFilterToken(token) {
  const [rawKey, ...rawValue] = String(token || "").split(":");
  const key = String(rawKey || "").trim();
  const value = rawValue.join(":").trim();
  if (!key || !value) return null;
  return { key, value };
}

export function getAllListingSpecKeys() {
  return [
    ...new Set(
      Object.values(CATEGORY_SPEC_MAP)
        .flatMap((config) => config.fields || [])
        .map((field) => field.key)
    ),
  ];
}
