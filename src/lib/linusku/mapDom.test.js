import { beforeEach, describe, expect, it } from "vitest";
import {
  createBusMarkerElement,
  createBusPopupElement,
  createMapTooltip,
} from "./mapDom";

describe("LINUSKU map DOM content", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("renders bus and stop values as text rather than markup", () => {
    const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const popup = createBusPopupElement(
      { name: payload, busId: payload, speedKmh: 14, occupancy: "low" },
      "Lega",
      { stop: { name: payload } },
      3
    );
    const tooltip = createMapTooltip(payload);

    expect(popup.querySelector("img, script")).toBeNull();
    expect(tooltip.querySelector("img, script")).toBeNull();
    expect(popup.textContent).toContain(payload);
    expect(tooltip.textContent).toBe(payload);
  });

  it("keeps bus marker assets fixed while treating the bus ID as text", () => {
    const payload = '"><svg onload="alert(1)">';
    const marker = createBusMarkerElement({ busId: payload }, "#10b981");

    expect(marker.querySelector("svg, script")).toBeNull();
    expect(marker.querySelector("img")?.getAttribute("src")).toBe("/linus-maskot.svg");
    expect(marker.querySelector("img")?.getAttribute("alt")).toBe(payload);
    expect(marker.textContent).toBe(payload);
  });
});
