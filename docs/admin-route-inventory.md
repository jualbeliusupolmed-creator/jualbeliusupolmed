# Inventaris route admin

Workspace admin utama memakai route berikut:

| Route | Status | Fungsi |
|---|---|---|
| `/admin/overview` | aktif | Ringkasan platform dan scope |
| `/admin/marketplace` | aktif | Review listing, toko, dan Dicari |
| `/admin/users` | aktif | Direktori pengguna dan perubahan profil |
| `/admin/reports` | aktif | Penanganan laporan |
| `/admin/po` | aktif | Batch dan reservasi Open PO |
| `/admin/finance` | aktif | Pembayaran dan transaksi |
| `/admin/analytics` | aktif | Insight berdasarkan scope |
| `/admin/content` | aktif | Konten dan artikel |
| `/admin/owners` | aktif, superadmin | Membership dan scope owner |
| `/admin/settings` | aktif, superadmin | Pengaturan platform dan katalog kampus |
| `/admin/audit` | aktif, superadmin | Jejak perubahan |
| `/admin/wabot` | aktif, permission `whatsapp.read` | Operasional WhatsApp |

Route lama diarahkan oleh [middleware](../src/middleware.js) menggunakan redirect
sementara `307`. Query `orderId` dan `payment_id` dipertahankan saat menuju
Keuangan; data sensitif lain tidak disalin ke URL baru.

| Route lama | Tujuan |
|---|---|
| `/admin/moderasi`, `/admin/listings` | `/admin/marketplace` |
| `/admin/approve-toko`, `/admin/toko` | `/admin/marketplace?mode=stores` |
| `/admin/dicari` | `/admin/marketplace?mode=wanted` |
| `/admin/profil_request` | `/admin/users?view=profile-requests` |
| `/admin/keuangan`, `/admin/transaksi`, `/admin/approve-payment` | `/admin/finance` |
| `/admin/blogs` | `/admin/content` |
| `/admin/penjual`, `/admin/kontak_pembeli` | `/admin/users` |

Sebelum menghapus route lama, verifikasi bookmark dan tautan WhatsApp dengan
`curl -I http://localhost:3000/admin/<route>`, lalu pastikan route tujuan dan
permission server sudah aktif.

## Login dan pemulihan

Login workspace menggunakan Supabase Auth email/password atau Google OAuth.
Superadmin ditentukan oleh `SUPERADMIN_AUTH_USER_ID`; akun lain wajib memiliki
membership aktif. Operator WhatsApp dapat diberi permission `whatsapp.read` dan
`whatsapp.manage` dari menu Akses owner.

Jika deployment gagal, pertahankan deployment Vercel terakhir yang `READY`,
periksa log build, dan rollback melalui Vercel. Jangan mengubah RLS atau
menjalankan migration produksi tanpa backup, hasil advisor, dan persetujuan
operasional.
