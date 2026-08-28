# Setup Meta Instagram: Auto-Post Menfess & Katalog

Panduan ini menjelaskan cara mendapatkan dan mengisi 4 environment variables
yang dibutuhkan agar sistem auto-post ke Instagram berfungsi.

**Tidak ada nilai token yang boleh dicatat di dokumen ini.** Simpan hanya di Vercel Dashboard.

---

## Environment Variables yang Dibutuhkan

| Variable | Akun IG | Fungsi |
|---|---|---|
| `META_MENFESS_IG_USER_ID` | `@usupolmedmenfess` | ID numerik akun Instagram |
| `META_MENFESS_IG_ACCESS_TOKEN` | `@usupolmedmenfess` | Token akses posting |
| `META_KATALOG_IG_USER_ID` | `@katalogusupolmed` | ID numerik akun Instagram |
| `META_KATALOG_IG_ACCESS_TOKEN` | `@katalogusupolmed` | Token akses posting |

---

## Prasyarat

1. Kedua akun Instagram sudah dikonversi ke **Professional Account** (Creator atau Business).
2. Akun Instagram sudah **terhubung ke Facebook Page** masing-masing.
3. Kamu login ke [Meta Business Suite](https://business.facebook.com) sebagai admin.
4. Facebook App untuk proyek ini sudah ada di Meta Developer.

---

## Langkah 1: Dapatkan IG User ID

1. Buka [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Pilih App yang sesuai, pilih User Token/Page Token
3. Query: `GET /me/accounts` — tampil semua Facebook Page
4. Ambil `id` dari Page yang terhubung ke akun Instagram target
5. Query lanjut: `GET /{page-id}?fields=instagram_business_account`
6. Nilai `id` di dalam `instagram_business_account` adalah **IG User ID**

---

## Langkah 2: Dapatkan Access Token (Long-lived)

### 2a — Short-lived User Token (1 jam)
Di Graph API Explorer, pilih scope: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`.
Klik Generate Access Token.

### 2b — Exchange ke Long-lived Token (~60 hari)
```
curl "https://graph.facebook.com/v24.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "fb_exchange_token=SHORT_LIVED_TOKEN"
```

### 2c — Exchange ke Page Token (tidak expire)
```
curl "https://graph.facebook.com/v24.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
```
Ambil `access_token` dari Page yang sesuai.
**Rekomendasi: gunakan Page Access Token ini — tidak perlu refresh berkala.**

---

## Langkah 3: Isi ke Vercel

1. Buka Vercel Dashboard → Project `jualbeliusupolmed` → Settings → Environment Variables
2. Tambahkan 4 variable: `META_MENFESS_IG_USER_ID`, `META_MENFESS_IG_ACCESS_TOKEN`,
   `META_KATALOG_IG_USER_ID`, `META_KATALOG_IG_ACCESS_TOKEN`
3. **JANGAN centang "Sensitive"** — nilai harus bisa dibaca di runtime
4. Save → Redeploy

---

## Langkah 4: Verifikasi

- Test endpoint: `GET /api/mading/[id]/instagram-image` → harus `200 image/jpeg`
- Test posting: tombol "Terbitkan IG" di panel admin Menfess pada menfess test

---

## Troubleshooting

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| `OAuthException: (#200)` | Scope kurang | Re-generate dengan scope `instagram_content_publish` |
| `Error validating access token` | Token expired | Exchange ulang ke Page Token |
| `not an Instagram Business Account` | Akun belum dikonversi | Konversi di IG Settings → Account → Professional |
| Post di antrean tapi tidak terkirim | Env var kosong di Vercel | Cek Vercel Env Vars + Redeploy |

---

## Rotasi Token

Jika token perlu diganti (dicabut / dicurigai bocor):
1. Generate token baru via langkah 2b-2c
2. **Update di Vercel Dashboard** — jangan commit ke Git
3. Redeploy — token lama otomatis tidak valid
