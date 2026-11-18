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
    <main className="h-dvh min-h-0 w-full overflow-hidden bg-white">
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
