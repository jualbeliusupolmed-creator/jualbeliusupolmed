import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCartItems, isInCart, toggleCartItem } from "./cart";

describe("cart storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates saved items from the legacy favorites key", () => {
    const saved = [{ id: "listing-1", title: "Buku" }];
    localStorage.setItem("favorites", JSON.stringify(saved));

    expect(getCartItems()).toEqual(saved);
    expect(JSON.parse(localStorage.getItem("cart_items"))).toEqual(saved);
  });

  it("adds and removes products while notifying other cart views", () => {
    const changed = vi.fn();
    window.addEventListener("cart-changed", changed);
    const listing = { id: "listing-1", title: "Buku", price: 10000 };

    expect(toggleCartItem(listing)).toBe(true);
    expect(isInCart(listing.id)).toBe(true);
    expect(toggleCartItem(listing)).toBe(false);
    expect(getCartItems()).toEqual([]);
    expect(changed).toHaveBeenCalledTimes(2);

    window.removeEventListener("cart-changed", changed);
  });

  it("does not restore legacy items after the migrated cart is emptied", () => {
    localStorage.setItem("favorites", JSON.stringify([{ id: "listing-1" }]));
    getCartItems();
    toggleCartItem({ id: "listing-1" });

    expect(getCartItems()).toEqual([]);
  });
});
