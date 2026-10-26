#!/usr/bin/env bash
# ==============================================================================
# Kampusfess & OpenPO Database Backup Script
# SOP Backup PostgreSQL Supabase secara berkala
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "⚠️  DATABASE_URL belum di-set di environment."
  echo "Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
  echo "Ambil Connection String (URI - Direct atau Transaction pooler) dari Supabase Dashboard."
  exit 1
fi

echo "🔄 [$(date)] Memulai pencadangan database Supabase..."
# Melakukan pg_dump dengan kompresi gzip
pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --exclude-table-data='*.audit_logs' \
  | gzip -9 > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ [$(date)] Backup sukses tersimpan di: ${BACKUP_FILE} (Ukuran: ${FILE_SIZE})"

# Menghapus file backup yang lebih tua dari batas retensi
echo "🧹 Membersihkan file backup lebih lama dari ${RETENTION_DAYS} hari..."
find "${BACKUP_DIR}" -type f -name "supabase_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "✨ SOP Backup Selesai."
