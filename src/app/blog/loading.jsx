export default function BlogLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-9"
    >
      <p role="status" className="text-sm font-semibold text-[#0a2e1f] dark:text-slate-200">
        Memuat artikel berita...
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div
          aria-hidden="true"
          className="aspect-[16/9] animate-pulse rounded-2xl bg-[#e4f2e8] dark:bg-[#173c2b]"
        />
        <div aria-hidden="true" className="space-y-3">
          <div className="h-5 w-2/5 animate-pulse rounded bg-[#e4f2e8] dark:bg-[#173c2b]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[#e4f2e8] dark:bg-[#173c2b]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[#e4f2e8] dark:bg-[#173c2b]" />
        </div>
      </div>
    </div>
  );
}
