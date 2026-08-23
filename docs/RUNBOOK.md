# Runbook Operasional

Dokumen ini menjelaskan prosedur aman untuk web, bot WhatsApp, dan database.
Tidak ada nilai rahasia di dokumen ini.

## Prinsip sebelum perubahan produksi

1. Catat Git commit yang sedang berjalan dan target commit yang akan dirilis.
2. Pastikan CI lulus: `npm run lint`, `npm test`, dan `npm run build` untuk web;
   `npm test` di `bot-wa/` untuk bot.
3. Pastikan ada rollback: deployment Vercel sebelumnya atau commit bot terakhir
   yang tervalidasi.
4. Jangan deploy dari worktree yang memiliki perubahan tak dikenal.
5. Jangan menampilkan isi environment, session WhatsApp, data pelanggan, atau
   token pada terminal/log/screenshot.

## Web (Vercel)

### Pre-deploy

- Tinjau diff dan migration yang menyertai rilis.
- Pastikan environment variable tersedia di target environment dengan nama yang
  benar; jangan menyalin nilainya ke GitHub Actions atau chat.
- Pastikan endpoint cron yang relevan tetap memiliki secret valid.

### Deploy dan verifikasi

1. Deploy melalui integrasi GitHub/Vercel dari commit yang sudah lulus CI.
2. Periksa homepage, halaman listing, login penjual, dan admin menggunakan akun
   uji non-produksi/data aman.
3. Periksa logs Vercel untuk error server, webhook, dan cron.
4. Catat deployment URL, commit, waktu, dan hasil verifikasi di issue/release
   note tanpa data pribadi.

### Rollback

Promosikan deployment Vercel terakhir yang sehat. Jika perubahan memerlukan
migration database, gunakan migration kompatibel mundur atau rollback SQL yang
sudah direview; jangan mengembalikan aplikasi saja bila skema sudah berubah.

## Bot WhatsApp (VPS)

### Pre-deploy

- Tetapkan repository dan commit canonical. Saat ini checkout VPS dapat drift;
  jangan memakai `git reset --hard` atau menimpa worktree tanpa snapshot/review.
- Pastikan `API_TOKEN`, `PANEL_PASSWORD`, bot session, dan data state tetap di
  secret/data directory yang diabaikan Git.
- Jalankan `npm ci` dan `npm test` dari checkout bot target.

### Deploy

1. Ambil commit yang telah direview ke checkout canonical.
2. Jalankan test bot.
3. Restart hanya proses target melalui prosedur PM2 yang terdokumentasi.
4. Verifikasi process online, bind pada localhost, reverse proxy Nginx sehat,
   dan bot dapat reconnect tanpa loop.

### Rollback

Kembalikan ke commit bot sehat yang terakhir, lakukan install yang deterministik,
lalu restart hanya proses bot target. Jangan menghapus `auth_info_baileys` atau
state tanpa keputusan eksplisit: itu dapat memaksa re-link WhatsApp.

## Insiden koneksi WhatsApp

1. Catat kode disconnect, jumlah restart, waktu mulai, dan versi bot—tanpa
   nomor/isi percakapan.
2. Periksa konektivitas VPS, penggunaan CPU/RAM/disk, dan status PM2.
3. Pastikan reconnect menggunakan backoff serta batas retry; jangan membuat loop
   restart agresif.
4. Bila session perlu re-link, set prosedur maintenance dan minta otorisasi
   operator sebelum mengubah session.

## Supabase

- Gunakan OAuth MCP atau dashboard dengan least privilege untuk pemeriksaan.
- Sebelum migration: backup terverifikasi, review SQL, dan rencana rollback.
- Sesudah migration: periksa RLS, policy, function privileges, Security Advisors,
  serta alur listing/pembayaran dengan akun uji.
- Uji restore backup secara berkala; backup yang tidak pernah direstore belum
  terbukti dapat dipakai.

## Rotasi kredensial

Jika secret diduga terekspos, lakukan rotasi di platform penerbit lalu update
hanya secret manager terkait. Urutannya: GitHub, Vercel, Supabase (service role
dan database), bot/webhook, provider pembayaran/AI, lalu password admin dan
cron. Setelah update, verifikasi service dengan health check dan cabut nilai
lama. Catat tanggal serta pemilik rotasi, bukan nilainya.
