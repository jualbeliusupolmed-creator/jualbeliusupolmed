import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import LayoutWrapper from "@/components/LayoutWrapper";
import BackToTop from "@/components/BackToTop";
import { Toaster } from "sonner";

const BASE_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

export const metadata = {
  title: {
    default: "Jual Beli USU Polmed — Marketplace Mahasiswa Medan",
    template: "%s — Jual Beli USU Polmed",
  },
  description:
    "Marketplace jual-beli khusus mahasiswa USU & POLMED Medan: laptop bekas, HP, buku kuliah, fashion, makanan, kos, dan jasa. Transaksi aman & COD di kampus, dibantu admin.",
  keywords: [
    "jual beli USU",
    "marketplace mahasiswa Medan",
    "laptop bekas USU",
    "barang bekas mahasiswa POLMED",
    "kos dekat USU",
    "COD kampus USU",
    "preloved mahasiswa Medan",
  ],
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Jual Beli USU Polmed — Marketplace Mahasiswa Medan",
    description:
      "Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa antar mahasiswa USU & POLMED. Aman, cepat, COD di kampus, dibantu admin.",
    type: "website",
    url: "/",
    siteName: "Jual Beli USU Polmed",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jual Beli USU Polmed — Marketplace Mahasiswa Medan",
    description:
      "Jual-beli barang & jasa antar mahasiswa USU & POLMED. Aman, cepat, COD di kampus.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

// JSON-LD: WebSite + SearchAction & Organization — membantu Google memahami
// situs dan menampilkan sitelinks search box.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Jual Beli USU Polmed",
      description:
        "Marketplace jual-beli khusus mahasiswa USU & POLMED Medan.",
      inLanguage: "id-ID",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Jual Beli USU Polmed",
      url: BASE_URL,
      logo: `${BASE_URL}/icons/icon-512x512.png`,
      areaServed: "Medan, Sumatera Utara, Indonesia",
    },
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var d = document.documentElement;
              var c = localStorage.getItem('theme');
              if (c === 'dark') {
                d.classList.add('dark');
              } else {
                d.classList.remove('dark');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <LayoutWrapper>{children}</LayoutWrapper>
        <BackToTop />
        <Toaster position="top-center" theme="system" richColors closeButton />
        <Analytics />
      </body>
    </html>
  );
}
