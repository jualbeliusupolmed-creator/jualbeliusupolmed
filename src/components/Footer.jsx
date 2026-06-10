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
    <footer className="mt-16 border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-primary">
            <Logo className="h-8 w-8" />
            Jual Beli USU Polmed
          </div>
          <p className="mt-3 text-sm text-gray-500">{tagline}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Menu</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/" className="hover:text-primary">Beranda</Link></li>
            <li><Link href="/jual" className="hover:text-primary">Jual Barang</Link></li>
            <li><Link href="/cara-bergabung" className="hover:text-primary">Cara Bergabung</Link></li>
            <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Komunitas</h4>
          <a
            href={waGroupLink}
            target="_blank"
            rel="noreferrer"
            className="btn-wa"
          >
            Gabung Grup WhatsApp
          </a>
          <p className="mt-3 text-sm text-gray-500">bit.ly/jualbeliusupolmed</p>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Jual Beli USU Polmed. Untuk mahasiswa USU &amp; POLMED.
      </div>
    </footer>
  );
}
