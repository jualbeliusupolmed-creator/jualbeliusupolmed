/**
 * organisasi.js — Logika & Master Data Akun Khusus UKM & Organisasi Mahasiswa
 * Platform Jual Beli & Komunitas Mahasiswa USU & POLMED.
 */

export const UKM_CATEGORIES = [
  { id: "bem_hima", label: "BEM & Himpunan Mahasiswa (HIMA)", icon: "BEM" },
  { id: "olahraga", label: "UKM Olahraga & Kebugaran", icon: "Run" },
  { id: "seni_budaya", label: "UKM Seni, Musik & Budaya", icon: "Art" },
  { id: "riset_teknologi", label: "UKM Riset, Penalaran & Teknologi", icon: "Lab" },
  { id: "keagamaan", label: "UKM Kerohanian & Keagamaan", icon: "Faith" },
  { id: "media_pers", label: "Pers, Media & Jurnalistik Kampus", icon: "News" },
  { id: "sosial_lingkungan", label: "Komunitas Sosial & Lingkungan", icon: "Leaf" },
];

export const KAMPUS_OPTIONS = [];

export const DEFAULT_INVITE_CODE = "KAMPUS_USU_POLMED_2026";

/**
 * Validasi form pendaftaran organisasi
 */
export function validateOrganisasiForm({
  ukm_name,
  ukm_category,
  campus,
  ukm_instagram,
  contact_name,
  contact_wa,
  bio,
  validCampuses = KAMPUS_OPTIONS,
}) {
  if (!ukm_name || ukm_name.trim().length < 3) {
    return "Nama Organisasi / UKM minimal 3 karakter.";
  }
  if (!ukm_category) {
    return "Silakan pilih kategori organisasi.";
  }
  if (!campus || !validCampuses.some((item) => String(item).toLowerCase() === String(campus).toLowerCase())) {
    return "Pilih kampus yang masih tersedia.";
  }
  if (!contact_name || contact_name.trim().length < 2) {
    return "Nama penanggung jawab (PIC) wajib diisi.";
  }
  if (!contact_wa || contact_wa.trim().length < 9) {
    return "Nomor WhatsApp narahubung/PIC tidak valid.";
  }
  return null;
}
