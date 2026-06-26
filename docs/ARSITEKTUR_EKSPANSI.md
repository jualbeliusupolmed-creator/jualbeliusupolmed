# Arsitektur Ekspansi Marketplace — Semua Skema

> Dokumen ini menjabarkan semua opsi arsitektur untuk mengembangkan Jual Beli USU Polmed
> menjadi marketplace yang lebih luas (Jual Beli Medan dan seterusnya).
> Dibuat 26 Juni 2026.

---

## Konteks Saat Ini

| Komponen | Kondisi Sekarang |
|---|---|
| App | Next.js 14, Vercel (`jualbeliusupolmed.vercel.app`) |
| Database | Supabase (1 project) |
| Bot | Fonnte WA + handler di Next.js API routes |
| Backend job | Railway (bot / cron) |
| Config dinamis | `settings` table di Supabase (nama site, WA, hero, kategori) |
| Target user | Mahasiswa USU & Polmed |

---

## Daftar Skema

| # | Nama Skema | DB | Codebase | Deploy |
|---|---|---|---|---|
| A | Ekspansi Langsung | 1 shared | 1 (rename) | 1 Vercel |
| B | Dua Project Terpisah | 2 pisah | 2 (fork) | 2 Vercel |
| C | Multi-Tenant DB Pisah | N pisah | 1 shared | N Vercel |
| D | Multi-Tenant DB Shared (barang terpisah) | 1 shared | 1 shared | N Vercel |
| E | Multi-Tenant DB Shared (barang campur) | 1 shared | 1 shared | N Vercel |
| F | Superset — USU sebagai komunitas Medan | 1 shared | 1 shared | 2 Vercel |
| G | White-label SaaS | N pisah | 1 + config | N Vercel |
| H | Monorepo + Shared Packages | N pisah | 1 monorepo | N Vercel |
| I | Subdomain per Komunitas | 1 shared | 1 shared | 1 Vercel |

---

## Skema A — Ekspansi Langsung (Rename & Expand)

### Deskripsi
Ubah `jualbeliusupolmed` menjadi `jualbelimedan`. Tidak ada project baru, cukup ganti nama,
branding, dan perluas target audience ke seluruh Medan.

### Infrastruktur
```
Supabase (1)  ──►  Next.js (1)  ──►  Vercel: jualbelimedan.vercel.app
Railway (1)   ──►  Bot WA (1 nomor)
```

### Perubahan yang Dibutuhkan
- Ganti nama site di `settings` DB
- Ganti kategori jadi lebih umum
- Update meta/SEO
- Ganti domain

### Kelebihan
- ✅ Effort paling kecil, bisa selesai dalam 1 hari
- ✅ Tidak ada duplikasi kode atau infra
- ✅ Semua fitur yang sudah ada langsung terbawa
- ✅ Satu admin panel, satu bot

### Kekurangan
- ❌ Kehilangan identitas kampus — trust signal mahasiswa hilang selamanya
- ❌ Buyer/seller lama yang sudah kenal "Jual Beli USU" jadi bingung
- ❌ Tidak bisa kembali ke model kampus tanpa effort besar
- ❌ Audience baru (Medan umum) butuh akuisisi ulang dari nol

### Kapan Cocok
Kalau kamu memutuskan **tidak** ingin mempertahankan marketplace kampus sama sekali
dan fokus 100% ke pasar Medan.

### Rekomendasi
⚠️ **Tidak disarankan** — buang aset yang sudah dibangun (komunitas kampus, trust).

---

## Skema B — Dua Project Terpisah (Fork)

### Deskripsi
Fork repo menjadi dua repo independen. Masing-masing punya Supabase, Railway, dan Vercel sendiri.
Tidak ada hubungan teknis antara keduanya.

### Infrastruktur
```
Repo USU  ──►  Supabase USU  ──►  Vercel: jualbeliusupolmed.vercel.app
          └──►  Railway Bot USU

Repo Medan ──►  Supabase Medan ──►  Vercel: jualbelimedan.vercel.app
           └──►  Railway Bot Medan
```

### Perubahan yang Dibutuhkan
- Fork repo → repo baru
- Setup Supabase baru (jalankan semua migration)
- Setup Vercel project baru
- Setup Railway service baru
- Seed settings DB dengan branding Medan

