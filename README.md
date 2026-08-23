# Jual Beli USU Polmed 🛒

Marketplace mahasiswa **USU & POLMED** — jual-beli laptop, HP, buku, fashion, makanan, kos, dan jasa. Dibangun dengan Next.js 14 App Router, Supabase, Gemini AI, dan Baileys (WhatsApp). Web di-deploy di Vercel; bot WhatsApp jalan sebagai proses pm2 di VPS.

---

## ✨ Fitur Utama

### Untuk Penjual & Pembeli
- **Pasang iklan via WA** — kirim foto + caption ke bot, AI baca otomatis, bayar QRIS statis, kirim struk, iklan tayang
- **Pasang iklan via Web** — login WA + sandi, isi form, upload foto, bayar QRIS, upload struk
- **Dashboard penjual** — lihat semua iklan, statistik, tawaran, rating
- **Profil publik** — halaman profil penjual dengan semua iklan aktif
- **Upgrade iklan** — Featured (tampil di atas), Auto Bump, Bump manual
- **Tawar harga** — pembeli bisa kirim penawaran via WA, penjual terima notif
- **Iklan Dicari** — posting barang yang dicari, penjual yang punya bisa respons
- **Langganan kategori** — notif WA otomatis setiap ada iklan baru di kategori tertentu
- **Rating & ulasan** — pembeli bisa rating penjual
- **Share ke sosmed** — share card iklan dengan OG image otomatis
- **Blog** — artikel dari admin untuk komunitas
- **Push notification** (PWA) — notif browser untuk event penting

### Untuk Admin
- **Panel admin** — 6 seksi: Moderasi, Marketplace, Konten, Analitik, Bot & Komunikasi, Pengaturan
- **Moderasi iklan** — approve/suspend/hapus iklan, review laporan, antrian hapus
- **Kelola penjual** — pause bot, lihat profil, export CSV, approve perubahan nama
- **Laporan keuangan** — total revenue, breakdown per tipe, per bulan
- **Tren pencarian** — keyword terpopuler, gap supply (0 hasil)
- **Audit trail** — log semua aksi admin + error log kritis
- **Broadcast terjadwal** — kirim pesan ke semua penjual aktif, bisa jadwal waktu
- **TAWAR BIAYA** — penjual bisa negosiasi biaya iklan, admin setujui/tolak via WA atau web
- **Pengaturan harga** — ubah biaya iklan, bump, featured langsung dari panel
- **Perintah WA admin** — STATS, BROADCAST, PAUSE, RESUME, SETMODE, dll

---

## 🧱 Tech Stack

| Layer | Teknologi |
|---|---|
| Web | Next.js 14 App Router (Vercel) |
| WA Bot | Node.js + Baileys (VPS, dikelola pm2) |
| Database | Supabase (PostgreSQL + Storage) |
| AI | Google Gemini 2.5 Flash |
| WA Gateway | Baileys (utama) + Fonnte (fallback) |
| CSS | Tailwind CSS |
| Upload | Sharp (konversi WebP otomatis) |
| Image | next/image + OG image dinamis |
| PWA | @ducanh2912/next-pwa |

---

## 🚀 Setup

### 1. Clone & Install
```bash
git clone https://github.com/jualbeliusupolmed-creator/jualbeliusupolmed.git
cd jualbeliusupolmed
npm install
```

### 2. Supabase
1. Buat project di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, tempel **satu file**: `supabase/migration_semua_sekali_jalan.sql`
   → Run. Isinya seluruh migrasi, urut dan lengkap, dan aman dijalankan
   berulang — jadi ia juga cara memeriksa database yang sudah jalan: bagian
   yang sudah ada dilewati, dan baris terakhirnya mencetak tabel ringkasan
   berisi apa yang ada dan apa yang kurang.

   Dua file sengaja TIDAK ikut di dalamnya:
   - `supabase/seed_dummy_20.sql` — 20 iklan karangan untuk mencoba-coba.
     Jangan dijalankan di produksi.
   - `supabase/migration_security_rls.sql` — mencabut hak baca anon dari lima
     tabel. Itu perubahan perilaku, bukan penambahan; jalankan terpisah saat
     siap memeriksa situsnya halaman per halaman.
