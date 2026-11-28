export default function LoadingProduk() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-7xl px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:pb-6"
    >
      <p role="status" className="mb-5 text-sm font-medium text-slate-600 dark:text-slate-300">
        Memuat detail produk...
      </p>
      <div aria-hidden="true" className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-5 lg:col-span-7">
          <div className="aspect-square rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-6 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-20 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="h-6 w-1/3 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
