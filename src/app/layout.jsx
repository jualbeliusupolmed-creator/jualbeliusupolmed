import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Jual Beli USU Polmed — Marketplace Mahasiswa",
  description:
    "Tempat jual-beli barang warga USU & POLMED: laptop, HP, buku, fashion, makanan, kos, dan jasa.",
  manifest: "/manifest.json",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: "Jual Beli USU Polmed",
    description: "Marketplace mahasiswa USU & POLMED",
    type: "website",
  },
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
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
