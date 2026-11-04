# Setup Meta Instagram

Panduan lama ini sebelumnya menjelaskan satu token katalog global dan
menganggap token Page tidak kedaluwarsa. Asumsi tersebut tidak berlaku untuk
setup nasional multi-akun.

Untuk akun Instagram tiap kampus/provinsi, ikuti
[SOP Meta Graph API per akun](./meta-graph-api-sop.md). Masukkan Business
Account ID dan token akun tersebut melalui **Admin → Sosial → Instagram**.
Jangan menaruh token baru di Vercel environment variable per username atau
menyalinnya ke file konfigurasi.

Environment berikut hanya dipertahankan untuk kompatibilitas akun katalog dan
menfess yang lama:

- `META_KATALOG_IG_USER_ID`
- `META_KATALOG_IG_ACCESS_TOKEN`
- `META_MENFESS_IG_USER_ID`
- `META_MENFESS_IG_ACCESS_TOKEN`

Untuk token multi-akun, set juga `META_ACCOUNT_TOKEN_ENCRYPTION_KEY` di
secret manager server. Nilai harus berupa Base64 dari 32 byte acak. Jangan
pernah memakai prefix `NEXT_PUBLIC_`. Backup kunci melalui secret manager
yang disetujui; bila kunci hilang, token tersimpan perlu dimasukkan ulang.

## Hubungkan dengan Instagram Business Login

Panel **Admin → Sosial** mendukung OAuth langsung untuk akun Instagram
profesional. Daftarkan callback persis seperti berikut pada Business Login
settings Meta, dengan origin situs yang digunakan:

`https://<site-origin>/api/admin/social/instagram/oauth/callback`

Setel environment server-side di Vercel untuk setiap environment yang digunakan
(Development/Preview/Production). App ID, App Secret, callback, dan kunci
enkripsi harus berasal dari aplikasi Meta dan environment yang sama.
Versi Graph API default repo saat ini `v26.0`; sebelum mengganti override
`META_GRAPH_API_VERSION`, pastikan versinya masih didukung untuk semua endpoint
yang digunakan.

- `META_INSTAGRAM_APP_ID` — Instagram App ID dari pengaturan Business Login.
- `META_INSTAGRAM_APP_SECRET` — Instagram App Secret. Jangan gunakan nama env
  `NEXT_PUBLIC_*`.
- `META_INSTAGRAM_REDIRECT_URI` — URI callback persis yang terdaftar di Meta.
- `META_ACCOUNT_TOKEN_ENCRYPTION_KEY` — kunci AES-256-GCM yang disebut di atas.
- `META_WEBHOOK_VERIFY_TOKEN` — string acak kuat untuk verifikasi webhook.
  Nilainya harus sama persis dengan Verify Token di Meta; ini bukan App Secret.
- `META_APP_SECRET` — nama lama yang masih didukung untuk validasi webhook.
  Jika kosong, server memakai `META_INSTAGRAM_APP_SECRET`, sehingga App Secret
  tidak perlu disalin ke dua variabel.

Admin membuat akun Instagram dan cakupannya di panel Sosial terlebih dahulu,
kemudian memilih **Hubungkan / Perbarui OAuth**. Superadmin juga dapat memilih
akun terhubung sebagai tujuan publikasi Mading melalui **Jadikan Akun Mading**.
OAuth meminta izin minimum
untuk profil dasar, publikasi konten, dan pengelolaan DM. Token Instagram
disimpan terenkripsi di server dan diperbarui saat mendekati masa kedaluwarsa
60 hari. Balasan DM hanya dikirim sebagai respons atas percakapan yang dimulai
pengguna dan tetap tunduk pada jendela pesan standar Meta. Pastikan webhook
Instagram menerima event `messages`. Akun di luar cakupan admin tidak dapat
dihubungkan.

### Mengaktifkan webhook DM

1. Pada aplikasi Meta yang sama, aktifkan produk Instagram API dengan Instagram
   Login dan masukkan URL callback
   `https://<site-origin>/api/webhook/instagram` beserta
   `META_WEBHOOK_VERIFY_TOKEN` sebagai Verify Token.
2. Subscribe field Instagram `messages` dan `messaging_postbacks` (dipakai oleh
   quick replies). Setelah OAuth consent, aplikasi mencoba mengaktifkan
   langganan kedua field itu untuk akun secara otomatis. Jangan menyamakan
   callback OAuth dengan callback webhook; keduanya adalah URL berbeda.
3. Simpan perubahan di Meta lalu kirim event uji dari dashboard. Pastikan
   handshake GET berhasil dan event POST bertanda tangan diterima. POST tanpa
   `X-Hub-Signature-256` yang valid harus ditolak.
4. Uji DM nyata hanya setelah akun/izin aplikasi siap. Pastikan balasan berada
   dalam jendela pesan yang diizinkan Meta dan cek status job tanpa mencatat isi
   pesan atau token ke log.

Untuk Instagram Login, aplikasi harus berstatus Live dan Meta mensyaratkan
Advanced Access untuk menerima notifikasi webhook dari akun app user; akses
produksi juga memerlukan Business Verification sesuai setup aplikasi.
Selesaikan App Review/izin sebelum pilot lintas organisasi. OAuth consent saja
belum berarti webhook siap.

Webhook menolak event yang tidak dapat diklaim secara durable. Pastikan migrasi
`202610260002_rate_limit_hits.sql` dan
`20261102163100_harden_rate_limit_rpc.sql` sudah diterapkan pada Supabase
sebelum mengaktifkan DM produksi. Jangan memakai fallback in-memory sebagai
pengganti idempotensi database pada deployment serverless.

Graph API dapat menolak token karena dicabut, izin tidak cukup, akun kehilangan
akses yang dibutuhkan, atau aplikasi belum memperoleh akses yang dibutuhkan.
Jangan menganggap token berlaku permanen. Uji koneksi dari panel setelah perubahan.

Kode lokal, unit tests, dan build tidak membuktikan konfigurasi Meta/Vercel
produksi. Tandai setup selesai hanya setelah OAuth consent, uji koneksi,
handshake webhook, event bertanda tangan, balasan DM, dan publikasi konten
berhasil pada akun yang diotorisasi.
