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

export function layoutListingInstagram(listing = {}, ratio = "portrait") {
  const isStory = ratio === "story";
  const titleLines = wrapInstagramText(listing.title || "Produk kampus", 31, isStory ? 3 : 2);
  const campus = listing.campus || "Kampus";
  const meta = [listing.category, listing.campus, listing.area]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 70);

  const defaultHandle =
    listing.handle ||
    (campus.toUpperCase() === "USU" || campus.toUpperCase() === "POLMED"
      ? "@usupolmedkatalog"
      : `@${campus.toLowerCase().replace(/[^a-z0-9]/g, "")}.menfes`);

  return {
    titleLines,
    price: formatInstagramPrice(listing.price),
    meta: meta || "Social Commerce Kampus",
    handle: defaultHandle,
    footer: "Lihat detail di kampuskita.my.id",
    campusTag: campus ? campus.toUpperCase() : "KAMPUS KITA",
  };
}

export function createListingInstagramBaseSvg(ratio = "portrait") {
  const height = ratio === "story" ? 1920 : 1350;
  const photoHeight = ratio === "story" ? 1080 : 720;
  return `
    <svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="photoFallback" x1="0" y1="0" x2="1080" y2="${photoHeight}" gradientUnits="userSpaceOnUse">
          <stop stop-color="#241047"/>
          <stop offset=".55" stop-color="#5C2AA3"/>
          <stop offset="1" stop-color="#147B62"/>
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientTransform="translate(830 210) rotate(135) scale(520 430)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FFFFFF" stop-opacity=".22"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${height}" fill="#F8F7F3"/>
      <rect width="${WIDTH}" height="${photoHeight}" fill="url(#photoFallback)"/>
      <rect width="${WIDTH}" height="${photoHeight}" fill="url(#glow)"/>
      <circle cx="180" cy="320" r="125" fill="#FFFFFF" fill-opacity=".06"/>
      <circle cx="895" cy="520" r="210" fill="#FFFFFF" fill-opacity=".05"/>
    </svg>`;
}

export function createListingInstagramOverlaySvg(hasPhoto, ratio = "portrait") {
  const height = ratio === "story" ? 1920 : 1350;
  const photoHeight = ratio === "story" ? 1080 : 720;
  const cardY = ratio === "story" ? 1040 : 694;
  const cardHeight = height - cardY;
  const barY = cardY + 54;
  const lineY = height - 152;
  const dotY = height - 83;

  return `
    <svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="photoShade" x1="540" y1="${photoHeight - 400}" x2="540" y2="${photoHeight}" gradientUnits="userSpaceOnUse">
          <stop stop-color="#111111" stop-opacity="0"/>
          <stop offset="1" stop-color="#111111" stop-opacity="${hasPhoto ? ".28" : ".08"}"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${photoHeight}" fill="url(#photoShade)"/>
      <rect x="48" y="42" width="330" height="64" rx="32" fill="#111111" fill-opacity=".62"/>
      <rect y="${cardY}" width="${WIDTH}" height="${cardHeight}" rx="34" fill="#F8F7F3"/>
      <rect x="70" y="${barY}" width="170" height="8" rx="4" fill="#7050C2"/>
      <line x1="70" y1="${lineY}" x2="1010" y2="${lineY}" stroke="#D8D6D0" stroke-width="1.5"/>
      <circle cx="853" cy="${dotY}" r="7" fill="#16B77E"/>
      <circle cx="878" cy="${dotY}" r="7" fill="#7050C2"/>
    </svg>`;
}

export function createListingInstagramTextLayers(
  listing,
  { regularFontPath, semiboldFontPath },
  ratio = "portrait",
) {
  const layout = layoutListingInstagram(listing, ratio);
  const isStory = ratio === "story";
  const baseCardY = isStory ? 1040 : 694;
  const metaY = baseCardY + 85;
  const titleStartY = baseCardY + 141;
  const priceY = isStory
    ? titleStartY + layout.titleLines.length * 66 + 50
    : layout.titleLines.length > 1 ? 1012 : 956;
  const footerY = isStory ? 1805 : 1235;
  const tagY = isStory ? 1815 : 1245;

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
      top: metaY,
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
      top: titleStartY + index * 66,
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
      top: priceY,
    }),
    textLayer({
      text: layout.footer,
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 22,
      color: "#8B8882",
      width: 700,
      left: 70,
      top: footerY,
    }),
    textLayer({
      text: layout.campusTag || "USU · POLMED",
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 20,
      color: "#6E6B66",
      width: 250,
      left: 760,
      top: tagY,
      align: "right",
    }),
  );
  return layers;
}
