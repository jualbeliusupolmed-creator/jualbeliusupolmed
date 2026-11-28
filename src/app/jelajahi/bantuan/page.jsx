"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Apa itu Kampus Kita?",
    a: "Kampus Kita adalah portal terpadu mahasiswa USU & Polmed yang mengintegrasikan marketplace barang bekas mahasiswa, Open Pre-Order, pelacakan shuttle bus LINUSKU secara real-time, berita kampus, dan direktori layanan mahasiswa.",
  },
  {
    q: "Bagaimana cara menjual barang?",
    a: "Klik tombol 'Jual Barang' di halaman utama Jual Beli atau menu navigasi, isi detail produk, harga, kondisi (Baru/Preloved), serta lokasi COD di kampus, lalu publikasikan.",
  },
  {
    q: "Bagaimana cara mengikuti Open PO?",
    a: "Buka tab Open PO, pilih produk pre-order yang sedang aktif, klik 'Ikuti PO', lalu isi jumlah pesanan dan data kontakmu. Pantau progres kuota langsung dari kartu Open PO.",
  },
  {
    q: "Apa itu LINUSKU?",
    a: "LINUSKU adalah layanan pelacakan armada bus listrik kampus USU secara live, lengkap dengan daftar rute (Rute A & Rute B), estimasi kedatangan (ETA), dan lokasi halte terdekat.",
  },
  {
    q: "Bagaimana melaporkan barang hilang?",
    a: "Pelaporan Lost & Found melalui website belum tersedia karena layanan penyimpanannya belum terhubung. Jangan menganggap laporan lokal di browser sebagai laporan yang terkirim.",
  },
];

const GUIDES = [
  { title: "Panduan Transaksi Aman (COD Kampus)", desc: "Selalu lakukan pertemuan di area ramai seperti Pendopo, Kantin Pusat, atau Perpustakaan pada jam operasional." },
  { title: "Panduan Penjual Terverifikasi", desc: "Lengkapi profil toko di Dashboard dan verifikasi akun kampusmu untuk meningkatkan kepercayaan pembeli." },
  { title: "Etika Menulis di Mading & Berita", desc: "Pastikan informasi akurat, tidak mengandung SARA/fitnah, dan sertakan sumber jika mengutip pengumuman resmi." },
];

export default function PusatBantuanPage() {
  const [tab, setTab] = useState("FAQ");
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-16 font-sans text-[#101f15] dark:text-[#ecfeee]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#003622] dark:text-[#bef264] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">help</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">
                Pusat Bantuan (Helpdesk)
              </h1>
              <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-400">
                Temukan jawaban, panduan, atau kirim aduan terkait Kampus Kita dan layanan kampus.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-200 text-slate-600 text-xs font-extrabold">
            <span className="material-symbols-outlined text-[18px]">info</span>
            Tiket belum tersedia
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          {["FAQ", "Panduan", "Aduan Saya"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition ${
                tab === t
                  ? "bg-[#003622] text-white"
                  : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 hover:bg-[#e6f8e8]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Main 12-Col Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Cols */}
          <div className="lg:col-span-8 space-y-4">
            {tab === "FAQ" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-[#101f15] dark:text-white">
                    Pertanyaan yang Sering Diajukan
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-white dark:bg-white/10 text-[11px] font-bold text-[#404943] dark:text-slate-300">
                    {FAQS.length} Pertanyaan Utama
                  </span>
                </div>
                <div className="space-y-3">
                  {FAQS.map((item, idx) => {
                    const isOpen = openIdx === idx;
                    return (
                      <div
                        key={item.q}
                        className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                          className="w-full flex items-center justify-between text-left gap-3"
                        >
                          <span className="text-sm font-bold text-[#101f15] dark:text-white">{item.q}</span>
                          <span className="material-symbols-outlined text-[#134e35] dark:text-[#bef264] text-[20px] shrink-0">
                            {isOpen ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="mt-3 rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-4 text-xs sm:text-sm leading-relaxed text-[#404943] dark:text-slate-300">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "Panduan" && (
              <div className="space-y-3">
                <h2 className="text-base font-extrabold text-[#101f15] dark:text-white">Panduan Penggunaan</h2>
                {GUIDES.map((g) => (
                  <div
                    key={g.title}
                    className="bg-white dark:bg-[#112218] rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-1.5"
                  >
                    <h3 className="text-sm font-extrabold text-[#003622] dark:text-white">{g.title}</h3>
                    <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-300 leading-relaxed">{g.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "Aduan Saya" && (
              <div className="space-y-3">
                <h2 className="text-base font-extrabold text-[#101f15] dark:text-white">Riwayat Tiket Aduan</h2>
                <div className="bg-white dark:bg-[#112218] rounded-3xl p-8 sm:p-10 text-center space-y-2 shadow-xs">
                  <span className="material-symbols-outlined text-[36px] text-[#707972]">confirmation_number</span>
                  <p className="text-sm font-bold text-[#101f15] dark:text-white">Layanan tiket belum tersedia</p>
                  <p className="text-xs text-[#707972]">Belum ada backend untuk mengirim atau membaca tiket. Tidak ada laporan yang tersimpan.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Cols */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <h2 className="text-sm font-extrabold text-[#101f15] dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#134e35] dark:text-[#bef264]">emergency</span>
                Kontak Darurat Kampus
              </h2>

              <div className="rounded-2xl bg-[#e6f8e8]/70 dark:bg-[#134e35]/30 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#404943] dark:text-slate-300">Kontak resmi</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                    Belum diverifikasi
                  </span>
                </div>
                <p className="text-[11px] text-[#707972]">Nomor darurat tidak ditampilkan sampai sumber resminya dapat dipastikan.</p>
              </div>
            </div>

            <div className="bg-[#e6f8e8] dark:bg-[#134e35]/30 rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#003622] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </div>
              <h3 className="text-base font-extrabold text-[#003622] dark:text-white">Butuh bantuan lainnya?</h3>
              <p className="text-xs text-[#404943] dark:text-slate-300 leading-relaxed">
                Pengiriman tiket dari website belum tersedia. Fitur akan aktif setelah layanan backend siap.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
