import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/link", async () => {
  const React = await import("react");
  return { default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
});

import MadingClient from "./MadingClient";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const initialPosts = [
  {
    id: "post-1",
    _kind: "mading",
    type: "info",
    title: "Pengumuman lama",
    content: "Informasi kampus",
    created_at: "2026-11-01T10:00:00Z",
  },
];

describe("MadingClient pagination", () => {
  it("loads the next page and ignores duplicate posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        posts: [
          { id: "post-1", type: "info", title: "Judul duplikat", created_at: "2026-11-02T10:00:00Z" },
          { id: "post-2", type: "info", title: "Pengumuman berikutnya", created_at: "2026-11-03T10:00:00Z" },
          { id: "post-2", type: "info", title: "Duplikat dalam halaman", created_at: "2026-11-04T10:00:00Z" },
        ],
        totalPages: 2,
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<MadingClient initialPosts={initialPosts} initialHasMoreMading />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat Berita Lainnya/ }));

    expect(await screen.findAllByText("Pengumuman berikutnya")).not.toHaveLength(0);
    expect(screen.queryByText("Judul duplikat")).not.toBeInTheDocument();
    expect(screen.queryByText("Duplikat dalam halaman")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/mading?page=2&limit=20", { cache: "no-store" });
  });

  it("shows a backend error and allows retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Layanan Mading belum tersedia." }), { status: 500 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<MadingClient initialPosts={initialPosts} initialHasMoreMading />);
    fireEvent.click(screen.getByRole("button", { name: /Lihat Berita Lainnya/ }));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").some((alert) => alert.textContent === "Layanan Mading belum tersedia.")).toBe(true);
    });
    expect(screen.getByRole("button", { name: /Lihat Berita Lainnya/ })).toBeEnabled();
  });
});
