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

Graph API dapat menolak token karena dicabut, izin tidak cukup, akun kehilangan
tautan ke Page, atau aplikasi belum punya akses yang dibutuhkan. Jangan
menganggap token berlaku permanen. Uji koneksi dari panel setelah perubahan.