### Kelebihan
- ✅ Branding masing-masing 100% bersih
- ✅ Zero risiko cross-tenant bug
- ✅ Bisa evolve secara independen (fitur beda per marketplace)
- ✅ Satu down tidak pengaruh yang lain

### Kekurangan
- ❌ Setiap perbaikan / fitur baru harus diapply **manual ke dua repo**
- ❌ Bug fix yang sama harus di-commit dua kali
- ❌ Dua Railway, dua Supabase = cost double
- ❌ Lama-kelamaan kedua codebase akan diverge dan makin susah di-sync

### Kapan Cocok
Kalau kamu mau dua marketplace yang benar-benar **independen** secara bisnis,
mungkin dijual/diserahkan ke orang berbeda di masa depan.

### Rekomendasi
⚠️ **Tidak disarankan** untuk jangka panjang — maintenance nightmare kalau
sudah lebih dari 2 marketplace.

---

## Skema C — Multi-Tenant: Satu Codebase, DB Terpisah ⭐

### Deskripsi
Satu GitHub repo yang sama di-deploy ke beberapa Vercel project. Masing-masing Vercel project
punya env vars sendiri (Supabase URL berbeda). Data 100% terpisah per tenant.

### Infrastruktur
```
GitHub Repo (1)
    │
    ├──► Vercel Project USU   ──►  Supabase USU   ──►  Railway Bot USU
    │    (env: SUPABASE_URL=usu)
    │
    └──► Vercel Project Medan ──►  Supabase Medan  ──►  Railway Bot Medan
         (env: SUPABASE_URL=medan)
```

### Perubahan yang Dibutuhkan
- Audit hardcode string kampus (grep "USU", "Polmed") → pindahkan ke env var atau settings DB
- Tambah `lib/tenant.js` untuk fallback defaults per tenant
- Buat Supabase project baru untuk Medan
- Jalankan semua `migration_*.sql` di DB baru
- Buat Vercel project baru, link ke repo GitHub yang sama
- Set env vars berbeda per Vercel project
- Railway: 2 service terpisah (masing-masing env vars-nya sendiri)

### Env Vars yang Berbeda per Tenant
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FONNTE_TOKEN          (bisa beda nomor bot)
ADMIN_PASSWORD
CRON_SECRET
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
MIDTRANS_SERVER_KEY
```

### Admin / Superadmin
Daftarkan nomor WA yang sama di kedua Supabase DB sebagai admin.
Masing-masing bot mengenali nomor itu sebagai admin tanpa konflik.

### Data
Produk, seller, buyer, payment — semua **100% terpisah per DB**. Tidak ada mixing.

### Kelebihan
- ✅ Fitur baru deploy sekali → langsung jalan di semua tenant
- ✅ Bug fix cukup di-commit sekali
- ✅ Data terpisah sempurna (privasi, keamanan, regulasi)
- ✅ Branding per tenant bisa beda total (dari settings DB)
- ✅ Satu Railway per tenant = bot tidak cross-pollute
- ✅ Bisa tambah tenant ke-3, ke-4 tanpa ubah kode

### Kekurangan
- ❌ Biaya infra bertambah per tenant (Supabase + Railway baru)
- ❌ Setup awal perlu lebih banyak langkah
- ❌ Admin harus buka panel yang berbeda per marketplace
- ❌ Tidak ada network effect antar marketplace

### Kapan Cocok
Ketika tiap marketplace punya **komunitas dan audience yang benar-benar berbeda**.
USU/Polmed = mahasiswa kampus. Medan = warga umum. Dua segmen yang tidak overlapping signifikan.

### Rekomendasi
✅ **DIREKOMENDASIKAN** sebagai default — paling scalable, maintenance ringan,
data bersih, bisa ekspansi ke Unimed/Unimed/kampus lain cukup dengan tambah env vars baru.

---

## Skema D — Multi-Tenant DB Shared, Barang Terpisah

### Deskripsi
Satu Supabase untuk semua tenant. Setiap baris di tabel `listings`, `payments`, dll
punya kolom `tenant` untuk menentukan marketplace mana barang itu tampil.

### Infrastruktur
```
GitHub Repo (1)
    │
    ├──► Vercel Project USU   ──┐
    │                           ├──►  Supabase Shared (1 DB)
    └──► Vercel Project Medan  ─┘         │
                                      Railway (1 atau 2)
