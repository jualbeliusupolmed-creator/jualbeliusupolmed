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
 *
 * Bentuknya sekarang memakai kelas `.g-*` dari src/app/admin/google.css —
 * ukuran, warna, dan sudutnya nilai Google yang sebenarnya, bukan tiruan
 * sekilas. Nama fungsi dan propertinya sengaja TIDAK berubah supaya dua puluh
 * halaman yang memanggilnya tidak perlu ikut disunting.
 */

import Link from "next/link";

/** Kepala halaman: judul, satu kalimat penjelas, dan tombol aksi di kanan. */
export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="g-page-head">
      <div>
        {back ? (
          <Link href={back.href} className="g-back">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
            {back.label}
          </Link>
        ) : null}
        <h1 className="g-page-title">{title}</h1>
        {description ? <p className="g-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Wadah isi halaman: jarak antar bagian sama di mana-mana. */
export function PageBody({ children, className = "" }) {
  return <div className={`space-y-5 ${className}`}>{children}</div>;
}

/** Kartu. Judul opsional; kalau ada, ia selalu tampil dengan ukuran yang sama. */
export function Panel({ title, description, actions, children, className = "", padded = true }) {
  return (
    <section className={`g-card ${className}`}>
      {(title || actions) && (
        <div className="g-card-head">
          <div className="min-w-0">
            {title ? <h2 className="g-card-title">{title}</h2> : null}
            {description ? <p className="g-card-desc">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={padded ? "g-card-pad" : ""}>{children}</div>
    </section>
  );
}

/** Baris alat: pencarian, saringan, tombol. */
export function Toolbar({ children, className = "" }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

/** Angka besar dengan label kecil. */
export function Stat({ label, value, sub, tone = "" }) {
  const nada = tone === "ok" ? " is-ok" : tone === "warn" ? " is-warn" : tone === "bad" ? " is-bad" : "";
  return (
    <div className="g-stat">
      <p className="g-stat-label">{label}</p>
      <p className={`g-stat-value${nada}`}>{value}</p>
      {sub ? <p className="g-stat-sub">{sub}</p> : null}
    </div>
  );
}

/** Petak angka; jumlah kolomnya sama di semua halaman. */
export function StatGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

const NADA = { netral: "", ok: " is-ok", warn: " is-warn", bad: " is-bad", info: " is-info" };

/** Lencana status. */
export function Badge({ tone = "netral", children }) {
  return <span className={`g-badge${NADA[tone] || ""}`}>{children}</span>;
}

/** Tabel selalu bisa digeser ke samping di layar kecil. */
export function TableWrap({ children }) {
  return (
    <div className="g-table-wrap">
      <table className="g-table min-w-[560px]">{children}</table>
    </div>
  );
}

/** Kepala tabel dengan gaya yang sama di semua halaman. */
export function Th({ children, className = "" }) {
  return <th className={className}>{children}</th>;
}

export function Td({ children, className = "" }) {
  return <td className={className}>{children}</td>;
}

/** Keadaan kosong — bukan halaman putih tanpa penjelasan. */
export function EmptyState({ title = "Belum ada data", description, action }) {
  return (
    <div className="g-empty">
      <p className="g-empty-title">{title}</p>
      {description ? <p className="g-empty-desc">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Pemberitahuan di dalam halaman (peringatan, catatan, kabar buruk). */
export function Notice({ tone = "info", title, children }) {
  const nada = tone === "warn" ? " is-warn" : tone === "bad" ? " is-bad" : tone === "ok" ? " is-ok" : "";
  return (
    <div className={`g-notice${nada}`}>
      <div>
        {title ? <p><b>{title}</b></p> : null}
        {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
      </div>
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
