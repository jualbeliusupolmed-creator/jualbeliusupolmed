import Link from "next/link";
import { WA_GROUP_LINK } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import Logo from "@/components/Logo";

export default async function Footer() {
  const settings = await getSettings();
  const waGroupLink = settings.contact?.waGroupLink || WA_GROUP_LINK;
  const tagline =
    settings.site?.footerTagline ||
    "Marketplace mahasiswa USU & POLMED. Jual-beli aman, dibantu admin.";
  return (
    <footer className="mt-16 border-t border-gray-100 bg-white dark:bg-slate-900/50 dark:border-slate-900">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-primary dark:text-white">
            <Logo className="h-8 w-8" />
            Jual Beli USU Polmed
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">{tagline}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-200">Menu</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
            <li><Link href="/" className="hover:text-primary dark:hover:text-white">Beranda</Link></li>
            <li><Link href="/jual" className="hover:text-primary dark:hover:text-white">Jual Barang</Link></li>
            <li><Link href="/dicari" className="hover:text-primary dark:hover:text-white">Papan Dicari</Link></li>
            <li><Link href="/cara-bergabung" className="hover:text-primary dark:hover:text-white">Cara Bergabung</Link></li>
            <li><Link href="/daftar-harga" className="hover:text-primary dark:hover:text-white">Daftar Harga &amp; Kebijakan</Link></li>
            <li><Link href="/syarat-ketentuan" className="hover:text-primary dark:hover:text-white">Syarat &amp; Ketentuan</Link></li>
            <li><Link href="/kebijakan-privasi" className="hover:text-primary dark:hover:text-white">Kebijakan Privasi</Link></li>
            <li><Link href="/dashboard" className="hover:text-primary dark:hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-200">Kontak &amp; Komunitas</h4>
          <div className="text-xs text-gray-500 dark:text-slate-400 mb-3 space-y-1">
            <p>📧 admin@jualbeliusupolmed.web.id</p>
            <p>💬 WA: +62 895-4291-26232</p>
            <p>📍 Jl. Dr. T. Mansur No. 9, Medan 20155</p>
          </div>
          <a
            href={waGroupLink}
            target="_blank"
            rel="noreferrer"
            className="btn-wa w-full text-center"
          >
            Gabung Grup WhatsApp
          </a>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400 dark:border-slate-900 dark:text-slate-500">
        © {new Date().getFullYear()} Jual Beli USU Polmed. Untuk mahasiswa USU &amp; POLMED.
      </div>
    </footer>
  );
}
