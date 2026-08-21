import Link from "next/link";
import { ArrowLeft, Activity, Info } from "lucide-react";

export default function NavbarProgres() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left side: Back to Home */}
        <div className="flex items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden font-medium sm:inline-block">Kembali</span>
          </Link>
        </div>

        {/* Center: Branding / Title */}
        <div className="flex items-center justify-center">
          <Link href="/progres" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Sistem Progres
            </span>
          </Link>
        </div>

        {/* Right side: Info Button */}
        <div className="flex items-center">
          <button className="flex items-center gap-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white">
            <Info className="h-5 w-5" />
            <span className="hidden font-medium sm:inline-block">Status Audit</span>
          </button>
        </div>
        
      </div>
    </nav>
  );
}
