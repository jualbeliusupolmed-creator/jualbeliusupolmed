# SOP Meta Graph API untuk Instagram kampus dan provinsi

Sistem publikasi saat ini menggunakan Facebook Login dan Instagram Graph API
di `graph.facebook.com`. Setiap tujuan memerlukan akun Instagram Professional
yang terhubung ke Facebook Page dan kredensial yang berwenang mengakses
Instagram Account ID tersebut.

## Menyiapkan satu akun

1. Ubah akun Instagram tujuan menjadi Professional (Business atau Creator).
2. Hubungkan akun Instagram itu ke Facebook Page resmi milik kampus atau
   provinsi yang bersangkutan.
3. Pada aplikasi Meta yang disetujui, buat token Page/User melalui alur Facebook
   Login dengan izin yang digunakan integrasi ini:
   `pages_show_list`, `instagram_basic`, `instagram_content_publish`, dan
   `pages_read_engagement`. Pastikan tingkat akses aplikasi memenuhi mode
   penggunaan dan akun yang dihubungkan.
4. Ambil Instagram Business Account ID numerik dari Page yang ditautkan.
5. Di panel web buka **Admin → Sosial → Instagram → Hubungkan/Sunting akun**.
   Pilih scope kampus atau provinsi, masukkan handle, Business Account ID, dan
   token untuk akun yang sama. Simpan. Server memeriksa token ke Graph API dan
   hanya menampilkan status koneksi; token tidak dikembalikan ke browser.
6. Periksa status **Token tersimpan** dan jalankan **Uji koneksi**. Ini tidak
   menerbitkan konten.

Token dimasukkan hanya melalui HTTPS pada panel admin. Token disimpan
terenkripsi per akun menggunakan `META_ACCOUNT_TOKEN_ENCRYPTION_KEY` yang
tersedia hanya di runtime server. Jangan menyalin token ke tiket, chat, source,
URL, atau screenshot. Bila token pernah terekspos, cabut di Meta dan ganti
melalui panel. Jangan menganggap token tidak pernah kedaluwarsa: pantau
validitas serta izin secara berkala dan rotasi sesuai status token di Meta.

## Mengapa akun global lama masih ada

`META_KATALOG_IG_USER_ID` dan konfigurasi katalog lama dipertahankan sebagai
fallback kompatibilitas untuk akun katalog global yang sudah dikenal. Akun
kampus/provinsi baru tidak memakai token global tersebut. Untuk menghindari
fallback, setiap akun baru harus memakai ID Meta yang berbeda dan kredensial
per-akun.

## Batas dan pemulihan

- Setup token di panel belum berarti posting sudah aktif di production:
  environment key harus tersedia, kode harus terdeploy, dan koneksi harus
  diverifikasi.
- Jika ID akun, Page link, token, izin, media publik, atau status aplikasi Meta
  tidak sesuai, publikasi akan gagal dan job harus ditinjau sebelum retry.
- Publikasi yang berhasil pada Meta tetapi gagal dicatat ke sistem memiliki
  hasil ambigu. Periksa profil Instagram tujuan sebelum mengulang job.
- Webhook DM dan hak publikasi konten adalah izin/alur berbeda; token yang
  mendukung posting belum tentu mengaktifkan DM webhook.