3. Ambil dari **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. WA Bot (VPS)
1. Clone repo `wa-bot-usu` di VPS, `npm install`, lalu jalankan dengan pm2
   (`pm2 start index.js --name wa-bot-usu`) di belakang reverse-proxy HTTPS
2. Set env: `WEBHOOK_URL` (URL Vercel `/api/wa/baileys`), `API_TOKEN`
3. Scan QR nomor WA bot saat pertama kali — sesi disimpan di `auth_info_baileys/`,
   jadi restart berikutnya tidak minta scan ulang
4. Salin URL bot → `BAILEYS_API_URL` di Vercel

### 4. Gemini AI
1. Buat API key di [aistudio.google.com](https://aistudio.google.com)
2. Isi `GEMINI_API_KEY`

### 5. Fonnte (opsional, fallback)
1. Daftar di [fonnte.com](https://fonnte.com), connect device
2. Salin token → `FONNTE_TOKEN`
3. `FONNTE_WA_GROUP_ID` = JID grup marketplace

### 6. Environment Variables
Salin `.env.example` → `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `ADMIN_PASSWORD` | Password login `/admin` |
| `ADMIN_WA` | Nomor superadmin (terima notif iklan baru) |
| `SUPER_ADMIN_WA` | Nomor superadmin alternatif |
| `MARKETPLACE_WA` | Nomor publik marketplace |
| `NEXT_PUBLIC_MARKETPLACE_WA` | Sama, dipakai di frontend |
| `BAILEYS_API_URL` | URL bot WhatsApp (endpoint `/send`) |
| `BAILEYS_API_TOKEN` | Token webhook — harus sama persis dengan `API_TOKEN` di bot |
| `FONNTE_TOKEN` | Token Fonnte (fallback jika Baileys mati) |
| `FONNTE_WA_GROUP_ID` | JID grup utama marketplace |
| `BAILEYS_BROADCAST_GROUPS` | JID grup tambahan (comma-separated) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_BASE_URL` | URL situs (mis. `https://www.jualbeliusupolmed.web.id`) |
| `NEXT_PUBLIC_WA_GROUP_LINK` | Link grup WA |
| `CRON_SECRET` | Secret auth cron endpoints |
| `TEST_ACCOUNT_ENABLED` | `true` = aktifkan test account QA (jangan di-set di prod) |

### 7. Jalankan
```bash
npm run dev      # http://localhost:3000
npm run build    # cek build production
```

---

## ☁️ Deploy ke Vercel

1. Push repo ke GitHub, import di [vercel.com](https://vercel.com)
2. Tambahkan semua env di **Project Settings → Environment Variables**
3. Deploy — cron auto-expire & reminder jalan otomatis via `vercel.json`

---

### 7. Pengujian (Testing)
Proyek ini menggunakan **Vitest** untuk *unit testing*. Jalankan perintah berikut untuk mengeksekusi test suite (terutama logika krusial seperti harga & URL slug):
```bash
npm run test
```

### 8. CI/CD (GitHub Actions)
Pipeline terintegrasi melalui `.github/workflows/ci.yml`. Setiap ada *push* atau *pull request* ke branch `main`, pipeline otomatis menjalankan linter, tes unit, dan build aplikasi.

---

## 💰 Struktur Fee (Default)

| Item | Biaya |
|---|---|
| Pasang iklan baru | Rp 2.000 |
| Bump iklan | Rp 2.000 |
| Featured (per hari) | Rp 5.000 |
| Auto Bump (7 hari) | Rp 15.000 |
| Perpanjang iklan | Rp 2.000 |

Harga bisa diubah dari panel admin → Pengaturan, tanpa ubah kode.

---

## ⏰ Cron Jobs (vercel.json)

| Endpoint | Jadwal | Fungsi |
|---|---|---|
| `/api/cron/expire` | Setiap hari 08:00 | Reminder H-3 & H-1 sebelum iklan expired |
| `/api/cron/auto-bump` | Setiap hari 08:00 | Auto bump iklan yang aktif auto-bump |
| `/api/cron/broadcast` | Setiap hari 00:00 | Kirim broadcast terjadwal |

---

## 📁 Struktur File

```
src/
  app/
    page.jsx                    Homepage
    jual/                       Form pasang iklan (web)
    produk/[slug]/              Detail produk + OG image
    dashboard/                  Dashboard penjual
    profil/[wa]/                Profil publik penjual
    mading/                     Halaman Mading (gabungan Blog & Iklan Dicari)
    admin/
      (new)/                    Admin panel utama (layout terpisah)
        overview/               Ringkasan & statistik
        moderasi/               Antrian moderasi iklan + laporan
        keuangan/               Laporan keuangan bulanan
        tren/                   Tren pencarian
        audit/                  Audit trail & error log
      listings/                 Kelola iklan
      penjual/                  Kelola penjual
      transaksi/                Kelola pembayaran
      blogs/                    Kelola artikel blog
      wabot/                    Monitor bot WA
      broadcast/                Broadcast terjadwal
      pengaturan/               Pengaturan harga & sistem
    api/
      wa/baileys/               Webhook WA bot (business logic utama)
      wa/webhook/               Midtrans/manual payment webhook
      listings/                 CRUD iklan
      payments/                 Semua tipe pembayaran (bump, featured, dll)
      payments/verify-receipt/  AI verifikasi struk QRIS
      auth/                     Daftar/login WA + sandi, OTP pemulihan, logout, session check
      admin/                    Admin action, login, upload
      cron/                     expire, auto-bump, broadcast
      og/                       OG image generator
  components/
    admin/                      AdminSidebar, AdminProvider, dll
    ...                         Navbar, Footer, ProductCard, dll
  lib/
    auth.js                     Cookie auth (seller + admin, HMAC signed)
    fonnte.js                   WA sending (Baileys utama + Fonnte fallback)
    supabaseAdmin.js            Supabase service role client
    settings.js                 DEFAULT_SETTINGS + DB-backed settings
    rateLimit.js                In-memory rate limiter
    bot/adminHandlers.js        WA bot: semua command admin
supabase/
  schema.sql                    Skema database utama
  migration_*.sql               Migration tambahan (riwayat, per fitur)
  migration_semua_sekali_jalan.sql  Semuanya jadi satu, aman diulang
vercel.json                     Cron config
```

---

## 🗄️ Tabel Database

| Tabel | Isi |
|---|---|
| `listings` | Iklan (aktif, pending, expired, sold, dll) |
| `seller_profiles` | Profil penjual |
| `payments` | Transaksi pembayaran |
| `price_offers` | Tawaran harga pembeli |
| `seller_ratings` | Rating & ulasan |
| `reports` | Laporan iklan |
| `blacklist` | Nomor WA diblokir |
| `settings` | Konfigurasi sistem |
| `blogs` | Artikel blog |
| `categories` | Kategori iklan |
| `wanted_listings` | Iklan barang dicari |
| `group_posts` | Post dari grup WA (diindex bot) |
| `scheduled_broadcasts` | Broadcast terjadwal |
| `category_subscriptions` | Langganan notif kategori |
| `otps` | Kode pemulihan sandi web |
| `referrals` | Data referral |
| `profile_change_requests` | Request ganti nama penjual |
| `search_logs` | Log pencarian (tren) |
| `admin_logs` | Log aksi admin |
| `error_logs` | Log error kritis |

---

Dibuat untuk komunitas **Jual Beli USU Polmed** · [chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA](https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA)
