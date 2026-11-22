# Panduan Skill Claude Code

Dokumen ini mencatat skill yang terinstal di proyek `kampuskita.my.id`. Gunakan perintah `/<nama-skill>` untuk mengaktifkan instruksi spesifik.

## Daftar Skill Terinstal

### 1. Pola Backend & Arsitektur
- `/backend-patterns`: Praktik terbaik arsitektur server-side, API design, dan optimasi database.

### 2. Anti-Slop (Filtrasi Konten AI)
Gunakan skill ini untuk memastikan hasil kerja tidak terasa "generik" atau "kaku".
- `/antislop`: Filter utama untuk UI, teks, dan kode.
- `/antislop-code`: Kebersihan komentar kode.
- `/antislop-copywriting`: Penulisan teks dan nada suara.
- `/antislop-human`: Fokus pada aksesibilitas dan interaksi manusia.
- `/antislop-layoutmobile`: Responsivitas lintas perangkat.
- `/antislop-ui`: Visual dan performa antarmuka.

### 3. Founder Pack (Validasi Bisnis)
Gunakan urutan ini untuk menguji ide bisnis: `board → competitors → consumer → pricing → offer → cfo → marketing → brand → ops → launch → plan`.
- `/founder-board`: Uji ide dengan framework Hormozi/Thiel/Jobs.
- `/founder-brand`: Identitas visual dan suara brand.
- `/founder-cfo`: Analisis unit economics & profit margin.
- `/founder-competitors`: Analisis kompetitor dan celah pasar.
- `/founder-consumer`: Simulasi panel pembeli (target pasar).
- `/founder-launch`: Checklist peluncuran.
- `/founder-marketing`: Strategi pemasaran dan kanal.
- `/founder-offer`: Optimasi penawaran (offer).
- `/founder-ops`: SOP dan operasional awal.
- `/founder-plan`: Kompilasi rencana bisnis final.
- `/founder-pricing`: Strategi penentuan harga.

### 4. Vercel & React Best Practices
- `/composition-patterns`: Pola komposisi komponen React.
- `/deploy-to-vercel`: Panduan deployment Vercel.
- `/react-best-practices`: Optimasi performa Next.js/React.
- `/react-native-skills`: Pengembangan React Native.
- `/react-view-transitions`: Animasi transisi view.
- `/vercel-cli-with-tokens`: Manajemen Vercel via token.
- `/vercel-optimize`: Optimasi biaya dan performa.
- `/web-design-guidelines`: Audit desain UI.
- `/writing-guidelines`: Standar penulisan dokumentasi.

---
*Catatan: Skill ini dimuat ke dalam konteks Claude Code saat dipanggil. Pastikan untuk selalu merujuk pada `AGENTS.md` di proyek ini untuk aturan keamanan dan boundary operasional.*

## Catatan Desain (16 Nov 2026)

- **Penyempurnaan Tipografi**: `line-height` pada `body` diubah ke `var(--leading-relaxed)` untuk keterbacaan yang lebih baik. Margin konsisten (`var(--space-8)` top, `var(--space-4)` bottom) ditambahkan ke semua heading (`h1`–`h6`) dengan pengecualiannya untuk heading pertama.
- **Peningkatan Aksesibilitas**: Gaya `::selection` diperbarui untuk mode gelap (menggunakan `var(--color-brand-700)`). Efek fokus (`:focus-visible`) sekarang memiliki `border-radius` untuk tampilan yang lebih halus.
- **Konsistensi Warna & Komponen**: Warna latar belakang header dan sidebar kini menggunakan token semantik (`var(--bg-tertiary)`) untuk konsistensi mode terang/gelap. Gaya tombol ikon dan radius kartu disesuaikan untuk tampilan yang lebih seragam.
- **Optimasi Teks**: Properti `text-wrap: pretty` ditambahkan pada elemen `html` untuk penataan teks yang lebih baik di browser modern.
