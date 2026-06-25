# Integrasi WhatsApp Bot & Website — Jual Beli USU Polmed

Dokumen ini menjelaskan bagaimana saluran WhatsApp Bot dan Website bekerja bersama, berbagi data, dan saling melengkapi.

---

## Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (Database)                   │
│  listings · payments · seller_profiles · price_offers   │
│  otps · category_subscriptions · scheduled_broadcasts   │
│  reports · blacklist · settings · blogs · search_logs   │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
        ┌──────────┴──┐        ┌──────┴───────┐
        │  WA BOT      │        │   WEBSITE    │
        │  (Railway)   │        │   (Vercel)   │
        │              │        │              │
        │  Baileys     │        │  Next.js 14  │
        │  index.js    │        │  App Router  │
        └──────┬───────┘        └──────┬───────┘
               │                       │
               │  webhook forward      │  API calls
               ↓                       ↓
        ┌──────────────────────────────────────┐
        │        VERCEL — API Routes           │
        │                                      │
        │  /api/wa/baileys  ← WA bot webhook  │
        │  /api/listings    ← Web form        │
        │  /api/payments/*  ← Web payment     │
        │  /api/admin/*     ← Admin panel     │
        │  /api/cron/*      ← Scheduled jobs  │
        └──────────────────────────────────────┘
               │
               ↓
        ┌──────────────────────┐
        │   GEMINI AI          │
        │  • Parse listing     │
        │  • Verifikasi struk  │
        │  • Chat bot          │
        └──────────────────────┘
```

---

## Titik Integrasi Utama

### 1. Database Bersama (Supabase)
WA bot dan website **membaca dan menulis ke database yang sama**. Tidak ada duplikasi data.

- Iklan dibuat via WA → langsung muncul di website
- Dashboard web menampilkan data yang sama dengan yang dikelola bot
- Admin panel mengelola data yang digunakan keduanya
- Settings (harga, mode monetisasi) berlaku untuk kedua saluran

### 2. Session Seller
Login via website menggunakan **OTP yang dikirim ke WA**. Setelah login, session tersimpan di browser (cookie HMAC-signed, 30 hari). Tidak ada password terpisah untuk web dan WA.

### 3. Notifikasi WA dari Aksi Web
Setiap aksi penting di website memicu notifikasi WA:

| Aksi di Website | Notif WA Dikirim ke |
|---|---|
| Iklan tayang (bayar via web) | Penjual (2 pesan: konfirmasi + link share) |
| Iklan tayang | Admin (1 pesan: share card) |
| Iklan tayang | Subscriber kategori (1 pesan per subscriber) |
| Iklan tayang | Grup WA marketplace |
| Pembeli tawar harga | Penjual (link chat ke pembeli) |
| Reminder H-3 / H-1 (cron) | Penjual (kode `PERPANJANG [kode]`) |

### 4. Perintah WA yang Mempengaruhi Web
Semua perintah WA mengubah data di Supabase yang langsung terefleksi di website.

| Perintah WA | Efek di Website |
|---|---|
| `BUMP 1001` | Iklan naik ke atas di homepage |
| `HAPUS LAKU 1001` | Iklan hilang dari listing, status sold |
| `EDIT 1001 HARGA 200000` | Harga baru tampil di halaman produk |
| `UPGRADE FEATURED 1001 7` | Iklan muncul di seksi Featured homepage |
| `NAMA [nama]` | Nama penjual update di semua iklan & profil publik |

---

## Alur Pembayaran: WA vs Web

### Persamaan
- Sama-sama pakai QRIS statis (`/qris.png`)
- Sama-sama pakai AI Gemini untuk verifikasi struk
- Sama-sama membuat record di tabel `payments`
- Setelah bayar, notif WA dikirim dari keduanya

### Perbedaan

| Aspek | Via WA Bot | Via Website |
|---|---|---|
| Entry point | Foto + caption di WA | Form di `/jual` |
| AI parse | Bot parse caption otomatis | User isi form manual |
| QRIS display | Gambar dikirim ke chat WA | Gambar ditampilkan di browser |
| Upload struk | Foto dikirim ke WA | Upload di form web |
| Verifikasi | `/api/wa/baileys` | `/api/payments/verify-receipt` |
| Kode perintah | Bot langsung proses | Frontend POST ke API |

### Diagram Alur WA

```
User ──foto+caption──→ WA Bot (Railway)
                            │
                            ↓ HTTP POST multipart
                       /api/wa/baileys (Vercel)
                            │
                     ┌──────┴──────┐
                     │   Gemini    │ parse caption
                     └──────┬──────┘
                            │ listing + payment dibuat
                            ↓
                       Kirim QRIS ke user (WA)
                            │
                     user transfer + kirim struk
                            │
                     ┌──────┴──────┐
                     │   Gemini    │ verifikasi struk
                     └──────┬──────┘
                            │ valid
                            ↓
                       listing aktif (Supabase)
                       notif WA (2 pesan ke penjual)
                       notif admin
                       post ke grup WA
```

### Diagram Alur Web

```
User ──form+foto──→ Browser (Next.js)
                        │
                        ↓ POST /api/listings
                   listing + payment dibuat (Supabase)
                        │
                   Tampil QRIS di browser
                        │
                   user transfer + upload struk
                        │
                        ↓ POST /api/payments/verify-receipt
                     ┌──────┴──────┐
                     │   Gemini    │ verifikasi struk
                     └──────┬──────┘
                            │ valid
                            ↓
                       listing aktif (Supabase)
                       notif WA (2 pesan ke penjual)
                       notif admin
                       post ke grup WA
```

---

## Fitur: WA vs Web vs Keduanya

### Hanya via WA Bot
| Fitur | Keterangan |
|---|---|
| Parse iklan dari caption foto | AI baca deskripsi, harga, kondisi otomatis |
| Perintah text (`CEK`, `BUMP`, dll) | Semua command WA |
| Notifikasi push ke user | Bot kirim pesan inisiatif (reminder, notif tawaran) |
| Join grup WA marketplace | Link dari WA bot |

### Hanya via Website
| Fitur | Keterangan |
|---|---|
| Dashboard penjual | Statistik, history, kelola semua iklan |
| Profil publik penjual | Halaman `/profil/[wa]` |
| Halaman produk detail | SEO-optimized, OG image, share card |
| Blog | Artikel dari admin |
| Halaman Dicari | List iklan barang yang dicari |
| Admin panel | Moderasi, analytics, broadcast, pengaturan |
| Push notification PWA | Notif browser (perlu install PWA) |

### Tersedia di Keduanya
| Fitur | WA | Web |
|---|---|---|
| Pasang iklan | ✅ (foto + caption) | ✅ (form + upload) |
| Bayar & aktivasi iklan | ✅ (QRIS + struk via chat) | ✅ (QRIS + struk upload) |
| Bump iklan | ✅ `BUMP 1001` | ✅ tombol di dashboard |
| Perpanjang iklan | ✅ `PERPANJANG 1001` | ✅ tombol di dashboard |
| Featured | ✅ `UPGRADE FEATURED` | ✅ tombol di dashboard |
| Auto Bump | ✅ `UPGRADE AUTOBUMP` | ✅ tombol di dashboard |
| Cek status iklan | ✅ `CEK 1001` | ✅ dashboard |
| Tawar harga | ✅ `TAWAR 1001 150000` | ✅ tombol di halaman produk |
| Tawaran masuk | ✅ `TAWARAN` | ✅ dashboard |
| Hapus iklan | ✅ `HAPUS LAKU / GALAKU` | ✅ dashboard |
| Ganti nama profil | ✅ `NAMA [nama]` | ✅ dashboard / edit profil |
| Login | ✅ (OTP dikirim via WA) | ✅ (OTP input di web) |

---

## Cara WA Bot Mengirim Pesan Kembali

Semua balasan bot menggunakan `src/lib/fonnte.js`:

```
1. Coba kirim via Baileys (Railway)
   → POST ke BAILEYS_API_URL/send dengan BAILEYS_API_TOKEN
   
2. Jika Baileys gagal/timeout:
   → Fallback ke Fonnte API
   → POST ke api.fonnte.com/send dengan FONNTE_TOKEN
```

Ini memastikan bot tetap bisa kirim pesan meski Railway sedang restart atau ada masalah koneksi.

---

## Security

### Autentikasi
- **Admin web**: Cookie HMAC-SHA256 dari `ADMIN_PASSWORD`, expire 8 jam
- **Seller web**: Cookie HMAC-signed token `{ wa, exp }`, expire 30 hari, OTP via WA
- **WA bot**: Token `BAILEYS_API_TOKEN` di header setiap request dari Railway ke Vercel
- **Cron**: Bearer `CRON_SECRET` atau header `x-vercel-cron` dari Vercel infrastructure

### Rate Limiting
In-memory rate limiter aktif di semua endpoint sensitif:
- OTP send: 3x per menit per IP
- OTP verify: 10x per menit per IP
- Login email: 10x per menit per IP
- Upload: 20x per menit
- Dan 5+ route lainnya

### Input Validation
- Nomor WA di-normalize via `formatWa()` sebelum disimpan
- Upload file: MIME type check + size limit 5MB + konversi WebP via Sharp
- Semua query Supabase menggunakan parameterized (Supabase JS v2)

### Security Headers
Ditambahkan via `next.config.mjs`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-XSS-Protection: 1; mode=block`

---

## Catatan Pengembangan

### Menambah Fitur Baru

Jika fitur menyentuh keduanya (WA + Web):
1. Buat/update logika di Supabase (tabel/kolom jika perlu)
2. Implementasi di `/api/wa/baileys/route.js` (WA flow)
3. Implementasi di `/api/payments/` atau endpoint baru (Web flow)
4. Update UI di `src/app/` (web frontend)
5. Update notifikasi WA di `src/lib/fonnte.js` jika ada notif baru

### Debugging

- **WA flow tidak berjalan**: Cek log Railway → lihat pesan yang masuk ke bot → cek apakah webhook berhasil diterima Vercel
- **Web flow tidak berjalan**: Cek browser console + Vercel function logs
- **Gemini gagal**: Cek `error_logs` table di Supabase, atau `/admin/audit`
- **Notif tidak terkirim**: Cek Fonnte dashboard untuk delivery status, atau Railway log untuk Baileys errors
