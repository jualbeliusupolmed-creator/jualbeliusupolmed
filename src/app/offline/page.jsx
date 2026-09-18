// Halaman fallback offline untuk PWA — di-precache oleh service worker
// (lihat `fallbacks.document` di next.config.mjs) dan disajikan menggantikan
// halaman apa pun yang diminta saat tidak ada koneksi.
export const metadata = {
  title: "Sedang Offline — Jual Beli USU & POLMED",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-4 text-slate-400">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Kamu Sedang Offline
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
        Tidak ada koneksi internet. Periksa jaringanmu, lalu coba muat ulang —
        iklan, menfess, dan info kampus akan kembali begitu kamu online.
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