```

### Perubahan Database
```sql
-- Tambah ke semua tabel utama:
ALTER TABLE listings  ADD COLUMN tenant text NOT NULL DEFAULT 'usu';
ALTER TABLE payments  ADD COLUMN tenant text NOT NULL DEFAULT 'usu';
ALTER TABLE seller_profiles ADD COLUMN tenant text NOT NULL DEFAULT 'usu';

-- Index
CREATE INDEX idx_listings_tenant ON listings(tenant);

-- RLS per tenant
CREATE POLICY "tenant_isolation" ON listings
  USING (tenant = current_setting('app.tenant'));
```

### Cara Kerja di App
```js
// lib/tenant.js
export function getTenant() {
  return process.env.NEXT_PUBLIC_TENANT || 'usu'; // 'usu' | 'medan'
}

// Semua query wajib filter tenant:
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('tenant', getTenant());
```

### Admin
Satu admin panel bisa lihat **semua tenant** sekaligus (filter by tenant),
atau tetap buka per Vercel project untuk panel terisolasi.

### Kelebihan
- ✅ Satu Supabase = hemat biaya
- ✅ Admin bisa lihat data semua marketplace dari satu tempat
- ✅ Analytics cross-marketplace mudah
- ✅ Seller bisa "expand" listing ke marketplace lain (add tenant ke array)

### Kekurangan
- ❌ RLS harus airtight — bug bisa expose data antar tenant
- ❌ Satu Supabase down = semua marketplace down
- ❌ Schema migration harus hati-hati (tidak bisa rollback per tenant)
- ❌ Sulit jual/serahkan satu marketplace ke pihak lain di masa depan

### Kapan Cocok
Ketika budget sangat terbatas dan kamu sendiri yang manage semua marketplace.

### Rekomendasi
⚠️ **Bisa dipertimbangkan** kalau budget jadi constraint utama.
Risiko utama adalah security isolation — harus disiplin di setiap query.

---

## Skema E — Multi-Tenant DB Shared, Barang Campur

### Deskripsi
Sama seperti Skema D, tapi barang dari semua tenant bisa muncul di semua marketplace.
Buyer bisa filter by lokasi/komunitas, tapi defaultnya lihat semua.

### Cara Kerja
```sql
-- tenant berupa array (listing bisa tampil di banyak marketplace)
ALTER TABLE listings ADD COLUMN tenants text[] DEFAULT ARRAY['usu'];

-- Query: lihat semua listing yang include tenant ini
SELECT * FROM listings WHERE 'medan' = ANY(tenants);
```

### UX Flow
- Seller posting → pilih tampil di: [USU] [Medan] [Keduanya]
- Buyer buka jualbelimedan.com → lihat semua barang (USU + Medan)
- Buyer buka jualbeliusupolmed.com → lihat barang USU saja
- Filter lokasi tersedia di sidebar

### Monetisasi Baru dari Skema Ini
```
Cross-post fee: Rp 2.000 untuk tampilkan listing di marketplace lain
Premium visibility: listing USU tampil di top Medan
```

### Kelebihan
- ✅ Network effect maksimal — lebih banyak barang = lebih menarik
- ✅ Seller dapat exposure lebih luas
- ✅ Potensi monetisasi dari cross-posting
- ✅ Satu Supabase, hemat cost

### Kekurangan
- ❌ Masalah **lokasi/COD** — buyer Medan tidak mau beli dari seller yang di kampus USU
- ❌ Kategori kampus (buku kuliah, kos) tidak relevan untuk buyer umum Medan
- ❌ Trust signal "marketplace kampus" hilang kalau campur dengan barang umum
- ❌ Kompleksitas query naik (array filter)
- ❌ Moderasi lebih susah (konten kampus vs konten umum)

### Kapan Cocok
Kalau barang yang dijual **tidak terikat lokasi fisik** (digital goods, jasa online)
atau marketplace fokus ke delivery (bukan COD kampus).

### Rekomendasi
⚠️ **Tidak disarankan** untuk marketplace COD kampus seperti ini.
Masalah lokasi/COD akan jadi complaint utama buyer.

---

## Skema F — Superset: USU sebagai Komunitas di Dalam Medan

### Deskripsi
`jualbelimedan.com` adalah marketplace induk. `jualbeliusupolmed.com` adalah
"komunitas" atau "channel" di dalam Medan. Semua listing USU otomatis muncul di Medan,
tapi listing Medan umum tidak muncul di USU (kecuali relevan).

### Infrastruktur
```
GitHub Repo (1)
    │
    ├──► jualbelimedan.com    ──►  Supabase Shared  ◄── tampil: semua tenant
    │
    └──► jualbeliusupolmed.com ──►  Supabase Shared  ◄── tampil: tenant='usu' saja
