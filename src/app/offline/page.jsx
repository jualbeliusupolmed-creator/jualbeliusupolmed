// Halaman fallback offline untuk PWA — di-precache oleh service worker
// (lihat `fallbacks.document` di next.config.mjs) dan disajikan menggantikan
// halaman apa pun yang diminta saat tidak ada koneksi.
export const metadata = {
  title: "Sedang Offline — Jual Beli USU & POLMED",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Kamu Sedang Offline
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
        Tidak ada koneksi internet. Periksa jaringanmu, lalu coba muat ulang —
        iklan dan mading akan kembali begitu kamu online.
      </p>
      <a
        href="/"
        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
      >
        Coba Lagi
      </a>
    </div>
  );
}
