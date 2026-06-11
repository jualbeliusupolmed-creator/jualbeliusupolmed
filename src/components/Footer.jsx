"use client";

import Link from "next/link";
import { WA_GROUP_LINK } from "@/lib/constants";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";

export default function Footer({ config }) {
  const contact = config?.contact || {};
  const site = config?.site || {};

  const waGroupLink = contact.waGroupLink || WA_GROUP_LINK;
  const tagline = site.footerTagline || "Marketplace mahasiswa USU & POLMED. Jual-beli aman, dibantu admin.";
  
  const supportEmail = contact.supportEmail || "admin@jualbeliusupolmed.web.id";
  const supportPhone = contact.supportPhone || "+62 895-4291-26232";
  const supportAddress = contact.supportAddress || "Jl. Dr. T. Mansur No. 9, Medan 20155";
  const logoUrl = site.logoUrl;

  return (
    <footer className="mt-20 border-t border-gray-100 bg-gradient-to-b from-transparent to-gray-50/50 dark:border-slate-900 dark:to-slate-950/20">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:gap-12">
          {/* Brand section */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Logo className="h-8 w-8" src={logoUrl} />
              <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">
                jualbeli<span className="text-gray-400 font-medium">.usupolmed</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500 dark:text-slate-400">
              {tagline}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-slate-200">
              Navigasi
            </h4>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/jual" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Jual Barang
                </Link>
              </li>
              <li>
                <Link href="/dicari" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Papan Dicari
                </Link>
              </li>
              <li>
                <Link href="/cara-bergabung" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Cara Bergabung
                </Link>
              </li>
              <li>
                <Link href="/daftar-harga" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Daftar Harga
                </Link>
              </li>
              <li>
                <Link href="/syarat-ketentuan" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Syarat &amp; Ketentuan
                </Link>
              </li>
              <li>
                <Link href="/kebijakan-privasi" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  FAQ / Bantuan
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-slate-200">
              Hubungi Kami
            </h4>
            <div className="space-y-2.5 text-sm text-gray-600 dark:text-slate-400">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-2.5 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Icon.Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{supportEmail}</span>
              </a>
              <a href={`https://wa.me/${supportPhone.replace(/\D/g, "")}`} className="flex items-center gap-2.5 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Icon.Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{supportPhone}</span>
              </a>
              <div className="flex items-start gap-2.5">
                <Icon.MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="leading-relaxed">{supportAddress}</span>
              </div>
            </div>
            <a
              href={waGroupLink}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 hover:shadow-emerald-500/10 active:scale-[0.98] transition-all"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.017 14.12 1.01 11.5 1.01c-5.44 0-9.866 4.372-9.87 9.802 0 1.698.45 3.35 1.303 4.806L1.93 20.315l4.717-1.16z" />
              </svg>
              Gabung Grup WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-100 pt-6 dark:border-slate-900">
          <p className="text-center text-xs text-gray-400 dark:text-slate-500">
            © {new Date().getFullYear()} Jual Beli USU Polmed. Dibuat khusus untuk mahasiswa Universitas Sumatera Utara &amp; Politeknik Negeri Medan.
          </p>
        </div>
      </div>
    </footer>
  );
}
