/**
 * Potongan tampilan yang dipakai SEMUA halaman admin.
 *
 * Alasannya sederhana: sebelum ini tiap halaman menulis judulnya sendiri —
 * ada yang text-2xl, ada yang text-xl, ada yang tidak punya judul sama sekali;
 * kartunya kadang rounded-2xl kadang rounded-xl; jarak antar bagian beda-beda.
 * Semua itu kelihatan begitu orang pindah halaman.
 *
 * Kalau sebuah halaman butuh bentuk baru, tambahkan di sini supaya halaman
 * berikutnya ikut kebagian.
 */

import Link from "next/link";

/** Kepala halaman: judul, satu kalimat penjelas, dan tombol aksi di kanan. */
export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-5 dark:border-slate-800">
      {back ? (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Wadah isi halaman: jarak antar bagian sama di mana-mana. */
export function PageBody({ children, className = "" }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

/** Kartu. Judul opsional; kalau ada, ia selalu tampil dengan ukuran yang sama. */
export function Panel({ title, description, actions, children, className = "", padded = true }) {
  return (
    <section className={`card ${padded ? "p-5" : ""} ${className}`}>
      {(title || actions) && (
        <div className={`flex flex-wrap items-start justify-between gap-3 ${padded ? "mb-4" : "border-b border-gray-100 p-5 dark:border-slate-800"}`}>
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

/** Baris alat: pencarian, saringan, tombol. */
export function Toolbar({ children, className = "" }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

/** Angka besar dengan label kecil. */
export function Stat({ label, value, sub, tone = "" }) {
  const warna =
    tone === "ok" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warn" ? "text-amber-600 dark:text-amber-400"
    : tone === "bad" ? "text-rose-600 dark:text-rose-400"
    : "text-gray-900 dark:text-white";
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums tracking-tight ${warna}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-500">{sub}</p> : null}
    </div>
  );
}

/** Petak angka; jumlah kolomnya sama di semua halaman. */
export function StatGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

const NADA = {
  netral: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
  ok:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warn:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  bad:    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  info:   "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

/** Lencana status. */
export function Badge({ tone = "netral", children }) {
  return <span className={`badge ${NADA[tone] || NADA.netral}`}>{children}</span>;
}

/** Tabel selalu bisa digeser ke samping di layar kecil. */
export function TableWrap({ children }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-sm">{children}</table>
    </div>
  );
}

/** Kepala tabel dengan gaya yang sama di semua halaman. */
export function Th({ children, className = "" }) {
  return (
    <th className={`whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:border-slate-800 dark:text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={`border-b border-gray-100 px-3 py-2.5 align-top text-gray-700 dark:border-slate-800/70 dark:text-slate-300 ${className}`}>
      {children}
    </td>
  );
}

/** Keadaan kosong — bukan halaman putih tanpa penjelasan. */
export function EmptyState({ title = "Belum ada data", description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-slate-700">
      <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400 dark:text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Pemberitahuan di dalam halaman (peringatan, catatan, kabar buruk). */
export function Notice({ tone = "info", title, children }) {
  const gaya = {
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200",
    warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    bad:  "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200",
    ok:   "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${gaya}`}>
      {title ? <p className="font-bold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
    </div>
  );
}

/** Halaman gagal memuat — dipakai supaya pesan error tidak beda-beda bentuknya. */
export function LoadError({ title = "Gagal memuat data", message }) {
  return (
    <div className="mx-auto max-w-xl">
      <Notice tone="bad" title={title}>
        <p>{message}</p>
      </Notice>
    </div>
  );
}
