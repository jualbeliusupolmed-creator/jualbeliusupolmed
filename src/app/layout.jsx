import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import LayoutWrapper from "@/components/LayoutWrapper";
import BackToTop from "@/components/BackToTop";
import { Toaster } from "sonner";
import Script from "next/script";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { skripJsonLd } from "@/lib/jsonLd";



const BASE_URL =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-jakarta",
});

export async function generateMetadata() {
  const settings = await getSettings();
  const site = settings.site || {};
  
  const baseTitle = site.metaTitle || "Jual Beli USU & Polmed — Marketplace Mahasiswa Medan";
  const baseDesc = site.metaDescription || "Marketplace jual-beli khusus mahasiswa USU & Polmed: laptop bekas, HP, buku, fashion, makanan, kos, dan jasa. Transaksi aman & COD di area yang disepakati, dibantu admin.";
  const keywordsString = site.metaKeywords || "jual beli USU, jual beli Polmed, marketplace mahasiswa Medan, laptop bekas USU, barang bekas mahasiswa Polmed, kos dekat USU, COD kampus";
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
  // Cubit-untuk-perbesar dibiarkan hidup: mengunci zoom bikin teks kecil
  // mustahil dibaca sebagian orang, dan itu pelanggaran aksesibilitas.
  maximumScale: 5,
  userScalable: true,
  // Warna bilah peramban di Android/iOS. Ungu Polmed, sama dengan tombol
  // ajakan utama — supaya jendela aplikasi menyatu dengan halamannya.
  themeColor: "#532b98",
};

export default async function RootLayout({ children }) {
  const settings = await getSettings();
  const site = settings.site || {};
  const baseTitle = site.metaTitle || "Jual Beli USU & Polmed — Marketplace Mahasiswa Medan";
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
        description: site.metaDescription || "Marketplace jual-beli khusus mahasiswa USU & Polmed.",
        inLanguage: "id-ID",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/jual-beli?q={search_term_string}` },
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
    <html lang="id" className={cn("font-sans", jakartaSans.variable)} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="google-adsense-account" content="ca-pub-6730561722094443" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var d = document.documentElement;
              var c = localStorage.getItem('theme');
              var gelap = c === 'dark'
                || (!c && window.matchMedia('(prefers-color-scheme: dark)').matches);
              d.classList.toggle('dark', !!gelap);

              var skala = { kecil: 0.92, normal: 1, besar: 1.12, jumbo: 1.24 }[
                localStorage.getItem('text-scale')
              ];
              if (skala && skala !== 1) d.style.fontSize = 16 * skala + 'px';
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className={cn(jakartaSans.className, "min-h-screen flex flex-col font-sans antialiased overflow-x-hidden")}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6730561722094443"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        <Script
          strategy="lazyOnload"
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
          dangerouslySetInnerHTML={{ __html: skripJsonLd(siteJsonLd) }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW reg failed: ', err);
                  });
                });
              }
            `,
          }}
        />
        <LayoutWrapper>{children}</LayoutWrapper>
        <BackToTop />
        <Toaster position="top-center" theme="system" richColors closeButton />
        <Analytics />
      </body>
    </html>
  );
}
