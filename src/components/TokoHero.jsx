import ShareProfileButton from "@/components/ShareProfileButton";

/*
 * Kepala halaman toko.
 *
 * Dua hal yang menentukan halaman toko terlihat "jadi" atau "belum selesai",
 * dan keduanya diselesaikan di sini:
 *
 *   1. Toko baru TIDAK punya sampul dan TIDAK punya logo. Kalau yang tampil
 *      saat itu cuma blok warna rata dan dua huruf di kotak polos, halamannya
 *      terlihat seperti template yang belum diisi — pada hari yang paling
 *      sering dilihat penjualnya sendiri. Maka sampul kosong digambar: tiga
 *      lapis gradasi lembut, garis diagonal tipis, dan inisial toko sebagai
 *      cap air besar. Hasilnya berbeda-beda per warna toko, dan yang penting:
 *      terlihat SENGAJA.
 *
 *   2. Isinya harus punya urutan baca yang jelas — nama, apa yang dijual,
 *      keadaan (buka/tutup/lokasi), lalu satu tindakan utama (Chat). Karena
 *      itu tombolnya duduk di kanan pada layar lebar, bukan menumpuk di tengah
 *      seperti kartu profil media sosial.
 */

export default function TokoHero({ profil, nama, warna, waLink, statistik }) {
  const buka = profil.store_open !== false;
  const inisial = nama.slice(0, 2).toUpperCase();

  return (
    <div className="overflow-hidden rounded-[26px] border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04),0_12px_32px_-12px_rgba(16,24,40,.12)] dark:border-slate-800 dark:bg-slate-900">
      {/* ── Sampul ─────────────────────────────────────────────────────── */}
      <div className="relative h-28 sm:h-44">
        {profil.banner_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profil.banner_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
          </>
        ) : (
          <div
            className="relative h-full w-full"
            style={{
              backgroundColor: warna.utama,
              backgroundImage: [
                `radial-gradient(140% 120% at 8% -30%, rgba(255,255,255,.42), transparent 55%)`,
                `radial-gradient(90% 120% at 95% 130%, rgba(0,0,0,.35), transparent 60%)`,
                `repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 10px, transparent 10px 26px)`,
              ].join(","),
            }}
          >
            {/* Cap air inisial. Dipotong oleh overflow-hidden induknya, jadi
                sebagian keluar bingkai — itu yang membuatnya terbaca sebagai
                grafis, bukan sebagai teks yang salah tempat. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-4 right-3 select-none text-[76px] font-black leading-none tracking-tighter text-white/15 sm:-bottom-6 sm:right-8 sm:text-[124px]"
            >
              {inisial}
            </span>
          </div>
        )}
      </div>

      {/* ── Identitas ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 sm:px-7 sm:pb-6">
        <div className="-mt-11 flex flex-col gap-3.5 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
          <div className="mx-auto sm:mx-0">
            <div className="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-full bg-white p-[3px] shadow-lg ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 sm:h-[104px] sm:w-[104px]">
              {profil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profil.logo_url} alt={nama} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-2xl font-black tracking-tight text-white sm:text-3xl"
                  style={{
                    backgroundImage: `linear-gradient(145deg, ${warna.utama}, ${warna.utama}b0)`,
                  }}
                >
                  {inisial}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:pb-1.5 sm:text-left">
            <h1 className="flex items-center justify-center gap-1.5 text-[19px] font-extrabold tracking-tight text-gray-900 dark:text-white sm:justify-start sm:text-[26px]">
              <span className="truncate">{nama}</span>
              {profil.trusted_seller && (
                <span
                  title="Penjual terverifikasi"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h1>

            {profil.tagline && (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
                {profil.tagline}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                style={
                  buka
                    ? { background: warna.muda, color: warna.teks }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                <span className="relative flex h-1.5 w-1.5">
                  {buka && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ background: warna.utama }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ background: buka ? warna.utama : "#94a3b8" }}
                  />
                </span>
                {buka ? "Buka sekarang" : "Sedang tutup"}
              </span>

              {profil.store_area && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                  {profil.store_area}
                </span>
              )}

              {profil.store_hours && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" strokeLinecap="round" />
                  </svg>
                  {profil.store_hours}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end sm:pb-1.5">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[.98]"
                style={{ background: warna.utama }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 3.9A10 10 0 003.5 16.6L2 22l5.5-1.4A10 10 0 1020 3.9zM12 20a8 8 0 01-4.1-1.1l-.3-.2-3.2.8.9-3.2-.2-.3A8 8 0 1112 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 01-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.9 1-1 2.3-.2 3.6a11 11 0 004.3 4c1.6.7 2.3.8 3.1.6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.1 0 0-.2-.1-.4-.2z" />
                </svg>
                Chat penjual
              </a>
            )}
            {profil.store_instagram && (
              <a
                href={`https://instagram.com/${profil.store_instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="3.6" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
                <span className="max-w-[7rem] truncate">{profil.store_instagram}</span>
              </a>
            )}
            <ShareProfileButton nama={nama} warna={warna} />
          </div>
        </div>

        {/* ── Angka toko ─────────────────────────────────────────────────
            Bukan sekadar tiga bilangan berjajar: yang di kiri adalah janji
            (ada barangnya), yang di tengah bukti (pernah laku), yang di kanan
            penilaian orang lain. Urutannya sengaja begitu. */}
        <div className="mt-5 grid grid-cols-4 divide-x divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
          <Angka nilai={statistik.aktif} label="Barang" warna={warna} tebal />
          <Angka nilai={statistik.terjual} label="Terjual" warna={warna} />
          <Angka
            nilai={statistik.ulasan ? `${statistik.rata.toFixed(1)}★` : "–"}
            label={statistik.ulasan ? `${statistik.ulasan} ulasan` : "Ulasan"}
            warna={warna}
          />
          <Angka nilai={statistik.sejak || "–"} label="Bergabung" warna={warna} />
        </div>
      </div>
    </div>
  );
}

function Angka({ nilai, label, warna, tebal }) {
  return (
    <div className="px-1 py-3 text-center">
      <p
        className="text-[17px] font-extrabold leading-none tabular-nums sm:text-xl"
        style={tebal ? { color: warna.utama } : undefined}
      >
        {nilai}
      </p>
      <p className="mt-1 text-[10.5px] font-medium leading-tight text-gray-500 dark:text-slate-400 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}
