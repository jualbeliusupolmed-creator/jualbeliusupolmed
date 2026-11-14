import ReactMarkdown from "react-markdown";
import NavbarProgres from "@/components/ui/NavbarProgres";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Sistem Progres & Audit Kampus Kita",
  description: "Ringkasan publik perkembangan marketplace Kampus Kita.",
};

export default function ProgresPage() {
  const content = `# Perkembangan marketplace\n\nKatalog marketplace menggunakan provinsi asal penjual untuk menentukan wilayah listing. Penjual tidak memilih kampus tujuan saat memasang barang atau jasa.\n\n## Cakupan\n\nAturan provinsi berlaku untuk feed marketplace, FYP listing, halaman produk, etalase penjual, dan alur kontak terkait listing. Barang dicari dan Open PO memiliki alur wilayah terpisah.\n\n## Data listing lama\n\nPada 6 November 2026, seluruh 137 listing aktif atau terjual yang diverifikasi di database produksi sudah memiliki provinsi asal dari profil penjual. Listing yang asalnya tidak dapat dipastikan tidak dimasukkan ke feed wilayah.\n\n## Verifikasi\n\nHalaman utama dan marketplace sudah diperiksa setelah deploy. Uji langsung dengan akun mahasiswa dari dua provinsi berbeda masih diperlukan untuk memastikan pengalaman tiap akun.`;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <NavbarProgres />
      
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-12 text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 text-white shadow-lg shadow-green-500/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Audit Ekosistem
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-neutral-400">
            Ringkasan publik tentang cara kerja marketplace dan pemeriksaan yang sudah dilakukan.
          </p>
        </div>

        {/* Status Cards */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Wilayah marketplace</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">Listing mengikuti provinsi asal penjual.</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Data listing lama</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">137 listing aktif atau terjual memiliki provinsi asal.</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm dark:border-yellow-900/30 dark:bg-yellow-900/10">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-400">Uji lintas provinsi</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-500">Perlu uji masuk dengan akun dari provinsi berbeda.</p>
          </div>
        </div>

        {/* Markdown Renderer */}
        <div className="prose prose-gray max-w-none rounded-2xl border border-gray-200 bg-white p-8 shadow-sm prose-headings:font-bold prose-h1:text-3xl prose-a:text-blue-600 dark:prose-invert dark:border-neutral-800 dark:bg-neutral-900 sm:p-10">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

      </main>
    </div>
  );
}
