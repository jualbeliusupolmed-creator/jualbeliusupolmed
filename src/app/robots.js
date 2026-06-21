export default function robots() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbelimedan.web.id").trim();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/edit", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
