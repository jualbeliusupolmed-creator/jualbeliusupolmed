"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/jual", label: "Jual" },
  { href: "/favorit", label: "Favorit" },
  { href: "/cara-bergabung", label: "Cara Bergabung" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-[15px] font-extrabold tracking-tight text-gray-900">
            jualbeli<span className="text-gray-400">.usupolmed</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "font-semibold text-gray-900"
                    : "font-medium text-gray-500 hover:text-gray-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/jual" className="btn-primary ml-2 px-4 py-2">
            Pasang Iklan
          </Link>
        </nav>

        <button
          aria-label="menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-gray-100 bg-white px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/jual"
            onClick={() => setOpen(false)}
            className="btn-primary mt-2 w-full"
          >
            + Pasang Iklan
          </Link>
        </nav>
      )}
    </header>
  );
}
