"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PrimaryNavigation from "@/components/PrimaryNavigation";

function BottomNavigationInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isChatRoom =
    pathname === "/chat" &&
    (searchParams.has("anon") || searchParams.has("room"));
  const isProductPage = pathname?.startsWith("/produk/");

  if (isChatRoom || isProductPage) return null;

  return (
    <>
      <PrimaryNavigation variant="mobile" />
      <div
        aria-hidden="true"
        className="xl:hidden"
        style={{ height: "calc(66px + env(safe-area-inset-bottom, 0px))" }}
      />
    </>
  );
}

export default function BottomNavbar() {
  return (
    <Suspense fallback={null}>
      <BottomNavigationInner />
    </Suspense>
  );
}
