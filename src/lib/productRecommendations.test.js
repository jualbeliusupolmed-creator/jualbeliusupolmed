import { describe, expect, it } from "vitest";
import { selectProductRecommendations } from "./productRecommendations";

const current = { id: "current", category: "Elektronik" };
const candidate = (id, overrides = {}) => ({
  id,
  title: `Barang ${id}`,
  description: "Kondisi baik dan siap digunakan.",
  category: "Elektronik",
  price: 100000,
  stock: 1,
  status: "active",
  ...overrides,
});

describe("product recommendations", () => {
  it("excludes the current listing and duplicate IDs", () => {
    const first = candidate("first");
    const result = selectProductRecommendations(current, [
      candidate("current"),
      first,
      { ...first, title: "Duplikat" },
    ]);

    expect(result).toEqual([first]);
  });

  it("only returns available and moderation-approved listings", () => {
    const available = candidate("available");
    const result = selectProductRecommendations(current, [
      candidate("sold", { status: "sold" }),
      candidate("empty", { stock: 0 }),
      candidate("pending", { status: "pending" }),
      candidate("prohibited", { title: "Senjata api" }),
      available,
    ]);

    expect(result).toEqual([available]);
  });

  it("limits the number of recommendations", () => {
    const result = selectProductRecommendations(
      current,
      Array.from({ length: 6 }, (_, index) => candidate(`item-${index}`)),
      4
    );

    expect(result).toHaveLength(4);
  });
});
