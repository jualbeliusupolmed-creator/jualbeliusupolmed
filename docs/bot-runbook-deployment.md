# Runbook Pengoperasian & Deployment WhatsApp Bot (`wa-bot-usu`)

Dokumen operasional resmi untuk pengelolaan, pemantauan restart, deployment, dan mitigasi kegagalan WhatsApp Bot Jual Beli USU Polmed di VPS.

---

## 1. Arsitektur & Source of Truth

- **Repositori Resmi (Source of Truth):** `jualbeliusupolmed-creator/wa-bot-usu` (branch `main`).
- **Working Copy Lokal:** Folder `bot-wa/` di root repository monorepo ini.
- **Produksi (VPS):** Terletak di direktori `/root/wa-bot-usu` di VPS DigitalOcean.
- **Daemon Manager:** PM2 di bawah nama proses `wa-bot-usu` (bot utama port 3000) dan cadangan `wa-bot-2` (port 3001).

> [!IMPORTANT]
> **Aturan Sakral:** Jangan pernah mengedit kode langsung di dalam worktree VPS tanpa commit atau mendahului repository GitHub. Selalu uji secara lokal (`npm test`), commit & push ke `wa-bot-usu`, lalu lakukan pull di VPS.

---

## 2. Prosedur Deployment Standar

### Langkah 1: Verifikasi Lokal
Sebelum melakukan rilis atau push:
```bash
cd bot-wa
npm test
```
Pastikan seluruh pengujian (auth, format, stats, smoke test) berstatus `pass`.

### Langkah 2: Push ke Repositori Bot
```bash
git add .
git commit -m "feat/fix: deskripsi perubahan"
git push origin main
```

### Langkah 3: Deploy di Server Produksi (VPS via SSH)
```bash
ssh root@<IP_VPS>
cd /root/wa-bot-usu

# 1. Pastikan tidak ada perubahan lokal yang belum ter-commit di VPS
git status

# 2. Tarik kode terbaru
git pull origin main

# 3. Jalankan bot melalui skrip resmi (SATU-SATUNYA cara sah)
./jalankan.sh
```

> [!WARNING]
> Jangan menjalankan perintah `pm2 restart wa-bot-usu` mentah dari shell atau cron tanpa environment yang lengkap! `jalankan.sh` menyuntikkan token dari file rahasia `/root/.api_token_bot1` dan sandi panel.

---

## 3. Pemantauan Reliabilitas & Restart (Monitoring)

### Mengapa Bot Bisa Merestart?
1. **Kegagalan Koneksi WhatsApp (Kode 503 / Timeout):** WhatsApp Web socket mengalami reset atau jitter jaringan. Skrip `penjaga-bot.sh` berjalan via cron setiap 2 menit memantau endpoint `/health`.
2. **Ambang Eskalasi:** Jika koneksi WA putus selama >16 menit berturut-turut, penjaga akan me-restart bot secara aman.
3. **Kunci Sesi (Status 401 / 403):** WhatsApp menolak autentikasi. Jika ditolak 3 kali, bot akan mengunci sesi (`sesiTerkunci: true`) untuk mencegah spam login berulang yang dapat menyebabkan pemblokiran nomor secara permanen.

### Perintah Pengecekan Cepat di VPS:
```bash
# Cek status PM2 & jumlah restart
pm2 status wa-bot-usu

# Lihat log aktivitas real-time (tanpa mencetak kredensial)
pm2 logs wa-bot-usu --lines 100

# Cek log penjaga bot
tail -n 50 /root/wa-bot-usu/penjaga-bot.log

# Cek endpoint kesehatan bot secara lokal
curl -s http://127.0.0.1:3000/health
```

---

## 4. Penanganan Insiden & Pemulihan (Troubleshooting)

### Kasus A: Bot "Menyapa lalu Diam" (Invalid Number / Regresi Format)
- **Gejala:** Sapaan pembuka terkirim, namun perintah seperti `JUAL`, `CARI`, atau struk tidak diproses.
- **Penyebab:** Webhook menolak JID dengan alasan `invalid_number`. Pastikan fungsi `formatWa()` di `src/lib/constants.js` memangkas `@s.whatsapp.net` sebelum memvalidasi ID sintetis.
- **Solusi:** Jalankan `npm test` di web untuk memastikan tes `formatWa.test.js` lulus.

### Kasus B: Sesi Terkunci (`"terkunci": true`)
- **Gejala:** Dashboard bot menampilkan indikator terkunci, dan log penjaga mencatat `Sesi TERKUNCI`.
- **Solusi:** 
  1. Buka dashboard bot di browser: `https://bot.jualbeliusupolmed.web.id/masuk`.
  2. Masukkan sandi panel admin.
  3. Buka tab sesi dan tekan **Buka Kunci**.
  4. Pindai ulang QR Code dari aplikasi WhatsApp di HP (Perangkat Tertaut).

### Kasus C: Antrean Notifikasi Menumpuk (`wa_outbox`)
- **Gejala:** Iklan atau pembayaran telah disetujui di web, namun penjual belum menerima pesan konfirmasi.
- **Solusi:**
  1. Buka Panel Admin Web di menu `/admin/antrean`.
  2. Periksa apakah antrean bot atau antrean situs yang menampung pesan.
  3. Gunakan tombol **Chat WA Manual** untuk mengirim langsung via WhatsApp Web jika bot sedang dalam perbaikan, lalu klik **✓ Tandai Terkirim**.

---

## 5. Prosedur Rollback Cepat

Jika versi baru menyebabkan crash atau memory leak:

```bash
ssh root@<IP_VPS>
cd /root/wa-bot-usu

# Cek log commit terakhir
git log --oneline -n 5

# Kembalikan ke commit stabil sebelumnya
git checkout <COMMIT_SEBELUMNYA>

# Hidupkan ulang proses dengan environment aman
./jalankan.sh

# Verifikasi status
pm2 status wa-bot-usu
curl -s http://127.0.0.1:3000/health
```
