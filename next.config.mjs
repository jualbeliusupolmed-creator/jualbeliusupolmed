import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  serverExternalPackages: ["@cf-wasm/photon"],
};

if (process.env.NODE_ENV === "development" && process.env.KAMPUSKITA_VINEXT !== "1") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
