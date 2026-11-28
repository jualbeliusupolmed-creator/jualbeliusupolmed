import { LoaderCircle } from "lucide-react";

export default function OpenPoLoading() {
  return (
    <div
      aria-busy="true"
      className="min-h-screen bg-[#f4faf5] pb-[calc(7rem+env(safe-area-inset-bottom))] text-slate-900 dark:bg-slate-950 dark:text-slate-100 xl:pb-8"
    >
      <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <LoaderCircle
            className="h-5 w-5 shrink-0 text-emerald-800 motion-safe:animate-spin dark:text-emerald-300"
            aria-hidden="true"
          />
          <div role="status" className="text-sm">
            <p className="font-bold">Memuat Open PO</p>
            <p className="mt-1 text-slate-700 dark:text-slate-300">
              Menyiapkan batch yang masih menerima pesanan.
            </p>
          </div>
        </div>
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-40 grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-emerald-950/10 bg-white dark:border-white/10 dark:bg-slate-900 sm:flex sm:min-h-80 sm:flex-col"
            >
              <div className="aspect-square w-full bg-emerald-50 dark:bg-slate-800 sm:aspect-auto sm:min-h-40" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-8 h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
