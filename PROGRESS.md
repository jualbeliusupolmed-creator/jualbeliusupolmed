# Progress Log — Jual Beli USU

_Terakhir diupdate: 2026-06-24_

---

## Sesi Ini (2026-06-24)

### 1. Hapus Midtrans & Kode Unik dari Semua Alur Pembayaran

**Latar belakang:** Sistem sebelumnya pakai Midtrans dynamic QRIS (nominal otomatis terisi) + kode unik 1–99 (ditambah ke base fee untuk matching pembayaran). Diputuskan untuk hapus keduanya — terlalu kompleks untuk skala ini.

**Alur baru:**
- QRIS statis (`/qris.png`) ditampilkan
- User transfer manual sesuai nominal yang disebutkan bot/web
- User kirim struk → AI verifikasi
- Validasi nominal: `>= base_fee` (bukan exact match)

**File yang diubah:**

| File | Perubahan |
|------|-----------|
| `src/app/api/wa/baileys/route.js` | Hapus `createQrisTransaction`, `getQrisUrl()` → statis, hapus semua `uniqueCode`, pesan diupdate |
| `src/app/api/listings/route.js` | Hapus Midtrans, `paymentUrl = "/qris.png"` |
| `src/app/api/listings/[id]/route.js` | Hapus Midtrans dari sold_fee flow |
| `src/app/api/wanted/route.js` | Hapus Midtrans |
| `src/app/api/payments/bump/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/featured/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/autobump/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/renew/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/subscribe/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/resume/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/sponsored/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/unlock-wanted/route.js` | `paymentUrl = "/qris.png"` |
| `src/app/api/payments/verify-receipt/route.js` | Validasi nominal `!==` → `<` |

**Catatan:** `src/lib/midtrans.js` dibiarkan — masih ada sebagai definisi, tapi tidak ada yang mengimport lagi.

---

### 2. Notifikasi WA ke Penjual & Superadmin saat Iklan Tayang

**Sebelumnya:**
- Notifikasi ke penjual (web): pesan generic "Pembayaran Sukses" tanpa detail
- `notifyAdminNewListing` dinonaktifkan (return `skipped: true`)
- Tidak ada notif ke admin dari WA bot flow

**Sekarang:**

**Ke penjual** — pesan berbeda per tipe pembayaran:
```
✅ *Iklan Kamu Sudah Tayang!* 🎉

📦 *Laptop Asus i5*
📅 Aktif hingga: *8 Juli 2026*
🔑 Kode: *12345*

Iklan sudah disebarkan ke grup WA marketplace!

👉 jualbeliusupolmed.web.id/produk/laptop-asus-i5-xxx
```
Tipe: `iklan` / `bump` / `renewal` / `featured` / `autobump` — masing-masing punya pesan sendiri.

**Ke superadmin** (`ADMIN_WA` env = `62895429126232`):
```
🆕 *Iklan Baru Tayang!*

📦 *Laptop Asus i5*
💰 Rp 3.500.000
🏷️ Elektronik
👤 Budi (628123xxx)
🔑 Kode: 12345

👉 jualbeliusupolmed.web.id/produk/...
```
Disertai foto iklan pertama. Berlaku dari WA bot maupun dari web.

**File yang diubah:**

| File | Perubahan |
|------|-----------|
| `src/lib/fonnte.js` | Re-enable `notifyAdminNewListing` dengan pesan lengkap |
| `src/app/api/payments/verify-receipt/route.js` | Expand listing select, pesan penjual type-aware, panggil `notifyAdminNewListing` |
| `src/app/api/wa/baileys/route.js` | Import + panggil `notifyAdminNewListing` setelah listing aktif |

---

## Sesi Sebelumnya (2026-06-23 dan sebelumnya)

### Fitur yang Sudah Selesai

#### Bot WA (`wa-bot-usu` + `baileys/route.js`)

- **Greeting bot** — balas `min`/`admin`/`mimin`/`halo admin`/dll dengan MENU + link website
- **SAYA** — tampil profil penjual (nama, iklan aktif, rating, tawaran pending)
- **NAMA [nama]** — set nama profil + update semua iklan aktif/pending
- **UPGRADE FEATURED/AUTOBUMP** — fix regex `[A-Z0-9]{8}` → `\d+` (listing_code numerik)
- **IKLANKU** — tampil badge ⭐Featured / 🔄AutoBump + listing_code di SELECT
- **CEK** — tampil status featured/autobump aktif + saran UPGRADE
- **MENU** — tambah UPGRADE, BATAL, STOP
- **Free bump dari referral** — cek `seller_profiles.free_bumps` sebelum buat payment
- **Tracking user WA baru** — `isNewWaUser` flag → reminder NAMA setelah pasang iklan pertama
- **Hapus AI price suggestion** — hapus `priceSuggestion` try/catch
- **Buffer multi-foto** — 4 detik sebelum kirim ke webhook
- **Bot listen grup marketplace** → index post ke DB (`group_posts`)

