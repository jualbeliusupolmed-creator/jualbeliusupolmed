# Progress Log — Jual Beli USU Polmed

_Terakhir diupdate: 2026-06-26_

---

## Sesi 2026-06-26

### 1. Security Hardening (commit 779b255)

- **Hapus `/api/debug-env/route.js`** — endpoint debug yang expose semua env vars dengan secret lemah
- **Gate test account backdoor** ke `TEST_ACCOUNT_ENABLED=true` env var di 4 route auth (email/login, otp/send, otp/verify, pin/verify). Credentials bisa di-override via env (`TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_WA`, dll)
- **Hapus `ADMIN_PASSWORD` fallback** dari cron routes (expire, broadcast) — hanya accept CRON_SECRET atau x-vercel-cron
- **Security headers** di `next.config.mjs`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection

### 2. Update Dokumentasi (commit hari ini)

- **README.md** — rewrite total: hapus referensi Midtrans, update stack, struktur file, env vars, tabel DB
- **PROGRESS.md** — update semua sesi
- **docs/panduan-pelanggan-singkat.md** — tambah perintah NAMA, TAWAR BIAYA, web login
- **docs/panduan-pelanggan-lengkap.md** — tambah seksi registrasi/login, TAWAR BIAYA, CEK tanpa kode, BATAL
- **docs/panduan-admin-singkat.md** — rewrite: 6 seksi panel, semua perintah WA admin
- **docs/panduan-admin-lengkap.md** — rewrite total: panel baru, audit, keuangan, tren, TAWAR BIAYA, SETMODE, semua env vars, troubleshooting lengkap
- **docs/integrasi-wa-web.md** — BARU: arsitektur, titik integrasi, alur WA vs web, tabel fitur, security

---

## Sesi 2026-06-26 (Bagian Pertama)

### Fitur TAWAR BIAYA

- Seller ketik `TAWAR BIAYA [kode] [nominal]` untuk negosiasi biaya iklan
- Admin dapat notif WA + bisa setujui/tolak via WA atau web panel
- Antrian di `/admin/moderasi` → seksi "Tawaran Biaya Iklan"
- Jika disetujui: nominal 0 → iklan gratis; nominal > 0 → QRIS baru
- Hint TAWAR BIAYA masuk ke pesan QRIS saat listing baru dibuat

### Bot Refactoring

- Admin commands diekstrak ke `src/lib/bot/adminHandlers.js`
- Handles: STATS, SETUJUI NAMA, TOLAK NAMA, SETMODE, BROADCAST, PAUSE, RESUME, SETUJUI/TOLAK TAWAR BIAYA

### Split Pesan Payment Berhasil (commit afa90ee, 0d4fd3e)

Seller terima **2 pesan terpisah** setelah bayar:
1. Konfirmasi: "🎉 PEMBAYARAN BERHASIL! ... sudah tayang dan disebarkan ke Grup WA!"
2. Share card: link produk singkat → WhatsApp auto-fetch OG image

Admin hanya terima pesan 2 (share card + label "Iklan Baru Tayang").

### Bug Fix

- `.catch()` Supabase JS v2 tidak support → ganti dengan async IIFE + try-catch
- Notif admin ke nomor lama → fix prioritas env var di `fonnte.js`
- `TAWAR BIAYA` tertangkap handler `TAWAR` → fix startsWith check
- `isTawarBiaya` referensi `textMsg` belum defined → fix pakai `(message || "")`

---

## Sesi 2026-06-25

### Admin Panel Baru

- Sidebar 6 seksi dengan search bar real-time
- Scroll independen sidebar vs konten
- Badge merah untuk item pending di Moderasi
- Logout di footer sidebar
- Mobile: sticky top bar + horizontal pill nav

**Halaman baru:**
- `/admin/(new)/overview` — Ringkasan statistik
- `/admin/(new)/moderasi` — Antrian moderasi (listings + laporan + profil + tawar biaya)
- `/admin/(new)/keuangan` — Laporan keuangan per bulan
- `/admin/(new)/tren` — Top keyword + gap supply
- `/admin/(new)/audit` — Log aksi admin + error log kritis

### CEK Tanpa Kode

Seller ketik `CEK` (tanpa kode iklan) → tampil semua iklan aktif + status featured/autobump.

