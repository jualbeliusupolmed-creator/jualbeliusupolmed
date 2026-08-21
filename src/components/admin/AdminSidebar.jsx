"use client";

import AdminNav from "./AdminNav";
import { NAV } from "./nav";

// Daftar menunya tinggal di ./nav.js — dipakai bareng judul halaman, supaya
// menu dan judul tidak pernah menyebut halaman yang sama dengan dua nama.
export { NAV };

/**
 * Rel kiri, hanya di layar lebar.
 *
 * Pencarian menu pindah ke bilah atas (AdminTopbar) — di Google, kotak cari
 * memang tinggal di sana, dan menaruhnya di dua tempat berarti dua kotak yang
 * mencari hal berbeda.
 */
export default function AdminSidebar({ counts = {} }) {
  return (
    <aside className="g-rail hidden lg:flex">
      <div className="g-rail-brand">
        <span className="g-rail-brand-mark">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        </span>
        <span className="g-rail-brand-text">
          <b>Admin</b> Console
        </span>
      </div>

      <AdminNav counts={counts} />
    </aside>
  );
}
