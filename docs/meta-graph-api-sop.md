# SOP Meta Graph API untuk Instagram kampus dan provinsi

Integrasi mendukung dua jenis kredensial yang tidak boleh dicampur:

- Instagram Business Login: token per akun disimpan terenkripsi; panggilan
  memakai `graph.instagram.com`. Alur ini tidak memerlukan Facebook Page
  tertaut.
- Kredensial Facebook Login lama: fallback katalog yang kompatibel memakai
  `graph.facebook.com` dan biasanya memerlukan Instagram Professional yang
  terhubung ke Facebook Page.

## Menyiapkan satu akun

1. Ubah akun Instagram tujuan menjadi Professional (Business atau Creator).
2. Jika memakai Business Login, Facebook Page tertaut tidak diperlukan. Untuk
   kredensial Facebook Login lama, hubungkan akun Instagram ke Facebook Page
   resmi milik kampus atau provinsi yang bersangkutan.
3. Untuk akun yang mendukung Business Login, ikuti alur OAuth dan konfigurasi
   izin di [panduan setup Meta](./setup-meta-instagram.md). Jika masih memakai
   token Facebook Login lama, buat token melalui aplikasi Meta dengan izin
   `pages_show_list`, `instagram_basic`, `instagram_content_publish`, dan
   `pages_read_engagement`; pastikan tingkat akses aplikasi memenuhi mode
   penggunaan dan akun yang dihubungkan.
4. Ambil Instagram Account ID numerik. Untuk token lama, ID bisa diperoleh dari
   Page yang ditautkan; untuk Business Login, callback OAuth mengisi ID akun
   dari profil Instagram yang menyetujui izin.
5. Di panel web buka **Admin → Sosial → Instagram**. Buat akun dan scope
   kampus/provinsi yang tepat. Untuk Instagram Business Login, pilih
   **Hubungkan / Perbarui OAuth**. Token lama dimasukkan hanya melalui form
   koneksi HTTPS. Server memeriksa token ke Graph API dan tidak mengembalikan
   token ke browser.
6. Jalankan **Uji koneksi**. Ini tidak menerbitkan konten; publikasi Mading
   memerlukan superadmin memilih akun terhubung secara eksplisit.

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
