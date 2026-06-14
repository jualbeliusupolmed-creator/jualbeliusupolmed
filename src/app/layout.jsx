import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import LayoutWrapper from "@/components/LayoutWrapper";
import BackToTop from "@/components/BackToTop";
import { Toaster } from "sonner";
import Script from "next/script";
import { getSettings } from "@/lib/settings";

const BASE_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export async function generateMetadata() {
  const settings = await getSettings();
  const site = settings.site || {};
  
  const baseTitle = site.metaTitle || "Jual Beli USU Polmed — Marketplace Mahasiswa Medan";
  const baseDesc = site.metaDescription || "Marketplace jual-beli khusus mahasiswa USU & POLMED Medan: laptop bekas, HP, buku kuliah, fashion, makanan, kos, dan jasa. Transaksi aman & COD di kampus, dibantu admin.";
  const keywordsString = site.metaKeywords || "jual beli USU, marketplace mahasiswa Medan, laptop bekas USU, barang bekas mahasiswa POLMED, kos dekat USU, COD kampus USU, preloved mahasiswa Medan";
  const keywords = keywordsString.split(",").map(k => k.trim()).filter(Boolean);

  const faviconUrl = site.faviconUrl;

  const metadataObj = {
    title: {
      default: baseTitle,
      template: `%s — ${baseTitle.split("—")[0].trim()}`,
    },
    description: baseDesc,
    keywords: keywords,
    manifest: "/manifest.json",
    metadataBase: new URL(BASE_URL),
    alternates: { canonical: "/" },
    openGraph: {
      title: baseTitle,
      description: baseDesc,
      type: "website",
      url: "/",
      siteName: baseTitle.split("—")[0].trim(),
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: baseTitle,
      description: baseDesc,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };

  if (faviconUrl) {
    metadataObj.icons = {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    };
  }

  return metadataObj;
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default async function RootLayout({ children }) {
  const settings = await getSettings();
  const site = settings.site || {};
  const baseTitle = site.metaTitle || "Jual Beli USU Polmed — Marketplace Mahasiswa Medan";
  const siteName = baseTitle.split("—")[0].trim();
  const logoUrl = site.logoUrl || `${BASE_URL}/icons/icon-512x512.png`;

  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: siteName,
        description: site.metaDescription || "Marketplace jual-beli khusus mahasiswa USU & POLMED Medan.",
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
        name: siteName,
        url: BASE_URL,
        logo: logoUrl,
        areaServed: "Medan, Sumatera Utara, Indonesia",
      },
    ],
  };

  return (
    <html lang="id" className={jakartaSans.variable} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
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
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-SQFZJPXSW2"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SQFZJPXSW2');
            `,
          }}
        />
        <Script
          id="chunk-error-recovery"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e && e.message && e.message.toLowerCase().includes('loading chunk')) {
                  var key = 'chunk_reload_at';
                  var last = parseInt(sessionStorage.getItem(key) || '0', 10);
                  if (Date.now() - last > 10000) {
                    sessionStorage.setItem(key, Date.now());
                    window.location.reload(true);
                  }
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                var msg = e && e.reason && (e.reason.message || e.reason.name || '');
                if (msg && (msg.includes('ChunkLoadError') || msg.includes('Loading chunk'))) {
                  var key = 'chunk_reload_at';
                  var last = parseInt(sessionStorage.getItem(key) || '0', 10);
                  if (Date.now() - last > 10000) {
                    sessionStorage.setItem(key, Date.now());
                    window.location.reload(true);
                  }
                }
              });
            `,
          }}
        />
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
