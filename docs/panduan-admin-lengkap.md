# Panduan Lengkap Admin — Jual Beli USU Polmed

**Panel Admin:** jualbeliusupolmed.web.id/admin  
**WA Admin:** 62895429126232  
**Supabase:** supabase.com (dashboard database)  
**Railway:** railway.app (WA bot service)  
**Vercel:** vercel.com (website Next.js)

---

## Daftar Isi

1. [Akses & Login](#1-akses--login)
2. [Tab Listing — Kelola Iklan](#2-tab-listing--kelola-iklan)
3. [Tab Penjual — Kelola Penjual](#3-tab-penjual--kelola-penjual)
4. [Tab Transaksi — Kelola Pembayaran](#4-tab-transaksi--kelola-pembayaran)
5. [Perintah WA Admin](#5-perintah-wa-admin)
6. [Alur Sistem Lengkap](#6-alur-sistem-lengkap)
7. [Struktur Database](#7-struktur-database)
8. [Pengaturan & Harga](#8-pengaturan--harga)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Akses & Login

Buka: `jualbeliusupolmed.web.id/admin`

Login menggunakan password admin. Session tersimpan di browser.

> Password disimpan di environment variable `ADMIN_PASSWORD` di Vercel.

---

## 2. Tab Listing — Kelola Iklan

### Filter Status Tersedia
- **Semua** — semua iklan
- **Pending** — menunggu approval admin
- **Aktif** — sedang tayang
- **Expired** — masa aktif habis
- **Sold** — sudah terjual
- **Suspended** — dibekukan admin
- **⏳ Minta Hapus** (`deletion_pending`) — penjual minta hapus, menunggu konfirmasi admin
- **Deleted** — sudah dihapus

### Aksi per Iklan

| Status Iklan | Tombol Tersedia | Fungsi |
|---|---|---|
| Pending | ✓ Aktifkan | Approve → iklan tayang di website |
| Pending | ✗ Suspend | Tolak iklan |
| Aktif | ✗ Suspend | Bekukan iklan |
| Minta Hapus | ✓ Approve | Setujui → iklan dihapus permanen |
| Minta Hapus | ✗ Reject | Tolak → iklan kembali aktif |
| Expired / Suspended | ✓ Aktifkan | Aktifkan kembali iklan |

### Alur Iklan Baru (Pasang via WA Bot)

```
1. Penjual kirim foto + caption ke WA bot
2. AI bot ekstrak: judul, harga, kategori, kondisi
3. Penjual konfirmasi detail iklan
4. Bot kirim QRIS → Penjual bayar
5. Penjual kirim screenshot struk
6. AI verifikasi struk pembayaran
7. Iklan masuk database dengan status: PENDING
8. Admin lihat di tab Listing → filter Pending
9. Admin klik ✓ Aktifkan → iklan tayang di website
```

### Alur Hapus Iklan (HAPUS GALAKU)

```
1. Penjual ketik: HAPUS GALAKU 1001
2. Status iklan berubah → deletion_pending
3. Admin lihat di tab Listing → filter "Minta Hapus"
4. Admin klik ✓ Approve → iklan dihapus
   ATAU ✗ Reject → iklan kembali aktif
```

---

## 3. Tab Penjual — Kelola Penjual

### Fitur yang Tersedia

**Cari Penjual**
Ketik nama atau nomor WA di kolom pencarian. Filter real-time tanpa reload.

**Kolom Data Penjual**
- Nama & nomor WA
- Jumlah iklan aktif
- Jumlah barang terjual
- Rating rata-rata
- Status langganan (Free / PRO)
- Status bot (aktif / di-pause)
- Badge: PRO, Terpercaya

**Pause Bot Penjual**
Klik **⏸ Pause Bot** untuk menghentikan bot merespons pesan dari penjual tersebut.  
Penjual akan mendapat notifikasi WA otomatis bahwa bot-nya di-pause admin.

Gunakan jika penjual:
- Melanggar aturan
- Spam iklan
- Perlu verifikasi ulang

**Aktifkan Bot Penjual**
Klik **▶ Aktifkan Bot** untuk memulihkan akses bot penjual.

**Lihat Profil Penjual**
Klik **Profil ↗** untuk membuka halaman profil publik penjual di website.

**Export CSV**
Klik **Export CSV** untuk mengunduh daftar semua penjual dalam format spreadsheet.  
Berguna untuk laporan, analisis, atau backup data.

### Badge Penjual
- **PRO** — penjual berlangganan paket Pro
- **Terpercaya** — penjual sudah diverifikasi (kolom `trusted_seller = true` di database)

Untuk memberikan badge Terpercaya, ubah langsung di Supabase:
```sql
UPDATE seller_profiles SET trusted_seller = true WHERE wa = '628xxx';
```

---

## 4. Tab Transaksi — Kelola Pembayaran

### Ringkasan Revenue
Di bagian atas tab ditampilkan:
- Total pendapatan (status: lunas/paid)
- Breakdown per tipe: iklan, bump, featured, perpanjang, autobump, dll

### Tabel Transaksi
Kolom: Tanggal, Order ID, Tipe, Nominal, Status, Penjual

### Status Pembayaran
| Status | Keterangan |
|---|---|
| Pending | Menunggu pembayaran |
| Paid | Sudah lunas, iklan aktif |
| Failed | Gagal atau dibatalkan |
| Expired | Batas waktu bayar habis |

### Tipe Pembayaran
| Tipe | Keterangan |
|---|---|
| `iklan` | Biaya pasang iklan baru |
| `bump` | Biaya bump / sundul iklan |
| `featured` | Biaya iklan unggulan |
| `renewal` | Biaya perpanjang iklan |
| `autobump` | Biaya auto bump 7 hari |
| `sold_fee` | Komisi penjualan (jika ada) |

---

## 5. Perintah WA Admin

Perintah berikut **hanya bisa dijalankan dari nomor admin** (62895429126232):

### BROADCAST
Kirim pesan massal ke semua penjual yang memiliki iklan aktif.

```
BROADCAST [pesan]
```

**Contoh:**
```
BROADCAST Halo penjual! Ada promo bump gratis hari ini. Ketik BUMP untuk coba.
```
```
BROADCAST Perhatian: Sistem maintenance malam ini pukul 22.00-24.00 WIB.
```

Bot akan mengirim pesan ke semua penjual aktif, satu per satu dengan jeda 2 detik untuk menghindari spam.

---

## 6. Alur Sistem Lengkap

### Arsitektur

```
Penjual/Pembeli (WhatsApp)
        ↓
WA Bot (Railway) — index.js
  • Terima pesan WhatsApp via Baileys
  • Kirim ke webhook Vercel
        ↓
Webhook Vercel — /api/wa/baileys
  • Proses command (CEK, BUMP, dll)
  • Query database Supabase
  • Kirim balasan via WA bot
        ↓
Supabase (Database)
  • Simpan listing, pembayaran, penjual
        ↓
Website Vercel — jualbeliusupolmed.web.id
  • Tampilkan iklan ke pengunjung
  • Admin panel di /admin
```

### Flow Pembayaran (QRIS)

```
Bot buat order Midtrans → Kirim QRIS ke penjual
→ Penjual bayar & kirim screenshot
→ AI (Claude) verifikasi screenshot struk
→ Update payment status → Update listing status
```

### Flow Bot Menerima Pesan

```
Pesan WA masuk ke Railway (index.js)
→ Cek: pesan foto atau teks?
→ Jika foto: buffer 4 detik (multi-foto) → kirim ke webhook
→ Jika teks: kirim langsung ke webhook
→ Webhook proses command → kirim balasan
```

---

## 7. Struktur Database

Tabel utama di Supabase:

| Tabel | Isi |
|---|---|
| `listings` | Semua iklan (aktif, pending, expired, dll) |
| `seller_profiles` | Profil penjual (nama, bio, tier, PIN) |
| `payments` | Semua transaksi pembayaran |
| `price_offers` | Tawaran harga dari pembeli |
| `seller_ratings` | Rating & ulasan pembeli |
| `reports` | Laporan iklan dari pengguna |
| `blacklist` | Nomor WA yang diblokir |
| `settings` | Konfigurasi sistem (harga, bot, dll) |
| `blogs` | Artikel blog |
| `categories` | Kategori iklan |
| `wanted_listings` | Iklan barang yang dicari pembeli |
| `group_posts` | Post dari grup WA marketplace |
| `scheduled_broadcasts` | Broadcast terjadwal |
| `category_subscriptions` | Langganan notif kategori |
| `otps` | OTP untuk login website |

### Kolom Penting di `listings`

| Kolom | Keterangan |
|---|---|
| `listing_code` | Kode iklan berupa angka (1001, 1002, dst) |
| `status` | pending / active / sold / expired / suspended / deletion_pending / deleted |
| `type` | barang / jasa / poster / sewa |
| `bumped_at` | Waktu terakhir di-bump (menentukan urutan tampil) |
| `expires_at` | Tanggal kadaluarsa iklan |
| `featured` | true = iklan unggulan |
| `images` | Array foto (JSON) |

---

## 8. Pengaturan & Harga

Semua harga dan konfigurasi disimpan di tabel `settings` dengan key `bot`.

### Struktur Value (JSONB)

```json
{
  "pricing": {
    "bump": 2000,
    "renewalFee": 2000,
    "listingDays": 14,
    "featuredPerDay": 5000,
    "autobumpWeekly": 15000
  },
  "paused_users": ["628xxx", "628yyy"]
}
```

### Cara Ubah Harga

Di Supabase SQL Editor:
```sql
UPDATE settings
SET value = jsonb_set(value, '{pricing,bump}', '3000')
WHERE key = 'bot';
```

### Pause Bot Manual via Database
```sql
-- Pause user tertentu
UPDATE settings
SET value = jsonb_set(value, '{paused_users}', 
  (value->'paused_users') || '"628xxxxx"'::jsonb)
WHERE key = 'bot';

-- Hapus dari pause list
UPDATE settings
SET value = jsonb_set(value, '{paused_users}',
  (value->'paused_users') - '628xxxxx')
WHERE key = 'bot';
```

---

## 9. Troubleshooting

### Iklan tidak muncul di website setelah bayar
- Cek status di tab Listing → filter Pending
- Mungkin struk belum terverifikasi AI
- Cek tabel `payments` di Supabase — status masih `pending`?
- Approve manual jika perlu

### Bot tidak merespons
- Cek Railway: apakah service sedang berjalan?
- Cek log Railway untuk error
- Nomor WA bot mungkin perlu scan ulang QR
- Buka `railway.app` → wa-bot-usu → restart service

### Pembayaran tidak terdeteksi
- Screenshot struk harus jelas dan tidak terpotong
- Nomor virtual account harus terlihat di struk
- Coba minta penjual kirim ulang screenshot yang lebih jelas

### Penjual kena spam atau bot loop
- Pause bot penjual via admin panel atau perintah WA admin
- Cek `blacklist` table jika perlu blokir permanen:
  ```sql
  INSERT INTO blacklist (wa, reason) VALUES ('628xxx', 'spam');
  ```

### Iklan expired massal
- Bisa jadwalkan cron job via Vercel untuk cek dan notif penjual
- Endpoint: `/api/cron/expire`

### Export data penjual
- Gunakan tombol **Export CSV** di tab Penjual
- Atau query langsung di Supabase:
  ```sql
  SELECT wa, name, trusted_seller, subscription_tier, created_at
  FROM seller_profiles
  ORDER BY created_at DESC;
  ```

---

## Kontak & Eskalasi

| Platform | Akses |
|---|---|
| Website (Vercel) | vercel.com → project jualbeliusupolmed |
| Database (Supabase) | supabase.com → project aktif |
| WA Bot (Railway) | railway.app → project wa-bot-usu |
| GitHub | github.com/jualbeliusupolmed-creator |