#### Web (`JUAL BELI USU`)

- **Login OTP WA** — kirim OTP via Fonnte/Baileys, verify, set cookie session
- **Dashboard penjual** — iklan, statistik, tawaran
- **Sistem laporan iklan**
- **Notif kategori** — `LANGGANAN [kategori]` / `STOP`
- **Tawar harga** — `TAWAR` / `TERIMA` / `TOLAK`
- **Perpanjang** — via WA (`PERPANJANG [kode]`) dan web
- **Upgrade** — Featured, AutoBump, Bump via WA dan web

#### Infrastruktur

- **Cron expire** — reminder H-3 dan H-1 sebelum iklan expired (08:00 daily)
- **Cron auto-bump** — bump otomatis iklan yang punya `auto_bump_until` aktif (08:00 daily)
- **Cron broadcast** — siaran terjadwal admin (00:00 daily)
- **Settings DB-backed** — `DEFAULT_SETTINGS` di `settings.js`, bisa override dari tabel `settings` Supabase

---

## Arsitektur Sistem

```
[User WA] ──→ [wa-bot-usu / Railway]
                    │ forward semua pesan (FormData)
                    ↓
              [/api/wa/baileys / Vercel]
                    │ semua business logic di sini
                    ├─→ Supabase (listings, payments, seller_profiles, dll)
                    ├─→ Gemini AI (parse listing, verify struk, chat)
                    └─→ Fonnte/Baileys (kirim WA balik ke user)

[User Browser] ──→ [Next.js / Vercel]
                    ├─→ Supabase
                    ├─→ /api/payments/* (buat payment record, return QRIS statis)
                    └─→ /api/payments/verify-receipt (AI verify struk)
```

**Stack:**
- Bot: Node.js + Baileys (Railway)
- Web: Next.js App Router (Vercel)
- DB: Supabase (PostgreSQL + Storage)
- AI: Gemini 2.5 Flash
- WA Gateway: Fonnte (fallback) + Baileys Railway (utama)

**Tabel Supabase utama:**
`listings`, `seller_profiles`, `payments`, `price_offers`, `seller_ratings`, `category_subscriptions`, `wanted_listings`, `group_posts`, `otps`, `referrals`, `settings`

---

## Alur Pembayaran (Sekarang)

### Via WA Bot
1. User kirim foto + deskripsi + harga
2. AI parse → buat listing (pending) + payment record
3. Bot kirim QRIS statis `/qris.png` + nominal
4. User transfer → kirim foto struk
5. AI verify struk: `is_struk_valid` + `nominal >= base_fee`
6. Listing aktif → notif ke penjual (chat) + notif ke admin + post ke grup WA

### Via Web
1. User login (OTP WA)
2. Isi form → POST `/api/listings` → listing pending + payment record + return `paymentUrl: "/qris.png"`
3. Web tampil QRIS + nominal
4. User transfer → upload foto struk di web
5. POST `/api/payments/verify-receipt` → AI verify → listing aktif
6. Notif WA ke penjual (type-aware) + notif ke admin + post ke grup WA

---

## ENV Variables Penting (Vercel)

| Key | Keterangan |
|-----|-----------|
| `ADMIN_WA` | `62895429126232` — nomor superadmin, terima notif iklan baru |
| `BAILEYS_API_URL` | URL Railway bot (endpoint `/send`) |
| `BAILEYS_API_TOKEN` | Token auth Railway bot |
| `BAILEYS_BROADCAST_GROUPS` | JID grup tambahan (comma-separated) |
| `FONNTE_WA_GROUP_ID` | JID grup utama marketplace |
| `NEXT_PUBLIC_BASE_URL` | `https://www.jualbeliusupolmed.web.id` |
| `GEMINI_API_KEY` | API key Gemini |
| `FONNTE_TOKEN` | Fallback jika Baileys mati |
| `CRON_SECRET` | Auth untuk endpoint cron |

---

## Commit History Sesi Ini

```
e678b1f  feat: notifikasi WA ke penjual dan superadmin saat iklan tayang
4cd1216  feat: hapus Midtrans dari semua payment route web
3fb0f7c  feat: hapus Midtrans & kode unik dari alur pembayaran WA bot
```
