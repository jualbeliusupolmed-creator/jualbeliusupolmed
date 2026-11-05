import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BarChart3, BookOpenCheck, CircleAlert, ClipboardCheck, Instagram, MapPinned, MessageCircle, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Panduan Operasional Sumut | Admin Kampus Kita",
  description: "Panduan kerja harian marketplace JualBeliDiKampus di Sumatera Utara.",
};

const stages = [
  { title: "Barang masuk", detail: "Pastikan judul, foto, harga, kampus, kontak penjual, dan ketersediaan dapat dipahami. Listing dari web maupun kanal sosial harus kembali ke satu halaman produk." },
  { title: "Periksa dan tayangkan", detail: "Tinjau listing yang menunggu review. Terima hanya barang yang informasinya layak; tolak atau minta perbaikan bila data penting tidak jelas." },
  { title: "Temukan pembeli", detail: "Pastikan listing aktif masuk ke marketplace dan kurasi FYP Sumut. Bagikan ke akun atau grup yang memang terdaftar untuk kampus/provinsinya." },
  { title: "Tindak lanjuti", detail: "Pembeli menghubungi penjual melalui WhatsApp. Status “terjual” dicatat setelah ada konfirmasi; klik kontak atau pesan terkirim belum membuktikan transaksi berhasil." },
];

const metrics = [
  ["Listing baru", "Jumlah listing yang dibuat per hari atau minggu; tersedia dari data listing."],
  ["Menunggu review", "Jumlah listing pending dan lamanya menunggu; status tersedia, tetapi umur antrean perlu dihitung dari created_at."],
  ["Tayangan produk", "Jumlah views pada listing; views bukan orang unik dan bukan bukti minat beli."],
  ["Distribusi sosial", "Jumlah pekerjaan berhasil/gagal per kanal; status antrean tidak sama dengan publikasi yang terlihat oleh audiens."],
  ["Kontak menjadi transaksi", "Belum dapat dihitung andal: klik WhatsApp, percakapan, dan konfirmasi transaksi belum menjadi satu corong analitik."],
];

function LinkRow({ href, icon: Icon, title, detail }) {
  return <Link href={href} className="group flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-emerald-50/50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-800" /></Link>;
}

