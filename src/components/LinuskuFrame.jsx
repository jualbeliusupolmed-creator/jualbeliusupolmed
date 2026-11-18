const LINUSKU_ORIGIN = "https://linusku.vercel.app";

export default function LinuskuFrame({ driver = false, admin = false, path = "" }) {
  const src = path
    ? `${LINUSKU_ORIGIN}${path}`
    : admin
      ? `${LINUSKU_ORIGIN}/admin`
      : driver
        ? `${LINUSKU_ORIGIN}/driver`
        : LINUSKU_ORIGIN;

  const title = admin
    ? "LINUSKU panel operasional admin"
    : driver
      ? "LINUSKU mode driver"
      : "LINUSKU peta bus";

  return (
    <main className="relative h-dvh min-h-0 w-full overflow-hidden bg-white">
      {admin && (
        <aside
          aria-label="Akses panel admin"
          className="absolute top-2.5 right-2.5 z-30 flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur-xs"
        >
          <span className="hidden sm:inline font-medium text-slate-600">LINUSKU Admin</span>
          <a
            href={`${LINUSKU_ORIGIN}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Tab Penuh ↗
          </a>
        </aside>
      )}
      <iframe
        title={title}
        src={src}
        className="block h-full w-full border-0"
        allow="geolocation"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
