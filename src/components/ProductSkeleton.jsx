export function ProductCardSkeleton() {
  return (
    <div className="card group relative flex flex-col justify-between overflow-hidden p-2.5 xs:p-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl animate-pulse">
      <div>
        {/* Image placeholder */}
        <div className="relative aspect-square w-full rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden" />

        {/* Content placeholders */}
        <div className="mt-2.5 space-y-2">
          {/* Title */}
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-3/5" />

          {/* Price */}
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2 mt-2" />
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-8" />
      </div>
    </div>
  );
}

export default function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
