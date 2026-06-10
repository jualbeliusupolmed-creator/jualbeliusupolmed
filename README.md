# Jual Beli USU Polmed 🛒

Marketplace mahasiswa **USU & POLMED** — jual-beli laptop, HP, buku, fashion, makanan, kos, dan jasa. Dibangun dengan Next.js 14 (App Router), Supabase, Midtrans, dan Fonnte (WhatsApp). Siap deploy gratis di Vercel.

---

## ✨ Fitur

- **Homepage** — listing barang aktif, search, filter kategori, banner *featured ads*.
- **Pasang iklan** (`/jual`) — upload foto, pilih kategori/tipe, bayar via Midtrans → **auto-tayang** setelah pembayaran sukses (webhook).
- **Detail produk** — tombol **Minat** (notif WA ke penjual + buka chat), **Share ke IG Story** (auto-generate gambar 9:16 siap download).
- **Dashboard penjual** (`/dashboard`) — lihat iklan via no. WA, update stok, **bump** ke atas (Rp1.000), **mark as sold** (otomatis hitung fee).
- **Admin panel** (`/admin`) — password protected, statistik, total revenue, kelola/suspend/hapus listing, **blacklist** nomor WA.
- **Notifikasi WhatsApp (Fonnte)** — notif admin tiap listing baru, auto-post ke grup WA, notif penjual saat ada peminat, reminder perpanjang sebelum expired.
- **Auto-expire 14 hari** via Vercel Cron + reminder H-2.

---

## 🧱 Tech stack

Next.js 14 · Supabase (DB + Storage) · Midtrans (Snap) · Fonnte · Tailwind CSS · Vercel.

---

## 🚀 Setup langkah per langkah

### 1. Install dependency
```bash
npm install
```

### 2. Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, paste isi `supabase/schema.sql`, **Run**. Ini membuat tabel `categories`, `listings`, `payments`, `blacklist`, RLS, dan bucket storage `listings` (public).
3. Ambil dari **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (rahasia, server-only)

### 3. Midtrans (Sandbox dulu)
1. Daftar di [midtrans.com](https://midtrans.com), pakai **Sandbox**.
2. **Settings → Access Keys**: salin `Server Key` & `Client Key`.
3. **Settings → Configuration → Payment Notification URL**:
   `https://DOMAIN-KAMU/api/midtrans/webhook`
4. Isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`. Set `MIDTRANS_IS_PRODUCTION=false` (sandbox).

### 4. Fonnte (WhatsApp)
1. Daftar di [fonnte.com](https://fonnte.com), connect device.
2. Salin **token** → `FONNTE_TOKEN`.
3. `FONNTE_WA_GROUP_ID` = ID grup tujuan auto-post.

### 5. Environment variables
Salin `.env.example` → `.env.local`, isi semua nilai:
```bash
cp .env.example .env.local
```
| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | Supabase publik |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` | Midtrans |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | dipakai Snap.js di browser |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) / `true` |
| `FONNTE_TOKEN` / `FONNTE_WA_GROUP_ID` | WhatsApp |
| `ADMIN_PASSWORD` | password `/admin` (default `bismillah`) |
| `MARKETPLACE_WA` / `NEXT_PUBLIC_MARKETPLACE_WA` | nomor admin (mis. `62895429126232`) |
| `NEXT_PUBLIC_BASE_URL` | URL situs (link di notif WA) |
| `NEXT_PUBLIC_WA_GROUP_LINK` | link grup (bit.ly/jualbeliusupolmed) |
| `CRON_SECRET` | opsional, proteksi cron |

### 6. Jalankan
```bash
npm run dev      # http://localhost:3000
npm run build    # cek build production
```

---

## ☁️ Deploy ke Vercel

1. Push repo ke GitHub, import di [vercel.com](https://vercel.com).
2. Tambahkan **semua** env di **Project Settings → Environment Variables**.
3. Deploy. Cron auto-expire (`vercel.json`) jalan harian jam 01:00.
4. Update **Midtrans Notification URL** & `NEXT_PUBLIC_BASE_URL` ke domain Vercel.

---

## 💰 Struktur fee

| Item | Biaya |
|---|---|
| Iklan barang | Rp 2.000 |
| Iklan poster | Rp 10.000 |
| Bump | Rp 1.000 |
| Featured ads | Rp 5.000–10.000 / hari |
| Setelah terjual | < Rp50rb: Rp2.000 · < Rp100rb: 10% · ≥ Rp100rb: 5% |

---

## 📁 Struktur

```
src/
  app/
    page.jsx                  Homepage (+ HomeBrowser client)
    jual/                     Form pasang iklan + bayar
    cara-bergabung/           Info & aturan
    dashboard/                Dashboard penjual
    admin/                    Admin panel (login + panel)
    produk/[id]/              Detail produk
    api/
      listings/               GET (per penjual) + POST (buat + bayar)
      listings/[id]/          PATCH (sold / stok)
      payments/bump/          Bump Rp1.000
      midtrans/webhook/       Verifikasi & aktivasi setelah bayar
      minat/                  Notif penjual (Fonnte)
      admin/login|action/     Auth & moderasi
      cron/expire/            Auto-expire + reminder
  components/                 Navbar, Footer, ProductCard, dll.
  lib/                        supabase, midtrans, fonnte, fees, auth
supabase/schema.sql           Skema database
vercel.json                   Cron config
```

---

Dibuat untuk komunitas **Jual Beli USU Polmed** · bit.ly/jualbeliusupolmed