### Notif Harga Turun ke Buyer

Edit harga iklan via `EDIT [kode] HARGA [nominal]` → semua buyer yang punya pending offer di iklan tersebut terima notif WA otomatis.

### Rate Limiting (9 Route)

In-memory rate limiter di: OTP send/verify, email login, admin login, admin action, upload, listing create, payment create, verify receipt.

### WA Bot — Ganti Nama via WA

`NAMA [nama baru]` → masuk antrian → admin setujui/tolak via WA atau web. Semua iklan aktif/pending ikut update.

### SEO Fixes

- `<meta name="robots">` di semua halaman
- Canonical URL di produk dan profil
- Sitemap update dengan frekuensi yang tepat

---

## Sesi 2026-06-24

### Push Notification PWA (P11)

- Service worker disambungkan ke semua trigger: iklan tayang, reminder expire, tawaran masuk, broadcast admin
- `/api/push/send` endpoint untuk trigger push dari server
- Web Push via `web-push` library

### Hapus Midtrans & Kode Unik dari Semua Alur Pembayaran

- Semua payment route: `paymentUrl = "/qris.png"` (statis)
- Hapus semua `uniqueCode`, `createQrisTransaction`, dll
- Validasi struk: `nominal >= base_fee` (bukan exact match)
- AI Gemini gantikan Midtrans webhook untuk verifikasi

### WebP Conversion

- `/api/upload` (listing photos) → sudah WebP sejak awal
- `/api/admin/upload` → tambah Sharp WebP conversion
- `AdminPanel.jsx` logo/favicon upload → routing lewat API (bukan direct Supabase)
- `BlogEditor.jsx` → hapus input URL, ganti dengan drag-upload zone

### Notifikasi WA ke Penjual & Superadmin saat Iklan Tayang

- Pesan berbeda per tipe pembayaran (iklan, bump, featured, dll)
- Superadmin terima notif lengkap (foto + detail + link)
- Berlaku dari WA bot maupun dari web

---

## Sesi 2026-06-23

### P4–P8 + UX Done

- Sistem tawaran harga (TAWAR / TERIMA / TOLAK)
- Perpanjang iklan via WA + web
- Upgrade iklan: Featured, AutoBump, Bump
- Langganan kategori
- Referral system
- Rating & ulasan penjual
- Login OTP WA + PIN + Dashboard penjual

### SQL Migrations Dijalankan

- `migration_rls.sql` — RLS semua tabel ✅
- `migration_logs.sql` — search_logs, admin_logs, error_logs ✅
- `migration_fee_offer.sql` — kolom fee_offer + fee_offer_status ✅

---

## Sesi 2026-06-22

### Fondasi Sistem

- Homepage + search + filter kategori
- Pasang iklan via WA (foto + caption → AI parse → QRIS → struk → tayang)
- Admin panel (login, moderasi, penjual, transaksi)
- WA bot di Railway dengan Baileys
- Cron jobs: expire, auto-bump, broadcast
- Blog dengan Markdown editor
- Profil publik penjual

---

## Arsitektur Sistem

```
[User WA] ──→ [WA Bot / Railway / Baileys]
                    │ forward pesan
                    ↓
              [/api/wa/baileys / Vercel]
                    │ business logic
                    ├─→ Supabase (DB + Storage)
                    ├─→ Gemini AI (parse, verifikasi)
                    └─→ Baileys/Fonnte (kirim WA)

[User Browser] ──→ [Next.js / Vercel]
                    ├─→ Supabase
                    ├─→ /api/payments/* (buat payment)
                    └─→ /api/payments/verify-receipt (AI verify)

[Admin Browser] ──→ [/admin / Vercel]
                    └─→ /api/admin/action (semua aksi)

[Vercel Cron] ──→ expire · auto-bump · broadcast
```

**Stack:** Next.js 14 App Router · Supabase · Gemini 2.5 Flash · Baileys (Railway) · Fonnte · Sharp · Tailwind CSS · Vercel

**DB Tables:** listings · seller_profiles · payments · price_offers · seller_ratings · reports · blacklist · settings · blogs · categories · wanted_listings · group_posts · scheduled_broadcasts · category_subscriptions · otps · referrals · profile_change_requests · search_logs · admin_logs · error_logs
