import { nextOnPages } from "@cloudflare/next-on-pages";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "kampuskita.my.id" },
      { protocol: "https", hostname: "www.kampuskita.my.id" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["sonner", "lucide-react", "clsx", "tailwind-merge", "@supabase/supabase-js"],
  },
};

export default nextOnPages(nextConfig);
