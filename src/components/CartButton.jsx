"use client";

import { useEffect, useState } from "react";
import { isInCart, toggleCartItem } from "@/lib/cart";
import { Icon } from "@/components/Icons";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

export default function CartButton({ listing, className = "", size = "md" }) {
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    const sync = () => setInCart(isInCart(listing.id));
    sync();
    window.addEventListener("cart-changed", sync);
    return () => window.removeEventListener("cart-changed", sync);
  }, [listing.id]);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !inCart;
    setInCart(nextState);
    if (nextState) {
      hapticSuccess();
    } else {
      hapticLight();
    }
    toggleCartItem(listing);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={inCart ? "Hapus dari keranjang" : "Tambahkan ke keranjang"}
      title={inCart ? "Hapus dari keranjang" : "Tambahkan ke keranjang"}
      className={`grid cursor-pointer place-items-center rounded-full bg-white/90 shadow transition motion-safe:hover:scale-110 motion-reduce:transition-none ${
        size === "lg" ? "h-10 w-10 text-xl" : "h-8 w-8 text-base"
      } relative ${inCart ? "!bg-emerald-800 text-white" : "text-gray-500"} ${className}`}
    >
      <Icon.ShoppingCart aria-hidden="true" className={`h-5 w-5 ${inCart ? "text-white" : ""}`} />
    </button>
  );
}
