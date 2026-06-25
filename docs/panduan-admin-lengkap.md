# Panduan Lengkap Admin — Jual Beli USU Polmed

**Panel Admin:** jualbeliusupolmed.web.id/admin  
**WA Admin:** 62895429126232  
**Supabase:** supabase.com  
**Railway:** railway.app (WA bot)  
**Vercel:** vercel.com (website)

---

## Daftar Isi

1. [Login Admin](#1-login-admin)
2. [Panel Admin — Navigasi](#2-panel-admin--navigasi)
3. [Moderasi](#3-moderasi)
4. [Marketplace — Listings, Penjual, Transaksi](#4-marketplace)
5. [Analitik — Keuangan, Tren, Audit](#5-analitik)
6. [Bot & Komunikasi](#6-bot--komunikasi)
7. [Pengaturan & Harga](#7-pengaturan--harga)
8. [Perintah WA Admin](#8-perintah-wa-admin)
9. [Alur Sistem Lengkap](#9-alur-sistem-lengkap)
10. [Mode Monetisasi](#10-mode-monetisasi)
11. [Struktur Database](#11-struktur-database)
12. [Environment Variables](#12-environment-variables)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Login Admin

Buka: `jualbeliusupolmed.web.id/admin`

Login menggunakan password admin. Session berlaku 8 jam.

> Password disimpan di environment variable `ADMIN_PASSWORD` di Vercel.

---

## 2. Panel Admin — Navigasi

Sidebar dibagi menjadi 6 seksi:

| Seksi | Halaman |
|---|---|
| **Utama** | Ringkasan, Moderasi |
| **Marketplace** | Listings, Penjual, Transaksi, Tawaran, Dicari, Rating |
| **Konten** | Blog, Kategori, Group Post |
| **Analitik** | Keuangan, Tren, Audit |
| **Bot & Komunikasi** | WA Bot, Broadcast, Notifikasi, AI, Referral |
| **Pengaturan** | Pengaturan, Profil Request, Reports, Blacklist |

Gunakan **search bar** di atas sidebar untuk cari halaman. Badge merah di Moderasi menunjukkan jumlah item yang perlu ditinjau.

Pada mobile: sticky bar di atas + navigasi horizontal scrollable.

---

## 3. Moderasi

Halaman `/admin/moderasi` adalah pusat review semua item yang butuh tindakan:

### Antrian Listing Pending
Iklan baru yang sudah dibayar oleh penjual dan menunggu approval.

| Tombol | Efek |
|---|---|
| ✓ Aktifkan | Iklan tayang di website + notif WA penjual + post ke grup WA |
| ✗ Suspend | Iklan ditolak |

> Pada mode **Gratis Semua** atau **Jual Dulu**, iklan langsung aktif tanpa antrian.

### Laporan Iklan
Laporan dari pengguna via `LAPOR [kode] [alasan]`.

| Tombol | Efek |
|---|---|
| Dismiss | Abaikan laporan |
| Suspend Iklan | Bekukan iklan yang dilaporkan |

### Permintaan Hapus (deletion_pending)
Penjual kirim `HAPUS GALAKU [kode]` → status jadi `deletion_pending`.

| Tombol | Efek |
|---|---|
| ✓ Approve | Iklan dihapus permanen |
| ✗ Reject | Iklan kembali aktif |

### Permintaan Ganti Nama
Penjual kirim `NAMA [nama baru]` → masuk antrian di `/admin/pengaturan` → Profil Request.

| Tombol | Efek |
|---|---|
| Setujui | Nama diupdate di profil + semua iklan |
| Tolak | Nama tidak berubah |

Bisa juga via WA: `SETUJUI NAMA 62812xxx` / `TOLAK NAMA 62812xxx`

### TAWAR BIAYA
Penjual kirim `TAWAR BIAYA [kode] [nominal]` → masuk antrian.

| Tombol | Efek |
|---|---|
| Setujui | Jika nominal 0: iklan aktif gratis. Jika > 0: kirim QRIS baru dengan nominal tersebut |
| Tolak | Penjual bayar harga normal |

Bisa juga via WA: `SETUJUI TAWAR BIAYA [kode]` / `TOLAK TAWAR BIAYA [kode]`

---

## 4. Marketplace

### Tab Listings
Filter tersedia: Semua | Pending | Aktif | Expired | Sold | Suspended | Minta Hapus | Deleted

**Aksi per iklan:**

| Status Iklan | Tombol | Fungsi |
|---|---|---|
| Pending | ✓ Aktifkan | Approve → tayang |
| Pending | ✗ Suspend | Tolak |
| Aktif | ✗ Suspend | Bekukan |
| Expired/Suspended | ✓ Aktifkan | Aktifkan kembali |
| Minta Hapus | ✓ Approve | Hapus permanen |
| Minta Hapus | ✗ Reject | Kembalikan ke aktif |

### Tab Penjual

**Kolom data:** Nama, WA, iklan aktif, barang terjual, rating, status bot, badge.

**Aksi:**

| Aksi | Cara |
|---|---|
| Pause bot penjual | Klik **⏸ Pause Bot** — penjual tidak bisa gunakan bot |
| Aktifkan bot penjual | Klik **▶ Aktifkan Bot** |
| Lihat profil publik | Klik **Profil ↗** |
| Export daftar penjual | Klik **Export CSV** |

**Badge:**
- **Terpercaya** — set via Supabase: `UPDATE seller_profiles SET trusted_seller = true WHERE wa = '628xxx';`

### Tab Transaksi

**Ringkasan revenue** ditampilkan di atas (total + breakdown per tipe).

**Status pembayaran:**

| Status | Keterangan |
|---|---|
| Pending | Menunggu pembayaran/verifikasi struk |
| Paid | Lunas, iklan aktif |
| Failed | Gagal atau dibatalkan |
| Expired | Batas waktu bayar habis |

**Tipe pembayaran:** `iklan` · `bump` · `featured` · `renewal` · `autobump` · `sold_fee`

---

## 5. Analitik

### Keuangan (`/admin/keuangan`)
- Revenue per bulan (pilih bulan dari selector)
- Breakdown per tipe pembayaran
- Daftar transaksi bulan tersebut

### Tren (`/admin/tren`)
- **Top keyword pencarian** dari pengguna
- **Gap supply** — keyword dengan 0 hasil pencarian (peluang kategori baru)
- Data dari tabel `search_logs`

### Audit (`/admin/audit`)
- **Log aksi admin** — siapa melakukan apa, kapan, ke target apa
- **Error log kritis** — error sistem yang perlu perhatian
- Data dari tabel `admin_logs` + `error_logs`

---

## 6. Bot & Komunikasi

### WA Bot (`/admin/wabot`)
- Monitor status Baileys (Railway)
- Log pesan masuk/keluar
- Restart / reconnect bot

### Broadcast (`/admin/broadcast`)
Kirim pesan massal ke semua penjual dengan iklan aktif.

**Cara:**
1. Tulis pesan (bisa tambah gambar)
2. Pilih waktu kirim: sekarang atau jadwal
3. Klik Kirim / Simpan Jadwal

Broadcast terjadwal diproses oleh cron `/api/cron/broadcast` (00:00 daily).

> Atau via WA: `BROADCAST [pesan]` (kirim langsung tanpa jadwal)

---

## 7. Pengaturan & Harga

Semua harga disimpan di tabel `settings` (key: `bot`, subkey: `pricing`).

### Cara Ubah Harga via Panel Admin
Buka `/admin/pengaturan` → bagian Harga → ubah nominal → Simpan.

Bisa pilih **Simpan Saja** atau **Simpan + Kirim ke Grup WA** (notif harga baru ke komunitas).

### Default Harga

| Item | Default |
|---|---|
| Pasang iklan baru | Rp 2.000 |
| Bump iklan | Rp 2.000 |
| Perpanjang iklan | Rp 2.000 |
| Featured per hari | Rp 5.000 |
| Auto Bump 7 hari | Rp 15.000 |
| Masa aktif iklan | 14 hari |

### Mode Monetisasi
Ubah mode via panel Pengaturan atau perintah WA `SETMODE [mode]`:

| Mode | Alur |
|---|---|
| `sewa_lapak` | Penjual bayar dulu, admin approve |
| `jual_dulu` | Iklan gratis, komisi setelah laku |
| `freemium` | Iklan pertama gratis, selanjutnya bayar |
| `gratis_semua` | Semua iklan gratis, langsung aktif |
| `custom` | Harga custom per kategori |

### Ubah Harga via Supabase SQL (alternatif)
```sql
UPDATE settings
SET value = jsonb_set(value, '{pricing,bump}', '3000')
WHERE key = 'bot';
```

---

## 8. Perintah WA Admin

Kirim dari nomor admin yang terdaftar di `ADMIN_WA` atau `SUPER_ADMIN_WA`:

### Informasi
```
STATS    → Statistik ringkas: total iklan aktif, penjual, transaksi hari ini
```

### Broadcast
```
BROADCAST [pesan]    → Kirim ke semua penjual aktif (langsung)
```
Untuk broadcast terjadwal, gunakan panel `/admin/broadcast`.

### Kelola Penjual
```
PAUSE [nomor_wa]     → Pause bot penjual (tidak bisa pakai bot)
RESUME [nomor_wa]    → Aktifkan kembali bot penjual
```
Contoh: `PAUSE 62812345678`

### Persetujuan Nama
```
SETUJUI NAMA [nomor_wa]    → Setujui permintaan ganti nama
TOLAK NAMA [nomor_wa]      → Tolak permintaan ganti nama
```

### TAWAR BIAYA
```
SETUJUI TAWAR BIAYA [kode_iklan]    → Setujui negosiasi biaya
TOLAK TAWAR BIAYA [kode_iklan]      → Tolak negosiasi biaya
```
Contoh: `SETUJUI TAWAR BIAYA 1001`

### Mode Sistem
```
SETMODE sewa_lapak      → Mode berbayar, admin approve
SETMODE jual_dulu       → Gratis pasang, komisi setelah laku
SETMODE freemium        → Pertama gratis, selanjutnya bayar
SETMODE gratis_semua    → Semua gratis, auto-aktif
SETMODE custom          → Mode custom
```

---

## 9. Alur Sistem Lengkap

### Arsitektur

```
[User WA] ──→ [WA Bot / Railway]
                    │ forward pesan (text + foto)
                    ↓
              [/api/wa/baileys / Vercel]
                    │ semua business logic
                    ├─→ Supabase (listings, payments, dll)
                    ├─→ Gemini AI (parse listing, verifikasi struk)
                    └─→ Baileys/Fonnte (kirim WA balik ke user)

[User Browser] ──→ [Next.js / Vercel]
                    ├─→ Supabase
                    ├─→ /api/payments/* (buat payment, return QRIS)
                    └─→ /api/payments/verify-receipt (AI verify struk)

[Admin Browser] ──→ [/admin / Vercel]
                    └─→ /api/admin/action (semua aksi admin)

[Vercel Cron] ──→ /api/cron/expire    (reminder H-3, H-1)
               ──→ /api/cron/auto-bump (bump otomatis)
               ──→ /api/cron/broadcast (broadcast terjadwal)
```

### Alur Pembayaran via WA Bot

```
1. Penjual kirim foto + caption ke WA bot
2. AI Gemini parse: judul, harga, kategori, kondisi
3. Penjual konfirmasi detail
4. Bot buat listing (pending) + payment record
5. Bot kirim QRIS statis + nominal biaya
6. Penjual transfer → kirim screenshot struk ke bot
7. AI Gemini verifikasi struk: nominal >= biaya?
8. Jika valid: listing aktif + notif WA (2 pesan):
   - Pesan 1: konfirmasi tayang
   - Pesan 2: link produk (share card, WhatsApp baca OG image)
9. Admin terima notif (pesan 2 saja) + iklan di-post ke grup WA
```

### Alur Pembayaran via Web

```
1. User login (OTP WA)
2. Isi form iklan + upload foto
3. Submit → POST /api/listings → listing pending + payment record
4. Web tampil QRIS statis + nominal
5. User transfer → upload screenshot struk di web
6. POST /api/payments/verify-receipt → AI Gemini verifikasi
7. Jika valid: listing aktif + notif WA ke penjual (2 pesan)
8. Admin terima notif + iklan di-post ke grup WA
```

### Alur Cron Jobs

```
Setiap hari 08:00 — /api/cron/expire:
  Cek iklan dengan expires_at dalam 3 hari → kirim reminder H-3
  Cek iklan dengan expires_at dalam 1 hari → kirim reminder H-1

Setiap hari 08:00 — /api/cron/auto-bump:
  Cek iklan dengan auto_bump_until aktif → bump otomatis

Setiap hari 00:00 — /api/cron/broadcast:
  Cek scheduled_broadcasts dengan scheduled_at <= sekarang → kirim
```

---

## 10. Mode Monetisasi

### sewa_lapak (Default)
- Penjual bayar biaya di awal
- Iklan masuk pending → admin approve
- Sesuai untuk marketplace aktif dengan kurasi

### jual_dulu
- Iklan gratis → tayang langsung
- Admin atur komisi dari penjualan
- Sesuai untuk bootstrap awal (banyak penjual)

### freemium
- Iklan pertama gratis → langsung tayang
- Iklan kedua dst bayar normal
- Sesuai untuk menarik penjual baru

### gratis_semua
- Semua iklan gratis dan langsung aktif
- Tidak ada moderasi wajib
- Sesuai untuk masa promosi

### custom
- Harga per kategori berbeda
- Diatur manual di tabel settings

---

## 11. Struktur Database

| Tabel | Isi |
|---|---|
| `listings` | Semua iklan |
| `seller_profiles` | Profil penjual (nama, bio, PIN, tier, rating) |
| `payments` | Semua transaksi pembayaran |
| `price_offers` | Tawaran harga dari pembeli |
| `seller_ratings` | Rating & ulasan |
| `reports` | Laporan iklan |
| `blacklist` | Nomor WA diblokir permanen |
| `settings` | Konfigurasi sistem (harga, bot, admin) |
| `blogs` | Artikel blog |
| `categories` | Kategori iklan |
| `wanted_listings` | Iklan barang dicari |
| `group_posts` | Post dari grup WA (diindex bot) |
| `scheduled_broadcasts` | Broadcast terjadwal |
| `category_subscriptions` | Langganan notif kategori |
| `otps` | OTP untuk login web (expire 5 menit) |
| `referrals` | Data referral (referrer + referred) |
| `profile_change_requests` | Antrian permintaan ganti nama |
| `search_logs` | Log pencarian pengguna (untuk tren) |
| `admin_logs` | Log aksi admin (audit trail) |
| `error_logs` | Error kritis sistem |

### Kolom penting `listings`

| Kolom | Keterangan |
|---|---|
| `listing_code` | Kode iklan angka (1001, 1002, ...) |
| `status` | pending / active / sold / expired / suspended / deletion_pending / deleted |
| `type` | barang / jasa / poster / sewa |
| `bumped_at` | Waktu terakhir di-bump (urutan tampil) |
| `expires_at` | Tanggal kadaluarsa |
| `featured` | true = iklan unggulan |
| `auto_bump_until` | Tanggal selesai auto-bump |
| `fee_offer` | Nominal negosiasi biaya (TAWAR BIAYA) |
| `fee_offer_status` | pending / approved / rejected |
| `images` | Array URL foto (WebP) |

---

## 12. Environment Variables

| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `ADMIN_PASSWORD` | Password login `/admin` |
| `ADMIN_WA` | Nomor superadmin (notif + perintah WA) |
| `SUPER_ADMIN_WA` | Nomor superadmin alternatif |
| `MARKETPLACE_WA` | Nomor publik marketplace |
| `NEXT_PUBLIC_MARKETPLACE_WA` | Sama, dipakai di frontend |
| `BAILEYS_API_URL` | URL Railway bot endpoint `/send` |
| `BAILEYS_API_TOKEN` | Token auth Railway bot |
| `FONNTE_TOKEN` | Token Fonnte (fallback jika Baileys mati) |
| `FONNTE_WA_GROUP_ID` | JID grup utama marketplace |
| `BAILEYS_BROADCAST_GROUPS` | JID grup tambahan (comma-separated) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_BASE_URL` | URL situs produksi |
| `NEXT_PUBLIC_WA_GROUP_LINK` | Link join grup WA |
| `CRON_SECRET` | Bearer token auth endpoint cron |
| `TEST_ACCOUNT_ENABLED` | `true` = aktifkan test account QA (JANGAN di-set di prod) |

---

## 13. Troubleshooting

### Iklan tidak muncul di website setelah bayar
1. Cek `/admin/moderasi` → filter Pending — mungkin perlu di-approve manual
2. Cek tabel `payments` di Supabase: status masih `pending`?
3. Screenshot struk mungkin buram → AI gagal verifikasi
4. Minta penjual kirim ulang screenshot yang lebih jelas, atau approve manual

### Bot tidak merespons
1. Cek Railway → service `wa-bot-usu` harus Running
2. Cek log Railway untuk error
3. QR nomor WA bot mungkin perlu scan ulang
4. Buka railway.app → wa-bot-usu → klik Restart

### Cron tidak berjalan
1. Cek Vercel: Project → Settings → Cron Jobs → lihat last run
2. Pastikan `CRON_SECRET` sudah di-set di Vercel env
3. Jalankan manual: `GET /api/cron/expire` dengan header `Authorization: Bearer [CRON_SECRET]`

### Admin tidak dapat notif iklan baru
1. Cek `ADMIN_WA` di Vercel env — harus format `628xxx` (tanpa `+` atau `0` depan)
2. Cek tabel `settings` key `admin`, subkey `adminWa` — harus sama dengan `ADMIN_WA`
3. Cek Railway bot masih connect

### Broadcast tidak terkirim
1. Cek tabel `scheduled_broadcasts` — status `pending`?
2. Cek cron `/api/cron/broadcast` last run
3. Pastikan Railway bot running

### Export penjual
```sql
SELECT wa, name, trusted_seller, subscription_tier, created_at
FROM seller_profiles
ORDER BY created_at DESC;
```

### Blacklist permanen via SQL
```sql
INSERT INTO blacklist (wa, reason) VALUES ('62812345678', 'spam iklan');
```

### Reset PIN penjual (jika lupa)
```sql
UPDATE seller_profiles SET pin = NULL WHERE wa = '62812345678';
```
Penjual bisa login ulang via OTP dan set PIN baru.
