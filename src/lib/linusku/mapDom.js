function text(value, fallback = "") {
  return String(value ?? fallback);
}

export function createMapTooltip(value) {
  const element = document.createElement("span");
  element.textContent = text(value);
  return element;
}

export function createBusMarkerElement(bus, badgeColor) {
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:auto;";

  const marker = document.createElement("div");
  marker.style.cssText = "position:relative;width:44px;height:44px;border-radius:9999px;background:#ffffff;border:2.5px solid #003622;box-shadow:0 4px 12px rgba(0,54,34,0.28);display:flex;align-items:center;justify-content:center;padding:4px;";

  const status = document.createElement("span");
  status.style.cssText = "position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:9999px;border:2px solid #ffffff;";
  status.style.backgroundColor = badgeColor;

  const image = document.createElement("img");
  image.src = "/linus-maskot.svg";
  image.alt = text(bus?.busId, "Bus");
  image.style.cssText = "width:30px;height:30px;object-fit:contain;";

  const label = document.createElement("span");
  label.style.cssText = "margin-top:2px;background:#003622;color:#ceeb7a;font-size:10px;font-weight:800;padding:1px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);";
  label.textContent = text(bus?.busId);

  marker.append(status, image);
  root.append(marker, label);
  return root;
}

export function createBusPopupElement(bus, occupancyLabel, upcoming, eta) {
  const root = document.createElement("div");
  root.style.cssText = "min-width:170px;font-family:sans-serif;";

  const title = document.createElement("div");
  title.style.cssText = "font-weight:800;font-size:13px;color:#003622;";
  title.textContent = text(bus?.name || bus?.busId, "Bus");

  const details = document.createElement("div");
  details.style.cssText = "font-size:11px;color:#404943;margin-top:4px;";

  const speedLabel = document.createTextNode("Kecepatan: ");
  const speed = document.createElement("strong");
  const speedValue = Number(bus?.speedKmh);
  speed.textContent = `${Number.isFinite(speedValue) ? Math.round(speedValue) : 0} km/jam`;
  details.append(speedLabel, speed, document.createElement("br"));

  const occupancyPrefix = document.createTextNode("Kepadatan: ");
  const occupancy = document.createElement("strong");
  occupancy.textContent = text(occupancyLabel, "Sedang");
  details.append(occupancyPrefix, occupancy);

  if (upcoming?.stop?.name) {
    const stopName = document.createElement("strong");
    stopName.textContent = text(upcoming.stop.name);
    details.append(
      document.createElement("br"),
      document.createTextNode("Menuju: "),
      stopName,
      document.createTextNode(` (± ${text(eta, "-")} mnt)`)
    );
  }

  root.append(title, details);
  return root;
}
