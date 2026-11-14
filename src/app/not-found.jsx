import Link from "next/link";
import { Icon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="mb-8 relative">
        <div className="text-8xl font-black text-slate-200 dark:text-slate-800 tracking-tighter">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon.Map className="w-12 h-12 text-primary" />
        </div>
      </div>
      
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
        Nyasar, ya?
      </h1>
      
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-sm leading-relaxed mx-auto">
        Halaman yang kamu cari mungkin sudah dihapus, ganti nama, atau memang tidak pernah ada di kampus ini.
      </p>
      
      <Link 
        href="/"
        className="inline-flex items-center gap-2 bg-emerald-800 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-xs hover:bg-emerald-900 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
      >
        <Icon.Home className="w-4 h-4" aria-hidden="true" />
        <span>Kembali ke Beranda</span>
      </Link>
    </div>
  );
}
