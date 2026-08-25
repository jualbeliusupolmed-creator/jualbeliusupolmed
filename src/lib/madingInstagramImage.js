const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1350;

const LANDSCAPE_WIDTH = 1200;
const LANDSCAPE_HEIGHT = 675;

export function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, " ")
    .replace(/[\u{1F3FB}-\u{1F3FF}\u200D\uFE0E\uFE0F\u20E3]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLongWord(word, maxChars) {
  const characters = Array.from(word);
  if (characters.length <= maxChars) return [word];

  const pieces = [];
  for (let index = 0; index < characters.length; index += maxChars) {
    pieces.push(characters.slice(index, index + maxChars).join(""));
  }
  return pieces;
}

export function wrapInstagramText(value, maxChars = 46, maxLines = 10) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const words = normalized
    .split(" ")
    .flatMap((word) => splitLongWord(word, maxChars));
  const lines = [];
  let currentLine = "";
  let omitted = false;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;

    if (lines.length >= maxLines) {
      omitted = true;
      currentLine = "";
      break;
    }

    if (index < words.length - 1 && lines.length === maxLines - 1) {
      omitted = true;
      break;
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (lines.length > maxLines) lines.length = maxLines;

  if (omitted && lines.length) {
    const finalLine = lines[lines.length - 1].replace(/[.\s…]+$/g, "");
    lines[lines.length - 1] = `${finalLine.slice(0, Math.max(1, maxChars - 1))}…`;
  }

  return lines;
}

function typographyForLength(length, isLandscape = false) {
  if (isLandscape) {
    if (length <= 100) return { fontSize: 34, lineHeight: 50, maxChars: 56, maxLines: 6 };
    if (length <= 200) return { fontSize: 28, lineHeight: 42, maxChars: 68, maxLines: 7 };
    return { fontSize: 24, lineHeight: 36, maxChars: 78, maxLines: 8 };
  }
  if (length <= 110) return { fontSize: 40, lineHeight: 62, maxChars: 39, maxLines: 8 };
  if (length <= 220) return { fontSize: 35, lineHeight: 55, maxChars: 46, maxLines: 11 };
  if (length <= 380) return { fontSize: 31, lineHeight: 49, maxChars: 53, maxLines: 14 };
  return { fontSize: 27, lineHeight: 43, maxChars: 61, maxLines: 17 };
}

export function layoutMadingInstagramPost(post = {}, ratio = "portrait") {
  const isLandscape = ratio === "landscape";
  const message = normalizeText([post.title, post.content].filter(Boolean).join(" — "));
  
  const typography = post.image_url
    ? isLandscape
      ? { fontSize: 24, lineHeight: 36, maxChars: 54, maxLines: 5 }
      : message.length <= 160
      ? { fontSize: 36, lineHeight: 54, maxChars: 44, maxLines: 6 }
      : { fontSize: 30, lineHeight: 46, maxChars: 53, maxLines: 7 }
    : typographyForLength(message.length, isLandscape);

  const lines = wrapInstagramText(message, typography.maxChars, typography.maxLines);
  const messageCenterY = isLandscape
    ? post.image_url ? 440 : 330
    : post.image_url ? 900 : 650;
  const firstLineY = messageCenterY - ((lines.length - 1) * typography.lineHeight) / 2;

  return {
    ...typography,
    lines,
    firstLineY,
    handle: "@usupolmedmenfess",
    footer: "dikirim lewat jualbeliusupolmed.web.id",
  };
}

function pangoTextLayer({
  text,
  fontPath,
  fontName,
  fontSize,
  color,
  width,
  left,
  top,
  align = "center",
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

export function createMadingInstagramTextLayers(
  post = {},
  { regularFontPath, semiboldFontPath },
  ratio = "portrait"
) {
  const isLandscape = ratio === "landscape";
  const layout = layoutMadingInstagramPost(post, ratio);

  if (isLandscape) {
    const layers = [
      pangoTextLayer({
        text: layout.handle,
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 24,
        color: "#7050C2",
        width: 600,
        left: 300,
        top: 45,
      }),
    ];

    layout.lines.forEach((line, index) => {
      layers.push(
        pangoTextLayer({
          text: line,
          fontPath: regularFontPath,
          fontName: "Plus Jakarta Sans",
          fontSize: layout.fontSize,
          color: "#24262B",
          width: 1040,
          left: 80,
          top: Math.round(
            layout.firstLineY + index * layout.lineHeight - layout.fontSize,
          ),
        }),
      );
    });

    layers.push(
      pangoTextLayer({
        text: layout.footer,
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 18,
        color: "#96938D",
        width: 600,
        left: 300,
        top: 600,
      }),
      pangoTextLayer({
        text: "USU · POLMED",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 17,
        color: "#77746F",
        width: 250,
        left: 580,
        top: 630,
        align: "left",
      }),
    );

    return layers;
  }

  // PORTRAIT DEFAULT (1080 x 1350)
  const layers = [
    pangoTextLayer({
      text: layout.handle,
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 28,
      color: "#7050C2",
      width: 800,
      left: 140,
      top: 137,
    }),
  ];

  layout.lines.forEach((line, index) => {
    layers.push(
      pangoTextLayer({
        text: line,
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: layout.fontSize,
        color: "#24262B",
        width: 900,
        left: 90,
        top: Math.round(
          layout.firstLineY + index * layout.lineHeight - layout.fontSize,
        ),
      }),
    );
  });

  layers.push(
    pangoTextLayer({
      text: layout.footer,
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 23,
      color: "#96938D",
      width: 800,
      left: 140,
      top: 1166,
    }),
    pangoTextLayer({
      text: "USU · POLMED",
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 21,
      color: "#77746F",
      width: 370,
      left: 505,
      top: 1238,
      align: "left",
    }),
  );

  return layers;
}

export function createMadingInstagramSvg({ hasPhoto = false, ratio = "portrait" } = {}) {
  const isLandscape = ratio === "landscape";
  const width = isLandscape ? LANDSCAPE_WIDTH : PORTRAIT_WIDTH;
  const height = isLandscape ? LANDSCAPE_HEIGHT : PORTRAIT_HEIGHT;

  if (isLandscape) {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="violetGlow" cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(42) scale(400 300)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#7C5AC8" stop-opacity=".06"/>
            <stop offset="1" stop-color="#7C5AC8" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="greenGlow" cx="0" cy="0" r="1" gradientTransform="translate(1120 620) rotate(-140) scale(400 300)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#14A875" stop-opacity=".05"/>
            <stop offset="1" stop-color="#14A875" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <rect width="${width}" height="${height}" fill="#F8F7F3"/>
        <rect width="${width}" height="${height}" fill="url(#violetGlow)"/>
        <rect width="${width}" height="${height}" fill="url(#greenGlow)"/>

        ${hasPhoto ? '<rect x="350" y="90" width="500" height="230" rx="20" fill="#E9E6DE"/>' : ""}

        <line x1="200" y1="580" x2="1000" y2="580" stroke="#D8D6D0" stroke-width="1.5"/>
        <circle cx="535" cy="640" r="6" fill="#16B77E"/>
        <circle cx="558" cy="640" r="6" fill="#7050C2"/>
      </svg>`;
  }

  // PORTRAIT (1080 x 1350)
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="violetGlow" cx="0" cy="0" r="1" gradientTransform="translate(80 80) rotate(42) scale(520 410)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#7C5AC8" stop-opacity=".055"/>
          <stop offset="1" stop-color="#7C5AC8" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="greenGlow" cx="0" cy="0" r="1" gradientTransform="translate(1000 1280) rotate(-140) scale(520 400)" gradientUnits="userSpaceOnUse">
          <stop stop-color="#14A875" stop-opacity=".05"/>
          <stop offset="1" stop-color="#14A875" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <rect width="${width}" height="${height}" fill="#F8F7F3"/>
      <rect width="${width}" height="${height}" fill="url(#violetGlow)"/>
      <rect width="${width}" height="${height}" fill="url(#greenGlow)"/>

      ${hasPhoto ? '<rect x="122" y="237" width="836" height="476" rx="30" fill="#E9E6DE"/>' : ""}

      <line x1="164" y1="1138" x2="916" y2="1138" stroke="#D8D6D0" stroke-width="1.5"/>
      <circle cx="454" cy="1254" r="8" fill="#16B77E"/>
      <circle cx="481" cy="1254" r="8" fill="#7050C2"/>
    </svg>`;
}
