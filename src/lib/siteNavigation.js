export const PRIMARY_NAV_ITEMS = [
  {
    id: "marketplace",
    label: "Jual Beli",
    href: "/jual-beli",
    matchPaths: [
      "/",
      "/jual-beli",
      "/produk",
      "/jual",
      "/edit",
      "/dicari",
      "/jasa",
      "/keranjang",
      "/favorit",
      "/toko",
      "/penjual",
      "/distributor",
    ],
  },
  {
    id: "open-po",
    label: "Open PO",
    href: "/open-po",
    matchPaths: ["/open-po", "/dashboard/open-po"],
  },
  {
    id: "linusku",
    label: "LINUSKU",
    href: "/linusku",
    matchPaths: ["/linusku"],
  },
  {
    id: "news",
    label: "Berita",
    href: "/blog",
    matchPaths: ["/blog"],
  },
  {
    id: "explore",
    label: "Jelajahi",
    href: "/jelajahi",
    matchPaths: ["/jelajahi", "/mading", "/organisasi", "/oprec", "/faq"],
  },
];

export function isPrimaryNavigationActive(pathname, item) {
  if (!pathname) return false;

  return item.matchPaths.some((path) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`)
  );
}