export default function OperationalGuidePage() {
  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="overflow-hidden rounded-[26px] bg-[#07583f] px-6 py-7 text-white sm:px-8 sm:py-9">
      <div className="grid gap-7 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
        <div><div className="flex items-center gap-2 text-emerald-100"><MapPinned className="h-4 w-4" /><span className="text-xs font-bold">Kendali nasional · operasi berjalan di Sumut</span></div><h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Operasional Sumatera Utara</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/85">Superadmin memegang kendali seluruh provinsi dan bebas menyiapkan wilayah mana pun. Panduan ini merapikan operasi yang sudah disiapkan di Sumut terlebih dahulu.</p></div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-xs font-extrabold text-emerald-100">Status wilayah</p><p className="mt-1 text-lg font-black">Admin Sumut disiapkan</p><p className="mt-1 text-xs leading-relaxed text-emerald-50/80">Superadmin dapat menambah provinsi, owner, scope, dan kanal kapan pun. Wilayah baru berstatus persiapan sampai operator dan alur pengirimannya diverifikasi.</p></div>
      </div>
    </header>

    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><BookOpenCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Alur kerja satu listing</h2><p className="mt-1 text-xs text-slate-500">Ikuti sampai pembeli menghubungi penjual dan hasilnya dikonfirmasi.</p></div></div>
        <ol className="divide-y divide-slate-100">{stages.map((stage, index) => <li key={stage.title} className="flex gap-4 p-4 sm:p-5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-800 text-xs font-black text-white">{index + 1}</span><div><h3 className="text-sm font-extrabold">{stage.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">{stage.detail}</p></div></li>)}</ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-800"><ClipboardCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Jaga cakupan Sumut</h2><p className="mt-1 text-xs text-slate-500">Periksa data dan akses sebelum menjalankan kegiatan.</p></div></div>
        <div className="space-y-3 p-5 text-xs leading-relaxed text-slate-600"><p><b className="text-slate-900">Struktur:</b> cocokkan universitas, cabang/unit, dan provinsi. Universitas/kampus adalah satu entitas; cabang dicatat sebagai unit bila diperlukan.</p><p><b className="text-slate-900">Penanggung jawab:</b> setiap universitas dan saluran harus memiliki operator yang ditunjuk, pengganti, serta jalur eskalasi ke superadmin. Jangan menganggap akun yang tersambung sebagai bukti ada operator.</p><p><b className="text-slate-900">Distribusi:</b> pastikan tujuan grup atau kanal tertulis jelas dan cocok dengan asal listing. Jika tujuan atau wilayah tidak jelas, tahan publikasi dan minta peninjauan.</p><p><b className="text-slate-900">FYP:</b> pilih barang aktif yang masih relevan; periksa ulang ketersediaan dan tautannya sebelum dipertahankan di urutan unggulan.</p></div>
      </section>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><BarChart3 className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Metrik yang dipakai</h2><p className="mt-1 text-xs text-slate-500">Pisahkan angka yang benar-benar tercatat dari hasil bisnis yang belum terukur.</p></div></div>
      <div className="divide-y divide-slate-100">{metrics.map(([name, description], index) => <div key={name} className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr] sm:gap-5"><p className="text-xs font-extrabold text-slate-900">{name}</p><p className="text-xs leading-relaxed text-slate-600">{description}</p>{index === 4 ? <p className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-900 sm:col-start-2"><CircleAlert className="h-3 w-3" />Jangan laporkan konversi atau GMV sebagai angka pasti</p> : null}</div>)}</div>
      <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] leading-relaxed text-slate-500">Catat rekap mingguan dengan rentang tanggal, cakupan kampus, dan sumber data yang sama. Jangan campur angka nasional dengan angka Sumut.</p>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-black">Ritme kerja</h2><div className="mt-4 space-y-4"><div><h3 className="text-xs font-extrabold text-emerald-900">Setiap hari</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">Periksa listing pending dan laporan terbuka; cek koneksi bot; tinjau antrean publikasi yang gagal; cocokkan barang unggulan dengan ketersediaan terbaru.</p></div><div><h3 className="text-xs font-extrabold text-emerald-900">Setiap minggu</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">Rekap listing baru/aktif/terjual, waktu review, views, distribusi berhasil/gagal, akun dan tujuan yang bermasalah, serta tindak lanjutnya. Minta konfirmasi hasil dari operator kampus.</p></div><div><h3 className="text-xs font-extrabold text-emerald-900">Saat ada masalah</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">Tahan distribusi yang salah sasaran, simpan ID listing dan waktu kejadian, cek log yang sudah disamarkan, lalu eskalasi gangguan layanan ke superadmin.</p></div></div></section>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-800" /><h2 className="text-lg font-black text-emerald-950">Syarat membuka operasi suatu wilayah</h2></div><ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-emerald-950/80"><li>• Superadmin menetapkan operator utama dan pengganti dengan scope yang benar.</li><li>• Listing, moderasi, kontak WhatsApp, distribusi, dan pencatatan hasil diuji terkendali.</li><li>• Akun sosial/grup tujuan diverifikasi dan memiliki prosedur saat koneksi putus.</li><li>• Metrik mingguan membedakan tayangan, klik kontak, transaksi, dan pendapatan.</li><li>• SOP, jalur laporan, dan pemulihan layanan dipahami oleh operator wilayah.</li></ul><p className="mt-4 border-t border-emerald-200 pt-3 text-xs font-extrabold text-emerald-950">Superadmin bebas menyiapkan wilayah mana pun; aktivasi operasi mengikuti kesiapan dan keputusan pemilik.</p></section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-black">Area kerja panel</h2><p className="mt-1 text-xs text-slate-500">Pilih menu sesuai langkah yang sedang dikerjakan.</p></div>
      <LinkRow href="/admin/organization" icon={MapPinned} title="Struktur wilayah" detail="Periksa daftar provinsi dan universitas." />
      <LinkRow href="/admin/owners" icon={ShieldCheck} title="Akses owner" detail="Tetapkan operator, cakupan, dan izin kerja." />
      <LinkRow href="/admin/marketplace" icon={ClipboardCheck} title="Marketplace" detail="Review, aktifkan, atau tindak lanjuti listing." />
      <LinkRow href="/admin/fyp" icon={BadgeCheck} title="Kurasi FYP provinsi" detail="Atur pilihan listing unggulan Sumut." />
      <LinkRow href="/admin/social" icon={Instagram} title="Instagram dan kanal sosial" detail="Periksa akun, antrean, dan hasil distribusi." />
      <LinkRow href="/admin/wabot" icon={MessageCircle} title="Status WhatsApp" detail="Periksa sambungan dan operasional bot." />
    </section>
  </main>;
}