```

### Logika Tenant
```
listing.tenant = 'usu'   → tampil di USU + Medan
listing.tenant = 'medan' → tampil di Medan saja
```

### Kelebihan
- ✅ Medan dapat inventory besar dari hari pertama (semua barang USU masuk)
- ✅ Seller USU dapat exposure lebih luas otomatis
- ✅ Satu DB, satu codebase
- ✅ Admin panel bisa jadi superadmin Medan yang lihat segalanya

### Kekurangan
- ❌ Masih ada masalah lokasi/COD untuk buyer Medan yang lihat barang kampus
- ❌ Buyer Medan butuh filter yang bagus agar tidak kewalahan lihat barang yang tidak relevan
- ❌ Seller kampus mungkin tidak nyaman listing-nya tampil ke "orang umum"

### Kapan Cocok
Ketika kamu ingin **launch Medan dengan cepat** dan pakai inventory USU sebagai
starter content sambil rekrut seller Medan baru.

### Rekomendasi
🔵 **Menarik sebagai strategi launch**, tapi butuh filter lokasi yang kuat di UI.
Bisa jadi bridge antara Skema C dan E.

---

## Skema G — White-Label SaaS

### Deskripsi
Satu platform yang bisa di-deploy untuk siapa saja — kampus lain, kota lain,
komunitas lain — dengan konfigurasi dari dashboard. Bisnis modelnya:
sewakan marketplace ke institusi lain.

### Infrastruktur
```
GitHub Repo (1)  ──►  SaaS Platform
                           │
                    ┌──────┼──────────┐
                    ▼      ▼          ▼
                  USU   Polmed      Unimed
                  DB     DB          DB
```

### Fitur Tambahan yang Dibutuhkan
- Dashboard onboarding tenant baru (self-service)
- Billing per tenant (langganan bulanan)
- Custom domain support
- Tenant management panel (superadmin global)
- Isolasi storage per tenant di Supabase

### Kelebihan
- ✅ Potensi revenue besar (jual ke kampus lain, komunitas lain)
- ✅ Satu codebase untuk banyak klien
- ✅ Bisa jadi bisnis SaaS yang scalable

### Kekurangan
- ❌ Effort development jauh lebih besar (3-5x dari skema lain)
- ❌ Butuh support & operasional per klien
- ❌ Butuh legal/kontrak per klien
- ❌ Overkill kalau tujuannya cuma tambah satu marketplace baru

### Kapan Cocok
Kalau ada **demand nyata** dari kampus/institusi lain yang mau beli platform ini.
Jangan build sampai ada paying customer pertama.

### Rekomendasi
🔵 **Simpan sebagai visi jangka panjang** — jangan build sekarang.
Validasi dulu dengan Skema C, baru pivot ke SaaS kalau ada kampus lain yang minta.

---

## Skema H — Monorepo + Shared Packages (Turborepo)

### Deskripsi
Satu monorepo dengan Turborepo. Logic bisnis yang sama (fees, bot, auth, komponen UI)
dijadikan shared packages. Setiap marketplace adalah app terpisah yang consume packages yang sama.

### Struktur Folder
```
/marketplace-monorepo
  /apps
    /usu-polmed    ← Next.js app khusus USU
    /medan         ← Next.js app khusus Medan
  /packages
    /ui            ← komponen shared (ProductCard, etc.)
    /bot-core      ← logic WA bot
    /fees          ← kalkulasi fee
    /db            ← Supabase helpers
