// Helper & Validator Verifikasi Mahasiswa Kampus USU & POLMED

export const VALID_CAMPUSES = ['USU', 'POLMED', 'LAINNYA'];

// Pola domain email resmi mahasiswa
const USU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:students\.)?usu\.ac\.id$/i;
const POLMED_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:students\.)?polmed\.ac\.id$/i;

/**
 * Mendeteksi kampus berdasarkan akhiran email institusi.
 * @param {string} email
 * @returns {'USU' | 'POLMED' | null}
 */
export function detectCampusFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  if (USU_EMAIL_REGEX.test(trimmed)) return 'USU';
  if (POLMED_EMAIL_REGEX.test(trimmed)) return 'POLMED';
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

  const campus = (seller.student_campus || 'USU').toUpperCase();
  const campusLabel = campus === 'POLMED' ? 'POLMED' : 'USU';

  return {
    isVerified: true,
    campus: campusLabel,
    badgeText: `Mahasiswa ${campusLabel}`,
    fullLabel: `✓ Mahasiswa ${campusLabel} Terverifikasi`,
    badgeClass: campusLabel === 'POLMED' 
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20'
      : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  };
}
