# 📱 Panduan Publikasi ke Google Play Store (Android APK / AAB)
**Platform:** Jual Beli USU & POLMED (Campus Super App)

Website ini sudah 100% **PWA-Ready & Play Store Compliant** (menggunakan service worker, HTTPS, `manifest.json` maskable icons, shortcuts, and standalone display).

Ada **2 cara termudah** untuk mengubah website ini menjadi file `.aab` / `.apk` untuk Google Play Store:

---

## 🌟 Cara 1: Menggunakan PWABuilder (Paling Mudah & Rekomendasi 2 Menit)

1. Buka [https://www.pwabuilder.com](https://www.pwabuilder.com).
2. Masukkan URL website produksi Abang: `https://www.jualbeliusupolmed.web.id` (atau URL Vercel).
3. Klik tombol **Start**. PWABuilder akan mengecek audit PWA (skor kita sudah 100%).
4. Klik tombol **Package for Stores** $\rightarrow$ pilih **Android (Google Play)**.
5. Isi data nama aplikasi:
   * **App Name:** Jual Beli USU Polmed
   * **Package ID:** `id.web.jualbeliusupolmed`
6. Klik **Generate / Download Package**.
7. Abang akan mendapatkan file **`.aab` (Android App Bundle)** dan **`.apk`** yang sudah ditandatangani dan siap diunggah ke Google Play Console!

---

## 🛠️ Cara 2: Menggunakan CLI Google Bubblewrap (Trusted Web Activity)

Jika ingin build langsung dari terminal komputer:

```bash
# 1. Install bubblewrap CLI resmi dari tim Google Chrome
npm install -g @bubblewrap/cli

# 2. Inisialisasi dari manifest website
bubblewrap init --manifest="https://www.jualbeliusupolmed.web.id/manifest.json"

# 3. Build file AAB & APK
bubblewrap build
```

Hasil file `.aab` akan otomatis tercipta di folder project dan siap diunggah ke Google Play Store.
