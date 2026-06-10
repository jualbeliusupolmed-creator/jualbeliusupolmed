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

export default nextConfig;
