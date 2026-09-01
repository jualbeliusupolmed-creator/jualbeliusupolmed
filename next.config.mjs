import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["sonner", "embla-carousel-react"],
    outputFileTracingIncludes: {
      "/api/mading/[id]/instagram-image": [
        "./src/assets/fonts/plus-jakarta-sans/*.ttf",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://bot.jualbeliusupolmed.web.id" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/grup-wa",
        destination: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
        permanent: false,
      },
      {
        source: "/grup",
        destination: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
        permanent: false,
      },
      {
        source: "/wa",
        destination: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
        permanent: false,
      },
      {
        source: "/join-wa",
        destination: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
        permanent: false,
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
  register: true,
  skipWaiting: true,
  customWorkerSrc: "worker",
  // Tanpa ini, PWA yang dibuka saat offline menampilkan dinosaurus Chrome —
  // bukan pengalaman "aplikasi" yang dijanjikan ikon di layar utama.
  fallbacks: {
    document: "/offline",
  },
});

export default withPWA(nextConfig);
