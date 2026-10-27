// Helper & Validator Verifikasi Mahasiswa lintas kampus.

export const VALID_CAMPUSES = [];

/**
 * Mendeteksi kampus berdasarkan akhiran email institusi.
 * @param {string} email
 * @returns {'USU' | 'POLMED' | null}
 */
export function detectCampusFromEmail(email, campuses = [
  { shortName: "USU", emailDomains: ["usu.ac.id"] },
  { shortName: "POLMED", emailDomains: ["polmed.ac.id"] },
]) {
  if (!email || typeof email !== 'string') return null;
  const domain = email.trim().toLowerCase().split("@").pop();
  const campus = campuses.find((item) =>
    item?.active !== false && (item.emailDomains || []).some((allowed) => {
      const normalized = String(allowed).toLowerCase().replace(/^@/, "");
      return domain === normalized || domain.endsWith(`.${normalized}`);
    })
  );
  if (campus?.shortName) return campus.shortName;
  return null;
}

/**
 * Validasi format NIM mahasiswa
 * @param {string} nim
 * @returns {{ valid: boolean, error?: string, sanitized?: string }}
 */
export function validateNim(nim) {
  if (!nim || typeof nim !== 'string') {
    return { valid: false, error: 'NIM wajib diisi' };
  }
  const sanitized = nim.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (sanitized.length < 5 || sanitized.length > 20) {
    return { valid: false, error: 'Panjang NIM harus antara 5 hingga 20 karakter' };
  }
  return { valid: true, sanitized };
}

/**
 * Menghasilkan metadata lencana (badge) mahasiswa terverifikasi.
 * @param {object} seller
 * @returns {{ isVerified: boolean, badgeText: string, campus: string, badgeClass: string } | null}
 */
export function getStudentBadge(seller) {
  if (!seller) return null;
  const isVerified = seller.student_verified === true || seller.student_verification_status === 'verified';
  if (!isVerified) return null;

  const campusLabel = String(seller.student_campus || 'Kampus').trim();

  return {
    isVerified: true,
    campus: campusLabel,
    badgeText: `Mahasiswa ${campusLabel}`,
    fullLabel: `✓ Mahasiswa ${campusLabel} Terverifikasi`,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  };
}
