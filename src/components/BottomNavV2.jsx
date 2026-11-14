"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useSesi } from "@/components/SesiProvider";
import { hapticLight } from "@/lib/haptics";

const NAV_ITEMS = [
  { key: "home", label: "Beranda", href: "/", icon: Icon.Home, match: ["/"] },
  {
    key: "market",
    label: "Marketplace",
    href: "/jual-beli",
    icon: Icon.ShoppingBag,
    match: ["/jual-beli", "/produk", "/jasa", "/keranjang", "/dicari"],
  },
  { key: "chat", label: "Obrolan", href: "/chat", icon: Icon.MessageCircle, match: ["/chat"] },
  {
    key: "akun",
    label: "Akun",
    href: "/dashboard",
    icon: Icon.User,
    match: ["/dashboard", "/profil", "/pengaturan"],
  },
];

export default function BottomNavV2() {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa } = useSesi();

  const activeKey = NAV_ITEMS.find((item) =>
    item.match.some((m) => (m === "/" ? pathname === m : pathname?.startsWith(m))),
  )?.key || "home";

  const handleItem = (item) => {
    hapticLight();
    if (item.key === "akun" && !sesiWa) {
      router.push("/jual");
      return;
    }
    router.push(item.href);
  };

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/60 dark:border-white/[0.06] shadow-lg px-4 sm:px-6 pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around h-12 px-2 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;
          const IconComp = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleItem(item)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 transition-colors duration-200 active:scale-95"
            >
              <IconComp
                className={`h-4 w-4 transition-all duration-200 ${isActive ? "text-emerald-700 scale-110" : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-emerald-400"}`}
                aria-hidden="true"
              />
              <span
                className={`text-[9px] leading-none font-bold transition-colors duration-200 whitespace-nowrap ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
