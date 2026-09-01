// Halaman fallback offline untuk PWA — di-precache oleh service worker
// (lihat `fallbacks.document` di next.config.mjs) dan disajikan menggantikan
// halaman apa pun yang diminta saat tidak ada koneksi.
export const metadata = {
  title: "Sedang Offline — Jual Beli USU & POLMED",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-4"><svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg></div>
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
