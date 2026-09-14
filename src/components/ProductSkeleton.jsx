export function ProductCardSkeleton() {
  return (
    <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-white/[0.08] last:border-b-0 bg-white dark:bg-[#1e293b]">
      {/* Top Header: Seller & Metadata */}
      <div className="flex items-center gap-2 mb-1 pr-8">
        <div className="h-10 w-10 shrink-0 rounded-full bg-black/[0.04] dark:bg-white/[0.05] animate-pulse" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-1/3 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
          <div className="h-2.5 w-1/4 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content Body */}
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
        <div className="h-5 w-1/3 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
      </div>

      {/* Badges / Labels */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <div className="h-4 w-12 bg-black/[0.04] dark:bg-white/[0.05] rounded-md animate-pulse" />
        <div className="h-4 w-16 bg-black/[0.04] dark:bg-white/[0.05] rounded-md animate-pulse" />
      </div>

      {/* Attached Image (Feed Style) */}
      <div className="mt-3 relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-80 rounded-[16px] bg-black/[0.04] dark:bg-white/[0.05] animate-pulse" />

      {/* Bottom Action Bar */}
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-20 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
        <div className="h-3 w-16 bg-black/[0.04] dark:bg-white/[0.05] rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="bg-white dark:bg-[#1e293b] sm:rounded-[24px] sm:border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-sm">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
