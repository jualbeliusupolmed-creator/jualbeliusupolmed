import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserOpenPoWorkspace from "../src/components/open-po/UserOpenPoWorkspace";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, ...props }) => React.createElement("a", props, children),
  };
});

const response = (data, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });

const mine = {
  profile: { name: "Akun Uji", campus: "USU" },
  batches: [
    {
      id: "batch-1",
      title: "Paket makan siang",
      status: "open",
      price_idr: 18000,
      quota: 10,
      reserved_count: 2,
      closes_at: "2027-01-01T10:00:00.000Z",
      pickup_point: "Perpustakaan",
      product: { campus: "USU", unit: "paket" },
    },
  ],
  incoming: [
    {
      id: "order-1",
      status: "pending",
      buyer_name: "Pembeli Uji",
      buyer_wa: null,
      quantity: 2,
      unit_price_idr: 18000,
      total_idr: 36000,
      created_at: "2026-11-28T08:00:00.000Z",
      batch: {
        title: "Paket makan siang",
        pickup_point: "Perpustakaan",
        product: { unit: "paket" },
      },
    },
  ],
  outgoing: [],
};

function mockLoadedWorkspace() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (url === "/api/open-po/mine") return response(mine);
      if (url === "/api/kampus") return response({ campuses: [{ id: "usu", shortName: "USU" }] });
      return response({});
    })
  );
}

describe("UserOpenPoWorkspace", () => {
  beforeEach(mockLoadedWorkspace);
  afterEach(() => vi.unstubAllGlobals());

  it("shows actual batch quota and computed management summaries", async () => {
    render(<UserOpenPoWorkspace embedded />);

    expect(await screen.findByText("2 dari 10 slot dipesan, 8 tersisa")).toBeInTheDocument();
    expect(screen.getAllByText("Menerima pesanan")).toHaveLength(2);
    expect(screen.getByRole("progressbar", { name: "2 dari 10 slot sudah dipesan" })).toHaveAttribute(
      "aria-valuenow",
      "2"
    );
  });

  it("switches between order lists and presents the localized status", async () => {
    render(<UserOpenPoWorkspace embedded />);

    fireEvent.click(await screen.findByRole("button", { name: "Pesanan masuk (1)" }));
    expect(await screen.findByText(/Pembeli: Pembeli Uji/)).toBeInTheDocument();
    expect(screen.getByText("Menunggu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pesanan saya (0)" }));
    expect(await screen.findByText("Belum ada pesanan")).toBeInTheDocument();
  });

  it("opens the complete batch form without changing its input names", async () => {
    render(<UserOpenPoWorkspace embedded />);

    fireEvent.click(await screen.findByRole("button", { name: "Buat batch" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Terbitkan Open PO" })).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nama produk")).toBeInTheDocument();
    expect(screen.getByLabelText("Harga per satuan")).toBeInTheDocument();
    expect(screen.getByLabelText("Titik pengambilan")).toBeInTheDocument();
  });

  it("announces loading and provides a retry action when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        url === "/api/open-po/mine"
          ? new Promise(() => {})
          : response({ campuses: [] })
      )
    );
    const loadingView = render(<UserOpenPoWorkspace embedded />);
    expect(screen.getByRole("status")).toHaveTextContent("Memuat batch dan pesanan Open PO");
    loadingView.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        url === "/api/open-po/mine"
          ? response({ error: "Data PO gagal dimuat." }, false, 500)
          : response({ campuses: [] })
      )
    );
    render(<UserOpenPoWorkspace embedded />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Data PO gagal dimuat.");
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
});
