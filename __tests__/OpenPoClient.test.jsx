import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import OpenPoClient from "../src/app/open-po/OpenPoClient";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }) => React.createElement("a", props, children),
  };
});

const batch = {
  id: "batch-1",
  title: "Paket makan siang",
  name: "Paket makan siang",
  category: "Makanan",
  price: 18000,
  quota: 10,
  reserved: 2,
  closes_at: "2027-01-01T10:00:00.000Z",
  pickup_point: "Perpustakaan",
  seller_name: "Penjual",
  campus: "USU",
  unit: "paket",
  description: "Paket makan siang untuk mahasiswa.",
};

describe("OpenPoClient", () => {
  it("distinguishes an empty active catalog from filters with no matches", () => {
    const { rerender } = render(<OpenPoClient initialBatches={[]} />);

    expect(screen.getByText("Belum ada batch Open PO aktif")).toBeInTheDocument();

    rerender(<OpenPoClient initialBatches={[batch]} />);
    const mobileCategories = within(
      screen.getByRole("group", { name: "Kategori Open PO" })
    );
    fireEvent.click(mobileCategories.getByRole("button", { name: "Minuman" }));

    expect(screen.getByText("Belum ada batch yang cocok")).toBeInTheDocument();
  });

  it("uses the batch quota to show an accessible progress value", () => {
    render(<OpenPoClient initialBatches={[batch]} />);

    expect(
      screen.getByRole("progressbar", { name: "2 dari 10 slot sudah dipesan" })
    ).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("2 dari 10 slot dipesan")).toBeInTheDocument();
  });

  it("opens a named reservation dialog and closes it with Escape", () => {
    render(<OpenPoClient initialBatches={[batch]} isAuthenticated />);
    const reserveButton = screen.getByRole("button", { name: "Pesan slot" });

    fireEvent.click(reserveButton);
    expect(screen.getByRole("dialog", { name: batch.title })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(reserveButton).toHaveFocus();
  });
});
