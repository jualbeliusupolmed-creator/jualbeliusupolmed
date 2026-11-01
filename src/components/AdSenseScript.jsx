"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const PRIVATE_ROUTES = ["/chat", "/admin", "/dashboard", "/profil", "/login"];

export default function AdSenseScript() {
  const pathname = usePathname();

  // Jangan pernah memuat skrip AdSense di ruang obrolan, panel admin, dashboard, atau rute privat
  if (!pathname || PRIVATE_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6730561722094443"
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
