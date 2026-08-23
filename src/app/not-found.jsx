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
        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all"
      >
        <Icon.Home className="w-5 h-5" />
        <span>Kembali ke Beranda</span>
      </Link>
    </div>
  );
}
