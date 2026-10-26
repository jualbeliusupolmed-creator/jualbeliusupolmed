# Standar Operasional Prosedur (SOP) & Runbook Operasional
**Produk: Kampusfess (Jual Beli USU & Polmed) & OpenPO**
*Terakhir Diperbarui: 26 Oktober 2026*

---

## 1. SOP Backup Database

### 1.1 Supabase Native Backup
- **Automated Daily Backups:** Aktif di Supabase Pro/Team tier dengan retensi snapshot 7–30 hari.
- **Point-in-Time Recovery (PITR):** Memungkinkan rollback hingga detik tertentu bila terjadi corrupt data massal atau salah query.

### 1.2 Automated CLI Backup (`pg_dump`)
Gunakan script terstandarisasi di `scripts/backup_db.sh`:
```bash
# Menjalankan backup manual atau via cron server
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres"
./scripts/backup_db.sh
```
- **Karakteristik Backup:**
  - Kompresi gzip level 9 untuk efisiensi penyimpanan (`.sql.gz`).
  - Flag `--clean --if-exists` agar file dump dapat langsung direstore tanpa konflik relasi.
  - Retensi otomatis 14 hari dibersihkan oleh `find -mtime +14 -delete`.
- **Lokasi Penyimpanan:** Disimpan di direktori lokal `./backups` dan disinkronkan ke Cloud Storage terenkripsi (misal bucket privat GCS / S3 coldline).

### 1.3 Verifikasi Integritas Backup
- Setiap akhir bulan, ambil backup snapshot terbaru dan lakukan uji restore ke instance lokal / Docker PostgreSQL:
  ```bash
  gunzip -c backups/supabase_backup_YYYYMMDD.sql.gz | psql -h localhost -U postgres -d staging_db
  ```
- Verifikasi jumlah baris tabel kritis (`listings`, `po_orders`, `po_batches`, `seller_profiles`).

---

## 2. Prosedur Disaster Recovery (DR)

### 2.1 Sasaran Target Metrik
- **RTO (Recovery Time Objective):** Maksimal **2 jam** dari deteksi insiden hingga platform kembali online.
- **RPO (Recovery Point Objective):** Maksimal **24 jam** data transaksi (atau < 1 jam bila PITR aktif).

### 2.2 Skenario Bencana & Langkah Penanganan

#### Skenario A: Downtime Vercel / Masalah DNS
1. Cek status di [vercel-status.com](https://www.vercel-status.com).
2. Bila DNS utama `jualbeliusupolmed.web.id` tidak merespon:
   - Arahkan sementara trafik CNAME ke domain backup Vercel (`*.vercel.app`).
   - Berikan banner informasi status melalui Instagram Story kampus `@kampusfess.id`.

#### Skenario B: Kerusakan / Kegagalan Database Supabase
1. Masuk ke Supabase Dashboard → Project Settings → Backups.
2. Pilih snapshot backup terakhir sebelum jam insiden terjadi, lalu klik **Restore Backup**.
3. Jika menggunakan file dump lokal:
   ```bash
   gunzip -c latest_backup.sql.gz | psql "$DATABASE_URL"
   ```
4. Jalankan script verifikasi konsistensi relasi dan kuota batch OpenPO:
   ```bash
   # Di OpenPO
   npm run build
   ```

#### Skenario C: Gangguan Gateway WhatsApp (Baileys / Fonnte Down)
1. **Baileys Server VPS Terputus:**
   - Masuk ke terminal VPS: `pm2 status`.
   - Restart proses Baileys: `pm2 restart wa-bot`.
   - Cek QR pairing jika sesi logout: buka endpoint web dashboard QR bot.
2. **Failover Otomatis ke Fonnte:**
   - Sistem `src/lib/fonnte.js` secara otomatis mendeteksi kegagalan Baileys dan mengalihkan pengiriman ke Fonnte API (`FONNTE_TOKEN`).
   - Pesan yang tertunda ditampung di tabel `public.wa_outbox`.
   - Setelah bot pulih, buka admin outbox `/admin/outbox` dan tekan tombol **Kirim Semua Antrean**.

---

## 3. Incident Response Protocol (Protokol Tanggap Darurat)

### 3.1 Tanggap Darurat Kebocoran Data (Data Breach)
1. **Isolasi Segera (< 15 menit):**
   - Segera rotasi `SUPABASE_SERVICE_ROLE_KEY` dan `ADMIN_PASSCODE` di Vercel Environment Variables.
   - Trigger Redeploy Vercel Production tanpa cache.
2. **Audit Dampak:**
   - Periksa tabel `audit_logs` dan query log Supabase.
   - Telusuri endpoint yang dieksploitasi dan IP penyerang.
3. **Remediasi:**
   - Tambahkan IP penyerang ke blokir rate limit / Cloudflare WAF.
   - Pastikan seluruh nomor WhatsApp pengguna tetap ter-masking (`0812****4321`) di endpoint publik.
4. **Pemberitahuan Transparan:**
   - Buat pengumuman resmi ke komunitas mahasiswa jika data pribadi terdampak.

### 3.2 Penanganan Serangan Spam / Flooding Iklan & Menfess
1. **Aktivasi Proteksi Otomatis:**
   - Distributed Rate Limiting (`rateLimitDistributed`) secara otomatis mengembalikan HTTP 429 pada request > 5/menit.
   - Honeypot form field (`fax_number`, `user_website`) otomatis menolak submission bot.
2. **Moderasi Kata Kunci:**
   - Mesin moderasi `src/lib/moderationRules.js` otomatis menandai postingan mencurigakan sebagai `pending_review` atau `rejected`.
3. **Eksekusi Backfill Soft-Delete:**
   - Jika terdapat lonjakan spam massal yang lolos, jalankan script sanitasi:
     ```bash
     node scripts/backfill_moderation.js --apply
     ```
   - Semua iklan dan menfess spam diubah statusnya menjadi `'hidden'` tanpa merusak integritas database relasional.

### 3.3 Gangguan Transaksi & Pembayaran
1. **OpenPO Pembayaran Manual & QRIS:**
   - Jika buyer mengklaim sudah transfer namun kuota belum terverifikasi:
     - Admin penjual dapat mengecek mutasi bank/QRIS manual.
     - Tekan **Verifikasi Manual** di Dashboard Penjual `/penjual`.
   - Jika order kedaluwarsa padahal sudah bayar:
     - Penjual dapat mengaktifkan kembali batch atau menambah quota +1.
2. **Jual Beli USU (Midtrans):**
   - Cek dashboard Midtrans MAP: status transaksi `settlement` vs `pending`.
   - Jika webhook gagal terpanggil (Vercel cold start timeout), kirim manual via fitur *Resend Webhook Notification* di portal Midtrans.
