const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

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
    // Font yang dibundel menjamin teks Latin konsisten di server Linux, tetapi
    // tidak memuat glyph emoji. Emoji dibersihkan hanya dari gambar agar tidak
    // menjadi kotak; caption Instagram dan isi website tetap utuh.
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

function typographyForLength(length) {
  if (length <= 110) return { fontSize: 40, lineHeight: 62, maxChars: 39, maxLines: 8 };
  if (length <= 220) return { fontSize: 35, lineHeight: 55, maxChars: 46, maxLines: 11 };
  if (length <= 380) return { fontSize: 31, lineHeight: 49, maxChars: 53, maxLines: 14 };
  return { fontSize: 27, lineHeight: 43, maxChars: 61, maxLines: 17 };
}

export function layoutMadingInstagramPost(post = {}) {
  const message = normalizeText([post.title, post.content].filter(Boolean).join(" — "));
  const typography = typographyForLength(message.length);
  const lines = wrapInstagramText(message, typography.maxChars, typography.maxLines);
  const messageCenterY = 650;
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
) {
  const layout = layoutMadingInstagramPost(post);
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

export function createMadingInstagramSvg() {

  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
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

      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#F8F7F3"/>
      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#violetGlow)"/>
      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#greenGlow)"/>

      <line x1="164" y1="1138" x2="916" y2="1138" stroke="#D8D6D0" stroke-width="1.5"/>
      <circle cx="454" cy="1254" r="8" fill="#16B77E"/>
      <circle cx="481" cy="1254" r="8" fill="#7050C2"/>
    </svg>`;
}
