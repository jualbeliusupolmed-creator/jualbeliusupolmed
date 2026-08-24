export function ProductCardSkeleton() {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.07] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Image placeholder */}
      <div className="relative aspect-square w-full rounded-t-[24px] animate-shimmer" />

      {/* Content placeholders */}
      <div className="p-3 xs:p-3.5 space-y-2.5">
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-black/[0.05] dark:bg-white/[0.06] rounded-full animate-pulse" />
          <div className="h-4 w-16 bg-black/[0.05] dark:bg-white/[0.06] rounded-full animate-pulse" />
        </div>
        {/* Title */}
        <div className="h-3.5 bg-black/[0.05] dark:bg-white/[0.06] rounded-full w-full animate-pulse" />
        <div className="h-3 bg-black/[0.04] dark:bg-white/[0.05] rounded-full w-3/4 animate-pulse" />
        {/* Price */}
        <div className="h-4 bg-black/[0.05] dark:bg-white/[0.06] rounded-full w-2/5 animate-pulse" />
        {/* Footer */}
        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
          <div className="h-2.5 bg-black/[0.04] dark:bg-white/[0.05] rounded-full w-16 animate-pulse" />
          <div className="h-2.5 bg-black/[0.04] dark:bg-white/[0.05] rounded-full w-8 animate-pulse" />
        </div>
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

