import ShareProfileButton from "@/components/ShareProfileButton";

/*
 * Kepala halaman toko.
 * Desain modern, bersih, dan premium tanpa kesan "AI-generated".
 */

export default function TokoHero({ profil, nama, warna, waLink, statistik }) {
  const buka = profil.store_open !== false;
  const inisial = nama.slice(0, 2).toUpperCase();

  return (
    <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* ── Sampul ─────────────────────────────────────────────────────── */}
      <div className="relative h-32 sm:h-48 bg-gray-50 dark:bg-slate-800">
        {profil.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profil.banner_url} alt="Cover toko" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        ) : (
          <div
            className="relative h-full w-full overflow-hidden"
            style={{ backgroundColor: warna.muda }}
          >
            {/* Elemen gradient mesh modern & halus, menggantikan garis kasar */}
            <div 
              className="absolute -top-[50%] -left-[20%] h-[150%] w-[70%] rounded-full opacity-30 mix-blend-multiply blur-[80px] dark:opacity-20"
              style={{ backgroundColor: warna.utama }} 
            />
            <div 
              className="absolute -bottom-[50%] -right-[10%] h-[150%] w-[60%] rounded-full opacity-20 mix-blend-multiply blur-[60px] dark:opacity-10"
              style={{ backgroundColor: warna.utama }} 
            />
            
            {/* Pola titik-titik (dot grid) yang sangat tipis untuk tekstur */}
            <div 
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" 
              style={{ 
                backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                backgroundSize: '24px 24px',
                color: warna.utama
              }} 
            />
          </div>
        )}
      </div>

      {/* ── Identitas ──────────────────────────────────────────────────── */}
      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar / Logo */}
          <div className="relative z-10 mx-auto shrink-0 sm:mx-0">
            <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-full border-[4px] border-white bg-white shadow-sm dark:border-slate-900 dark:bg-slate-900 sm:h-[120px] sm:w-[120px]">
              {profil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profil.logo_url} alt={nama} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  style={{
                    background: `linear-gradient(135deg, ${warna.utama}, ${warna.utama}dd)`,
                  }}
                >
                  {inisial}
                </div>
              )}
            </div>
            {/* Indikator buka/tutup langsung menempel di avatar */}
            {buka && (
              <div 
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm dark:border-slate-900 sm:bottom-2 sm:right-2" 
                title="Buka Sekarang"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:pb-2 sm:text-left">
            <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:justify-start sm:text-3xl">
              <span className="truncate">{nama}</span>
              {profil.trusted_seller && (
                <span
                  title="Penjual terverifikasi"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h1>

            {profil.tagline && (
              <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 sm:text-base">
                {profil.tagline}
              </p>
            )}

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={
                  buka
                    ? { background: `${warna.utama}15`, color: warna.utama }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                {buka ? "Buka Sekarang" : "Sedang Tutup"}
              </span>

              {profil.store_area && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                  {profil.store_area}
                </span>
              )}

              {profil.store_hours && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" strokeLinecap="round" />
                  </svg>
                  {profil.store_hours}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2.5 sm:justify-end sm:pb-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                style={{ background: warna.utama }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 3.9A10 10 0 003.5 16.6L2 22l5.5-1.4A10 10 0 1020 3.9zM12 20a8 8 0 01-4.1-1.1l-.3-.2-3.2.8.9-3.2-.2-.3A8 8 0 1112 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 01-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.9 1-1 2.3-.2 3.6a11 11 0 004.3 4c1.6.7 2.3.8 3.1.6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.1 0 0-.2-.1-.4-.2z" />
                </svg>
                Chat
              </a>
            )}
            {profil.store_instagram && (
              <a
                href={`https://instagram.com/${profil.store_instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="3.6" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
                <span className="hidden sm:inline max-w-[6rem] truncate">{profil.store_instagram}</span>
              </a>
            )}
            {profil.store_gmaps && (
              <a
                href={profil.store_gmaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="hidden sm:inline">Lokasi</span>
              </a>
            )}
            <ShareProfileButton nama={nama} warna={warna} />
          </div>
        </div>

        {/* ── Angka toko ───────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap justify-center sm:justify-start gap-6 sm:gap-10 border-t border-gray-100 pt-6 dark:border-slate-800">
          <Angka nilai={statistik.aktif} label="Barang Aktif" warna={warna} tebal />
          <Angka nilai={statistik.terjual} label="Terjual" warna={warna} />
          <Angka
            nilai={statistik.ulasan ? `${statistik.rata.toFixed(1)}` : "–"}
            label={statistik.ulasan ? `${statistik.ulasan} Ulasan` : "Ulasan"}
            ikon={statistik.ulasan ? "*" : null}
            warna={warna}
          />
          <Angka nilai={statistik.sejak || "–"} label="Bergabung" warna={warna} />
        </div>
      </div>
    </div>
  );
}

function Angka({ nilai, label, warna, tebal, ikon }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <p 
        className="flex items-center gap-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        style={tebal ? { color: warna.utama } : undefined}
      >
        {nilai}
        {ikon && <span style={{ color: warna.utama }} className="text-lg">{ikon}</span>}
      </p>
      <p className="mt-0.5 text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
