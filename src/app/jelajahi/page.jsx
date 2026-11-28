import Link from "next/link";
import { Icon } from "@/components/Icons";

export const metadata = {
  title: "Jelajahi Kampus Kita",
  description: "Akses komunitas, informasi mahasiswa, obrolan, dan bantuan Kampus Kita.",
  alternates: { canonical: "/jelajahi" },
};

const availableLinks = [
  {
    href: "/oprec",
    title: "Penerimaan anggota",
    description: "Lihat informasi rekrutmen organisasi yang tersedia.",
    icon: Icon.Briefcase,
  },
  {
    href: "/mading",
    title: "Mading dan Menfess",
    description: "Baca informasi kampus dan kiriman komunitas.",
    icon: Icon.BookOpen,
  },
  {
    href: "/chat?mode=teman",
    title: "Cari teman",
    description: "Masuk ke mode pencarian teman dan obrolan.",
    icon: Icon.MessageCircle,
  },
  {
    href: "/faq",
    title: "Pusat bantuan",
    description: "Baca jawaban untuk pertanyaan penggunaan Kampus Kita.",
    icon: Icon.Info,
  },
];

const unavailableModules = [
  {
    title: "Agenda Kampus",
    description: "Kalender acara terstruktur belum tersedia.",
  },
  {
    title: "Direktori fasilitas",
    description: "Data gedung dan fasilitas kampus belum tersedia.",
  },
  {
    title: "Lost & Found",
    description: "Alur khusus barang hilang dan temuan belum tersedia.",
  },
];

export default function JelajahiPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-9">
      <header className="flex flex-col gap-3 border-b border-[#d9e8dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0a2e1f] dark:text-white sm:text-4xl">
            Jelajahi
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Temukan layanan dan ruang komunitas yang sudah tersedia di Kampus Kita.
          </p>
        </div>
        <Link
          href="/organisasi"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[#134e35] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:bg-[#bef264] dark:text-[#0a2e1f] dark:hover:bg-lime-300"
        >
          Lihat komunitas
        </Link>
      </header>

      <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <section
          aria-labelledby="community-heading"
          className="rounded-3xl border border-[#d9e8dc] bg-white p-5 dark:border-white/10 dark:bg-slate-900 sm:p-7"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f4eb] text-[#134e35] dark:bg-[#173c2b] dark:text-[#bef264]">
              <Icon.Users className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="community-heading" className="text-xl font-extrabold tracking-tight text-[#0a2e1f] dark:text-white sm:text-2xl">
                Komunitas dan UKM
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Lihat organisasi yang terdaftar dan buka halaman rekrutmen jika tersedia.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/organisasi"
                  className="inline-flex min-h-11 items-center rounded-xl border border-[#134e35] px-4 text-sm font-bold text-[#134e35] transition-colors hover:bg-[#f1f8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-[#bef264] dark:text-[#bef264] dark:hover:bg-[#173c2b]"
                >
                  Buka direktori organisasi
                </Link>
                <Link
                  href="/oprec"
                  className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-[#134e35] underline decoration-[#9ab9a3] underline-offset-4 hover:text-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:text-[#bef264]"
                >
                  Lihat penerimaan anggota
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="community-tools-heading">
          <h2 id="community-tools-heading" className="text-base font-bold text-[#0a2e1f] dark:text-white">
            Ruang komunitas
          </h2>
          <ul className="mt-3 divide-y divide-[#d9e8dc] dark:divide-white/10">
            {availableLinks.map(({ href, title, description, icon: ItemIcon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex min-h-[76px] items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35]"
                >
                  <ItemIcon
                    className="h-5 w-5 shrink-0 text-[#134e35] dark:text-[#bef264]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#0a2e1f] group-hover:underline dark:text-white">
                      {title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {description}
                    </span>
                  </span>
                  <Icon.ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 dark:text-slate-300"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="unavailable-heading"
        className="mt-9 border-t border-[#d9e8dc] pt-6 dark:border-white/10"
      >
        <div className="max-w-2xl">
          <h2 id="unavailable-heading" className="text-lg font-extrabold text-[#0a2e1f] dark:text-white">
            Belum tersedia
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Modul berikut belum memiliki halaman dan sumber data khusus di website.
          </p>
        </div>
        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
          {unavailableModules.map(({ title, description }) => (
            <li key={title} className="border-b border-[#d9e8dc] py-4 dark:border-white/10">
              <h3 className="text-sm font-bold text-[#0a2e1f] dark:text-white">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
