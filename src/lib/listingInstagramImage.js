import { escapeXml, wrapInstagramText } from "@/lib/madingInstagramImage";

const WIDTH = 1080;
const HEIGHT = 1350;

export function formatInstagramPrice(value) {
  const amount = Number(value || 0);
  return amount > 0
    ? `Rp ${amount.toLocaleString("id-ID")}`
    : "Gratis";
}

function textLayer({
  text,
  fontPath,
  fontName,
  fontSize,
  color,
  width,
  left,
  top,
  align = "left",
}) {
  return {
    input: {
      text: {
        text: `<span foreground="${color}">${escapeXml(text)}</span>`,
        font: `${fontName} ${fontSize}`,
        fontfile: fontPath,
        width,
        align,
        rgba: true,
        dpi: 72,
      },
    },
    left,
    top,
  };
}

export function layoutListingInstagram(listing = {}) {
  const titleLines = wrapInstagramText(listing.title || "Produk kampus", 31, 2);
  const meta = [listing.category, listing.campus, listing.area]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 70);
  return {
    titleLines,
    price: formatInstagramPrice(listing.price),
    meta: meta || "USU · POLMED",
    handle: "@katalogusupolmed",
    footer: "Lihat detail di jualbeliusupolmed.web.id",
  };
}

export function createListingInstagramBaseSvg() {
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="photoFallback" x1="0" y1="0" x2="1080" y2="720" gradientUnits="userSpaceOnUse">
          <stop stop-color="#241047"/>
          <stop offset=".55" stop-color="#5C2AA3"/>
          <stop offset="1" stop-color="#147B62"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(830 210) rotate(135) scale(520 430)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFFFF" stop-opacity=".22"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#F8F7F3"/>
      <rect width="${WIDTH}" height="720" fill="url(#photoFallback)"/>
      <rect width="${WIDTH}" height="720" fill="url(#glow)"/>
      <circle cx="180" cy="320" r="125" fill="#FFFFFF" fill-opacity=".06"/>
      <circle cx="895" cy="520" r="210" fill="#FFFFFF" fill-opacity=".05"/>
    </svg>`;
}

export function createListingInstagramOverlaySvg(hasPhoto) {
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="photoShade" x1="540" y1="310" x2="540" y2="720" gradientUnits="userSpaceOnUse">
          <stop stop-color="#111111" stop-opacity="0"/>
          <stop offset="1" stop-color="#111111" stop-opacity="${hasPhoto ? ".28" : ".08"}"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="720" fill="url(#photoShade)"/>
      <rect x="48" y="42" width="330" height="64" rx="32" fill="#111111" fill-opacity=".62"/>
      <rect y="694" width="${WIDTH}" height="656" rx="34" fill="#F8F7F3"/>
      <rect x="70" y="748" width="170" height="8" rx="4" fill="#7050C2"/>
      <line x1="70" y1="1198" x2="1010" y2="1198" stroke="#D8D6D0" stroke-width="1.5"/>
      <circle cx="853" cy="1267" r="7" fill="#16B77E"/>
      <circle cx="878" cy="1267" r="7" fill="#7050C2"/>
    </svg>`;
}

export function createListingInstagramTextLayers(
  listing,
  { regularFontPath, semiboldFontPath },
) {
  const layout = layoutListingInstagram(listing);
  const layers = [
    textLayer({
      text: layout.handle,
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 25,
      color: "#FFFFFF",
      width: 270,
      left: 78,
      top: 59,
    }),
    textLayer({
      text: layout.meta.toUpperCase(),
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 21,
      color: "#7050C2",
      width: 900,
      left: 70,
      top: 779,
    }),
  ];

  layout.titleLines.forEach((line, index) => {
    layers.push(textLayer({
      text: line,
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 48,
      color: "#202126",
      width: 940,
      left: 70,
      top: 835 + index * 66,
    }));
  });

  layers.push(
    textLayer({
      text: layout.price,
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 55,
      color: "#15936B",
      width: 720,
      left: 70,
      top: layout.titleLines.length > 1 ? 1012 : 956,
    }),
    textLayer({
      text: layout.footer,
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 22,
      color: "#8B8882",
      width: 700,
      left: 70,
      top: 1235,
    }),
    textLayer({
      text: "USU · POLMED",
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 20,
      color: "#6E6B66",
      width: 250,
      left: 760,
      top: 1245,
      align: "right",
    }),
  );
  return layers;
}

