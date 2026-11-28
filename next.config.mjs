let nextOnPages;
try {
  const pkg = await import("@cloudflare/next-on-pages");
  nextOnPages = pkg?.nextOnPages || pkg?.default?.nextOnPages;
} catch {
  nextOnPages = null;
}

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

export default typeof nextOnPages === "function" ? nextOnPages(nextConfig) : nextConfig;
