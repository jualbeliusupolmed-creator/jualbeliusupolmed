# Panduan Konfigurasi Crontab Production

Dokumen ini berisi konfigurasi jadwal cron job untuk memelihara background tasks di platform **Jual Beli USU Polmed**.

> [!IMPORTANT]
> **Keamanan Kredensial:**
> Jangan pernah menuliskan token otentikasi secara langsung (*hardcoded*) ke dalam repositori atau script publik. Gunakan *environment variable* `CRON_SECRET` yang disetel pada VPS/server crontab (`export CRON_SECRET="nilai_secret_dari_env"`).

---

## Daftar Jadwal Cron (Crontab)

Tambahkan konfigurasi berikut ke crontab server VPS (`crontab -e`):

```bash
# Pastikan variabel CRON_SECRET sudah diekspor atau didefinisikan di awal crontab:
CRON_SECRET="ganti_dengan_CRON_SECRET_anda"
DOMAIN="https://www.jualbeliusupolmed.web.id"

# 1. Menandai iklan kedaluwarsa (setiap hari pkl 08.00 WIB)
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/expire" > /dev/null

# 2. Sundul otomatis listing berkala (setiap hari pkl 08.00 WIB)
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/auto-bump" > /dev/null

# 3. Broadcast harian (setiap tengah malam pkl 00.00 WIB)
0 0 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/broadcast" > /dev/null

# 4. Ringkasan distributor (setiap hari pkl 06.00 WIB)
0 6 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/distributor-digest" > /dev/null

# 5. Laporan mingguan (setiap Senin pkl 01.00 WIB)
0 1 * * 1 curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/weekly-report" > /dev/null

# 6. Ringkasan harian (setiap hari pkl 01.00 WIB)
0 1 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/daily-digest" > /dev/null

# 7. Follow-up tawaran & negosiasi (setiap hari pkl 02.00 WIB)
0 2 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/deal-followup" > /dev/null

# 8. Antrean posting Menfess ke Instagram (setiap 30 menit)
*/30 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$DOMAIN/api/cron/instagram-menfess" > /dev/null
```
