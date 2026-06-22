# Progres Development — Jual Beli USU/Polmed

---

## Sesi 22 Juni 2026

### Konteks Awal
Laptop mati saat session sebelumnya. Sesi dimulai dengan recovery — cek git status dan memahami apa yang belum di-commit.

### Yang Ditemukan Pending (belum di-commit)
- 9 file modified + 3 file baru (baileys) yang belum masuk git

---

### Commit `86cf4dd` — PRO badges + Baileys dashboard
- Badge ⭐ PRO di `ProductCard.jsx` dan halaman profil `/penjual/[wa]`
- `dbHelpers.js`: fetch `subscription_expires_at` agar badge akurat
- `api/listings/route.js`: limit 15 iklan aktif/pending untuk non-PRO
- `constants.js`: fungsi `formatWaForBaileys()` (08xxx → 628xxx)
- `dashboard/page.jsx`: tampilkan 👁️ views per kartu iklan
- Tab **"WhatsApp Bot"** di admin panel (`AdminPanel.jsx`, `adminData.js`)
- `src/app/admin/baileys/BaileysDashboard.jsx`: UI 6 sub-tab (Status, Chat, Grup, Saluran, Kirim, Log)
- `src/app/api/admin/baileys/route.js`: proxy ke Railway Baileys bot
- `.env.example`: tambah `BAILEYS_API_URL` + `BAILEYS_API_TOKEN`

### Commit `1e59a71` — Wanted auto-match + analytics + SQL migration
- `fonnte.js`: 2 fungsi baru:
  - `notifyWantedMatch()` — WA ke buyer kalau ada iklan baru sekategori
  - `notifySellerProActivated()` — WA konfirmasi ke penjual saat PRO aktif
- `midtrans/webhook/route.js`: PRO notif + wanted auto-match saat iklan aktif
- `api/wa/baileys/route.js`: wanted auto-match saat struk terverifikasi via Baileys
- `dashboard/page.jsx`: stat "Total dilihat" + section "Iklan Paling Banyak Dilihat" (top 3)
- `supabase/migration_blogs_subscription.sql`: tabel blogs + kolom PRO di seller_profiles

### Deploy
- Push ke GitHub → auto-trigger Vercel production deploy
- Build time: 43 detik, status ✅ READY
- Commit HEAD: `1e59a71`

---

## ⚠️ Action Pending — WAJIB Sebelum Lanjut

Jalankan `supabase/migration_blogs_subscription.sql` di **Supabase SQL Editor**:
- Tanpa ini: tabel `blogs` dan kolom PRO di `seller_profiles` belum ada di DB
- Kolom yang ditambah: `subscription_tier`, `subscription_expires_at`, `trusted_seller`, `referral_code`, `free_bumps`
