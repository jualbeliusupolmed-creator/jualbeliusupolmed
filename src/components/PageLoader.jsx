import { Icon } from "@/components/Icons";

/**
 * Layar "Memuat..." yang dulu tinggal di src/app/loading.jsx.
 *
 * Ia dipindah ke sini karena tempatnya yang lama punya efek samping yang tidak
 * kelihatan: `loading.jsx` di akar app/ memasang batas Suspense di ATAS seluruh
 * halaman, jadi Next mengalirkan kerangka halaman — berikut status HTTP 200 —
 * sebelum komponen halamannya sempat memanggil notFound(). Akibatnya setiap
 * /produk, /blog, /toko, /penjual, /mading, dan /c yang isinya tidak ada
 * menjawab "200 OK" sambil menampilkan halaman 404. Mesin pencari membaca
 * status, bukan tulisan di layar.
 *
 * Sekarang pemuatnya dipasang per segmen, dan HANYA di segmen yang tidak punya
 * keturunan yang bisa 404. Menambahkannya di segmen yang memanggil notFound()
 * akan menghidupkan lagi bug yang sama.
 */
export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm flex flex-col items-center justify-center z-[999]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon.Package className="w-6 h-6 text-primary animate-pulse" />
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse tracking-wide uppercase">
        Memuat...
      </p>
    </div>
  );
}