```

### Kelebihan
- ✅ Shared packages di-update sekali, semua app dapat update
- ✅ Setiap app bisa punya UI/fitur berbeda kalau diperlukan
- ✅ Type-safe jika pakai TypeScript
- ✅ Scalable untuk banyak marketplace berbeda

### Kekurangan
- ❌ Setup Turborepo cukup kompleks
- ❌ Butuh refactor besar dari struktur saat ini
- ❌ Overkill untuk 2 marketplace yang 95% sama
- ❌ Butuh migrasi ke TypeScript untuk benefit penuh

### Kapan Cocok
Kalau marketplace sudah 5+ dengan banyak perbedaan UI/fitur per marketplace.

### Rekomendasi
⚠️ **Terlalu dini** — over-engineering untuk kebutuhan saat ini.
Skema C sudah cukup dan bisa di-evolve ke monorepo nanti kalau perlu.

---

## Skema I — Subdomain per Komunitas (Satu Deploy)

### Deskripsi
Satu Vercel project, satu codebase, satu DB. Komunitas dibedakan via subdomain
menggunakan Next.js middleware untuk routing.

```
usu.jualbelimedan.com    → filter tenant=usu
polmed.jualbelimedan.com → filter tenant=polmed
medan.jualbelimedan.com  → tampil semua
```

### Cara Kerja
```js
// middleware.js
export function middleware(request) {
  const hostname = request.headers.get('host');
  const tenant = hostname.split('.')[0]; // 'usu', 'polmed', 'medan'
  
  const response = NextResponse.next();
  response.headers.set('x-tenant', tenant);
  return response;
}
```

### Kelebihan
- ✅ Satu deploy, satu Vercel project, biaya minimal
- ✅ Tambah komunitas baru cukup daftarkan subdomain
- ✅ SEO per komunitas tetap bagus (subdomain berbeda)
- ✅ Satu admin panel untuk manage semua

### Kekurangan
- ❌ Satu down = semua komunitas down
- ❌ Sulit beri branding sangat berbeda antar subdomain
- ❌ Data di satu DB — RLS harus kuat
- ❌ Custom domain per komunitas lebih susah (vs subdomain fix)

### Kapan Cocok
Kalau ingin **satu brand besar** (jualbelimedan.com) dengan sub-komunitas di dalamnya,
bukan dua brand terpisah yang berdiri sendiri.

### Rekomendasi
🔵 **Menarik kalau visinya satu marketplace Medan** dengan filter komunitas/kampus.
Cocok dikombinasikan dengan Skema F.

---

## Perbandingan Lengkap

| Kriteria | A | B | C⭐ | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|---|
| Effort setup | Rendah | Sedang | Sedang | Sedang | Tinggi | Sedang | Sangat Tinggi | Sangat Tinggi | Sedang |
| Maintenance jangka panjang | Mudah | Sulit | Mudah | Mudah | Sedang | Mudah | Sedang | Mudah | Mudah |
| Biaya infra | Hemat | Mahal | Sedang | Hemat | Hemat | Hemat | Sedang | Sedang | Hemat |
| Isolasi data | N/A | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| Branding terpisah | ❌ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| Network effect | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Scalable ke 3+ tenant | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin terpusat | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Risiko bisnis | Tinggi | Rendah | Rendah | Sedang | Tinggi | Sedang | Tinggi | Rendah | Sedang |

---

## Rekomendasi Final

### Untuk Sekarang (0-6 bulan): **Skema C**
> Multi-tenant, satu codebase, DB terpisah

Alasan:
- Effort setup 1-2 hari kerja, bisa langsung launch
- Data dan branding benar-benar bersih
- Tidak ada risiko bug cross-tenant
- Nomor admin bisa sama (daftar di kedua DB)
- Kalau Medan tidak berhasil, tinggal matikan — tidak ada efek ke USU

**Langkah eksekusi Skema C:**
1. Audit & bersihkan hardcode string "USU/Polmed" di kode
2. Buat Supabase project baru (medan)
3. Jalankan semua `migration_*.sql`
4. Buat Vercel project baru → link ke repo GitHub yang sama
5. Set env vars baru (Supabase medan, Fonnte token, dll)
6. Seed `settings` DB dengan branding Jual Beli Medan
7. Railway: duplicate service, set env vars baru
8. Deploy & test

### Untuk Jangka Menengah (6-18 bulan): **Evolve ke Skema F atau I**
Kalau Medan tumbuh dan ada sinergi dengan USU (seller yang sama jual di dua marketplace),
pertimbangkan migrasi ke model superset atau subdomain untuk dapat network effect.

### Untuk Jangka Panjang (18+ bulan): **Skema G (SaaS)**
Kalau ada kampus lain (Unimed, Itera, Unand) yang minta platform serupa,
baru pivot ke white-label SaaS. Jangan build sekarang.

---

_Dokumen ini dibuat sebagai panduan keputusan arsitektur. Update sesuai perkembangan bisnis._
