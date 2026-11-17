const LINUSKU_ORIGIN = "https://linusku.vercel.app";

export default function LinuskuFrame({ driver = false }) {
  const src = driver ? `${LINUSKU_ORIGIN}/driver` : LINUSKU_ORIGIN;

  return (
    <main className="h-dvh min-h-0 w-full overflow-hidden bg-white">
      <iframe
        title={driver ? "LINUSKU mode driver" : "LINUSKU peta bus"}
        src={src}
        className="block h-full w-full border-0"
        allow="geolocation"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
