"use client";

import { usePathname, useRouter } from "next/navigation";
import PullToRefresh from "./PullToRefresh";

// Halaman yang punya gerakan usap/geser sendiri, form panjang, atau sudah
// memasang tarik-untuk-segarkan versinya sendiri — dilewati supaya tidak
// bentrok.
const TANPA_TARIK = [
  "/admin",
  "/chat",
  "/teman",
  "/cari-teman",
  "/swap",
  "/mading",
  "/jual",
  "/edit",
  "/auth",
];

export default function GlobalPullToRefresh() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const dilewati = TANPA_TARIK.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (dilewati) return null;

  return (
    <PullToRefresh
      onRefresh={async () => {
        router.refresh();
        // Beri jeda pendek supaya indikator tidak berkedip hilang sebelum
        // data barunya sempat masuk.
        await new Promise((r) => setTimeout(r, 700));
      }}
    />
  );
}
