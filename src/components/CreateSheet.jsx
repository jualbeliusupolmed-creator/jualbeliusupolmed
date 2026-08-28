"use client";

import { useRouter } from "next/navigation";
import BottomSheet from "./BottomSheet";
import { hapticLight } from "@/lib/haptics";
import { Icon } from "./Icons";

// Tombol tengah dock memisahkan dua niat yang berbeda: menjual sesuatu di
// marketplace, atau memposting sesuatu di sisi sosial. Keduanya dipisah
// visual supaya tidak tertukar.
const PILIHAN = [
  {
    href: "/jual",
    ikon: <Icon.ShoppingBag className="w-5 h-5" />,
    ikonBg: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    judul: "Jual Barang / Jasa",
    desc: "Pasang iklan di marketplace",
    grup: "Marketplace",
  },
  {
    href: "/dicari?tulis=1",
    ikon: <Icon.MapPin className="w-5 h-5" />,
    ikonBg: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    judul: "Pasang Kebutuhan",
    desc: "Cari barang yang kamu butuhkan",
    grup: "Marketplace",
  },
  {
    href: "/mading?tulis=1",
    ikon: <Icon.Mail className="w-5 h-5" />,
    ikonBg: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    judul: "Tulis Menfess",
    desc: "Curhat, info, atau pengumuman",
    grup: "Sosial",
  },
  {
    href: "/oprec?tulis=1",
    ikon: <Icon.Megaphone className="w-5 h-5" />,
    ikonBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    judul: "Buka Oprec",
    desc: "Rekrut anggota organisasi / panitia",
    grup: "Sosial",
  },
  {
    href: "/teman",
    ikon: <Icon.Users className="w-5 h-5" />,
    ikonBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    judul: "Cari Teman Kampus",
    desc: "Swipe kenalan baru di USU & Polmed",
    grup: "Sosial",
  },
];

export default function CreateSheet({ isOpen, onClose }) {
  const router = useRouter();

  const buka = (href) => {
    hapticLight();
    onClose();
    router.push(href);
  };

  const grup = ["Marketplace", "Sosial"];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Buat baru">
      {grup.map((g) => (
        <div key={g}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {g}
          </p>
          <div className="space-y-2">
            {PILIHAN.filter((p) => p.grup === g).map((p) => (
              <button
                key={p.href}
                type="button"
                onClick={() => buka(p.href)}
                className="flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.03] p-3 text-left transition-all active:scale-[0.98] dark:border-white/[0.08] dark:bg-white/[0.06]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${p.ikonBg}`}>
                  {p.ikon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1d1d1f] dark:text-white">
                    {p.judul}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400">
                    {p.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </BottomSheet>
  );
}
