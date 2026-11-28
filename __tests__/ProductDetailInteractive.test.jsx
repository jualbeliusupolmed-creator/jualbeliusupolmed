import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProductDetailInteractive from "../src/components/ProductDetailInteractive";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }) => React.createElement("a", props, children),
  };
});

vi.mock("@/components/Icons", async () => {
  const React = await import("react");
  return {
    Icon: new Proxy(
      {},
      {
        get: () => (props) => React.createElement("svg", props),
      }
    ),
  };
});

vi.mock("@/components/OfferButton", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }) =>
      React.createElement("button", props, children),
  };
});

vi.mock("@/components/CartButton", () => ({ default: () => null }));
vi.mock("@/components/CopyLinkButton", () => ({ default: () => null }));
vi.mock("@/components/QRButton", () => ({ default: () => null }));
vi.mock("@/components/ShareModal", () => ({ default: () => null }));
vi.mock("@/components/OwnerFastActions", () => ({ default: () => null }));
vi.mock("@/components/ReportButton", () => ({ default: () => null }));

function renderProduct(views, description) {
  render(
    <ProductDetailInteractive
      listing={{
        id: "listing-1",
        title: "Buku kuliah",
        category: "Buku",
        condition: "used",
        price: 25000,
        description,
        seller_name: "Penjual",
        seller_profiles: { slug: "penjual" },
        views,
      }}
      listingSpecs={[]}
      sellerUsername="penjual"
      available
      gallery={<div />}
    />
  );
}

describe("ProductDetailInteractive", () => {
  it("does not invent a view count or usage history when the data is absent", () => {
    renderProduct(undefined);

    expect(screen.queryByText(/kali dilihat/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Catatan Pemakaian" }));
    expect(
      screen.getByText("Penjual belum menambahkan catatan pemakaian atau alasan dijual.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Balas Cepat")).not.toBeInTheDocument();
  });

  it("shows a real zero view count", () => {
    renderProduct(0);

    expect(screen.getByText("0 kali dilihat")).toBeInTheDocument();
  });

  it("keeps the seller description visible before the secondary detail tabs", () => {
    renderProduct(undefined, "Sampul masih utuh, bekas pemakaian satu semester.");

    expect(
      screen.getByRole("heading", { name: "Tentang barang" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sampul masih utuh, bekas pemakaian satu semester.")
    ).toBeInTheDocument();
  });
});
