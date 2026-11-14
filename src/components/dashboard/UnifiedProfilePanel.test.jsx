import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/link", async () => {
  const React = await import("react");
  return { default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
});
vi.mock("next/image", async () => {
  const React = await import("react");
  return { default: (props) => React.createElement("img", props) };
});
vi.mock("@/components/Icons", () => ({ Icon: new Proxy({}, { get: () => () => null }) }));
vi.mock("@/components/student/StudentVerificationModal", () => ({ default: () => null }));
vi.mock("@/components/dashboard/AccountAccessMethods", () => ({ default: () => null }));
vi.mock("browser-image-compression", () => ({ default: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import UnifiedProfilePanel from "@/components/dashboard/UnifiedProfilePanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UnifiedProfilePanel", () => {
  it("shows a recoverable empty state when profile loading fails before campus data", async () => {
    vi.stubGlobal("fetch", vi.fn((url) => {
      if (url === "/api/profil") {
        return Promise.resolve(new Response(JSON.stringify({ error: "Belum masuk." }), { status: 401 }));
      }
      if (url === "/api/kampus") {
        return Promise.resolve(new Response(JSON.stringify({
          campuses: [{ id: "usu", shortName: "USU", name: "Universitas Sumatera Utara", provinceId: "sumatera-utara" }],
          provinces: [],
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    }));

    render(<UnifiedProfilePanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Belum masuk.");
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/dashboard/login?next=%2Fdashboard%3Ftab%3Dprofil");
  });
});
