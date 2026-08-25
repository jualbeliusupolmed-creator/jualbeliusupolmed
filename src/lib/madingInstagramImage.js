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
    // Font rasterizer server dapat menggambar emoji dasar, tetapi modifier warna
    // kulit sering berubah menjadi kotak kosong. Caption Instagram tetap utuh.
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "")
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

export function createMadingInstagramSvg(post = {}) {
  const layout = layoutMadingInstagramPost(post);

  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#6D4BC3"/>
          <stop offset="0.55" stop-color="#7856CF"/>
          <stop offset="1" stop-color="#18A875"/>
        </linearGradient>
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

      <text x="540" y="164" text-anchor="middle" fill="url(#handle)" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" letter-spacing=".2">${escapeXml(layout.handle)}</text>

      ${layout.lines
        .map(
          (line, index) =>
            `<text x="540" y="${Math.round(layout.firstLineY + index * layout.lineHeight)}" text-anchor="middle" fill="#24262B" font-family="Arial, Helvetica, sans-serif" font-size="${layout.fontSize}" font-weight="400" letter-spacing="-.25">${escapeXml(line)}</text>`,
        )
        .join("\n      ")}

      <line x1="164" y1="1138" x2="916" y2="1138" stroke="#D8D6D0" stroke-width="1.5"/>
      <text x="540" y="1194" text-anchor="middle" fill="#96938D" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400">${escapeXml(layout.footer)}</text>

      <circle cx="454" cy="1254" r="8" fill="#16B77E"/>
      <circle cx="481" cy="1254" r="8" fill="#7050C2"/>
      <text x="510" y="1262" fill="#77746F" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="600" letter-spacing="4">USU · POLMED</text>
    </svg>`;
}
