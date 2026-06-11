import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
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
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
