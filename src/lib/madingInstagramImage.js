const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1350;
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
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

export function wrapInstagramTextPages(value, maxChars = 46, maxLinesPerPage = 10) {
  const normalized = normalizeText(value);
  if (!normalized) return [[]];

  const words = normalized
    .split(" ")
    .flatMap((word) => splitLongWord(word, maxChars));
  
  const pages = [];
  let currentLines = [];
  let currentLine = "";

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxChars) {
      currentLine = candidate;
    } else {
      if (currentLine) currentLines.push(currentLine);
      currentLine = word;

      if (currentLines.length >= maxLinesPerPage) {
        pages.push(currentLines);
        currentLines = [];
      }
    }
  }

  if (currentLine) currentLines.push(currentLine);
  if (currentLines.length > 0) pages.push(currentLines);

  return pages.slice(0, 10); // Instagram max 10 carousel pages
}

function typographyForLength(length, ratio = "portrait") {
  if (ratio === "landscape") {
    if (length <= 100) return { fontSize: 34, lineHeight: 50, maxChars: 56, maxLines: 6 };
    if (length <= 200) return { fontSize: 28, lineHeight: 42, maxChars: 68, maxLines: 7 };
    return { fontSize: 24, lineHeight: 36, maxChars: 78, maxLines: 8 };
  }
  if (ratio === "story" || ratio === "9:16") {
    if (length <= 120) return { fontSize: 42, lineHeight: 66, maxChars: 38, maxLines: 12 };
    if (length <= 260) return { fontSize: 36, lineHeight: 56, maxChars: 44, maxLines: 16 };
    if (length <= 450) return { fontSize: 31, lineHeight: 50, maxChars: 52, maxLines: 20 };
    return { fontSize: 27, lineHeight: 44, maxChars: 60, maxLines: 24 };
  }
  if (length <= 110) return { fontSize: 40, lineHeight: 62, maxChars: 39, maxLines: 8 };
  if (length <= 220) return { fontSize: 35, lineHeight: 55, maxChars: 46, maxLines: 11 };
  if (length <= 380) return { fontSize: 31, lineHeight: 49, maxChars: 53, maxLines: 14 };
  return { fontSize: 27, lineHeight: 43, maxChars: 61, maxLines: 17 };
}

export function layoutMadingInstagramPost(post = {}, ratio = "portrait") {
  const isLandscape = ratio === "landscape";
  const isStory = ratio === "story" || ratio === "9:16";
  const message = normalizeText([post.title, post.content].filter(Boolean).join(" — "));
  
  const typography = post.image_url
    ? isLandscape
      ? { fontSize: 24, lineHeight: 36, maxChars: 54, maxLines: 5 }
      : isStory
      ? { fontSize: 34, lineHeight: 52, maxChars: 46, maxLines: 9 }
      : message.length <= 160
      ? { fontSize: 36, lineHeight: 54, maxChars: 44, maxLines: 6 }
      : { fontSize: 30, lineHeight: 46, maxChars: 53, maxLines: 7 }
    : typographyForLength(message.length, ratio);

  const lines = wrapInstagramText(message, typography.maxChars, typography.maxLines);
  const pages = wrapInstagramTextPages(message, typography.maxChars, typography.maxLines);
  
  const messageCenterY = isLandscape
    ? post.image_url ? 440 : 330
    : isStory
    ? post.image_url ? 1240 : 960
    : post.image_url ? 900 : 650;

  const pagesLayout = pages.map((pageLines) => {
    return {
      lines: pageLines,
      firstLineY: messageCenterY - ((pageLines.length - 1) * typography.lineHeight) / 2
    };
  });

  const firstLineY = messageCenterY - ((lines.length - 1) * typography.lineHeight) / 2;

  return {
    ...typography,
    lines,
    firstLineY,
    pages: pagesLayout,
    handle: "@usu.zonafess",
    footer: "dikirim lewat jualbeliusupolmed.web.id",
  };
}

// ---------------- THEMES ---------------- //
const THEMES = [
  // 0: Light Classic (USU Default)
  {
    bg: "#F8F7F3", card: "#FFFFFF",
    glow1: "#7C5AC8", glow2: "#14A875",
    textPrimary: "#24262B", textSecondary: "#96938D", textAccent: "#7050C2",
    line: "#D8D6D0", photoBg: "#E9E6DE"
  },
  // 1: Dark Blue (ITS Style)
  {
    bg: "#0F172A", card: "#1E293B",
    glow1: "#3B82F6", glow2: "#0EA5E9",
    textPrimary: "#F8FAFC", textSecondary: "#94A3B8", textAccent: "#38BDF8",
    line: "#334155", photoBg: "#0F172A"
  },
  // 2: Lime Green (UINSA Style)
  {
    bg: "#D9F99D", card: "#FFFFFF",
    glow1: "#84CC16", glow2: "#FACC15",
    textPrimary: "#064E3B", textSecondary: "#166534", textAccent: "#4D7C0F",
    line: "#BEF264", photoBg: "#ECFCCB"
  },
  // 3: Warm Yellow (UNNES Style)
  {
    bg: "#FEF08A", card: "#FFFFFF",
    glow1: "#F59E0B", glow2: "#FCD34D",
    textPrimary: "#451A03", textSecondary: "#78350F", textAccent: "#B45309",
    line: "#FDE047", photoBg: "#FEF9C3"
  },
  // 4: Clean Sky (ITB Style)
  {
    bg: "#E0F2FE", card: "#FFFFFF",
    glow1: "#0EA5E9", glow2: "#38BDF8",
    textPrimary: "#0F172A", textSecondary: "#475569", textAccent: "#2563EB",
    line: "#BAE6FD", photoBg: "#F0F9FF"
  }
];

function getTheme(postId) {
  if (!postId) return THEMES[0];
  let hash = 0;
  for (let i = 0; i < String(postId).length; i++) {
    hash = String(postId).charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEMES.length;
  return THEMES[index];
}

function pangoTextLayer({
  text, fontPath, fontName, fontSize, color, width, left, top, align = "center",
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
  ratio = "portrait",
  pageIndex = 0
) {
  const isLandscape = ratio === "landscape";
  const isStory = ratio === "story" || ratio === "9:16";
  const layout = layoutMadingInstagramPost(post, ratio);
  const theme = getTheme(post.id);
  
  // Amankan index halaman
  const safePageIndex = Math.max(0, Math.min(pageIndex, layout.pages.length - 1));
  const pageData = layout.pages[safePageIndex];

  const totalPages = layout.pages.length;
  const pageIndicator = totalPages > 1 ? ` (${safePageIndex + 1}/${totalPages})` : "";

  if (isLandscape) {
    const layers = [
      pangoTextLayer({
        text: layout.handle,
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 24,
        color: theme.textAccent,
        width: 600,
        left: 300,
        top: 45,
      }),
    ];

    pageData.lines.forEach((line, index) => {
      layers.push(
        pangoTextLayer({
          text: line,
          fontPath: regularFontPath,
          fontName: "Plus Jakarta Sans",
          fontSize: layout.fontSize,
          color: theme.textPrimary,
          width: 1040,
          left: 80,
          top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
        }),
      );
    });

    layers.push(
      pangoTextLayer({
        text: layout.footer + pageIndicator,
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 18,
        color: theme.textSecondary,
        width: 600,
        left: 300,
        top: 600,
      }),
      pangoTextLayer({
        text: "USU · POLMED",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 17,
        color: theme.textSecondary,
        width: 250,
        left: 580,
        top: 630,
        align: "left",
      }),
    );
    return layers;
  }

  if (isStory) {
    const layers = [
      pangoTextLayer({
        text: layout.handle,
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 28,
        color: theme.textAccent,
        width: 800,
        left: 140,
        top: 190,
      }),
    ];

    pageData.lines.forEach((line, index) => {
      layers.push(
        pangoTextLayer({
          text: line,
          fontPath: regularFontPath,
          fontName: "Plus Jakarta Sans",
          fontSize: layout.fontSize,
          color: theme.textPrimary,
          width: 900,
          left: 90,
          top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
        }),
      );
    });

    layers.push(
      pangoTextLayer({
        text: layout.footer + pageIndicator,
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 23,
        color: theme.textSecondary,
        width: 800,
        left: 140,
        top: 1736,
      }),
      pangoTextLayer({
        text: "USU · POLMED",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 21,
        color: theme.textSecondary,
        width: 370,
        left: 505,
        top: 1808,
        align: "left",
      }),
    );
    return layers;
  }

  // PORTRAIT DEFAULT 4:5
  const layers = [
    pangoTextLayer({
      text: layout.handle,
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 28,
      color: theme.textAccent,
      width: 800,
      left: 140,
      top: 137,
    }),
  ];

  pageData.lines.forEach((line, index) => {
    layers.push(
      pangoTextLayer({
        text: line,
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: layout.fontSize,
        color: theme.textPrimary,
        width: 900,
        left: 90,
        top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
      }),
    );
  });

  layers.push(
    pangoTextLayer({
      text: layout.footer + pageIndicator,
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 23,
      color: theme.textSecondary,
      width: 800,
      left: 140,
      top: 1166,
    }),
    pangoTextLayer({
      text: "USU · POLMED",
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 21,
      color: theme.textSecondary,
      width: 370,
      left: 505,
      top: 1238,
      align: "left",
    }),
  );
  return layers;
}

export function createMadingInstagramSvg({ hasPhoto = false, ratio = "portrait", postId = null } = {}) {
  const isLandscape = ratio === "landscape";
  const isStory = ratio === "story" || ratio === "9:16";
  const width = isLandscape ? LANDSCAPE_WIDTH : isStory ? STORY_WIDTH : PORTRAIT_WIDTH;
  const height = isLandscape ? LANDSCAPE_HEIGHT : isStory ? STORY_HEIGHT : PORTRAIT_HEIGHT;
  
  const theme = getTheme(postId);

  // Background and glows
  let svgContent = `
    <defs>
      <radialGradient id="glow1" cx="0" cy="0" r="1" gradientTransform="translate(${isLandscape ? '60 60' : isStory ? '80 120' : '80 80'}) rotate(42) scale(${isLandscape ? '400 300' : isStory ? '600 500' : '520 410'})" gradientUnits="userSpaceOnUse">
        <stop stop-color="${theme.glow1}" stop-opacity=".15"/>
        <stop offset="1" stop-color="${theme.glow1}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow2" cx="0" cy="0" r="1" gradientTransform="translate(${isLandscape ? '1120 620' : isStory ? '1000 1800' : '1000 1280'}) rotate(-140) scale(${isLandscape ? '400 300' : isStory ? '600 500' : '520 400'})" gradientUnits="userSpaceOnUse">
        <stop stop-color="${theme.glow2}" stop-opacity=".15"/>
        <stop offset="1" stop-color="${theme.glow2}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="${theme.bg}"/>
    <rect width="${width}" height="${height}" fill="url(#glow1)"/>
    <rect width="${width}" height="${height}" fill="url(#glow2)"/>
  `;

  // Draw Card Container
  if (isLandscape) {
    svgContent += `
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="30" fill="${theme.card}" stroke="${theme.line}" stroke-width="2"/>
      ${hasPhoto ? `<rect x="350" y="90" width="500" height="230" rx="20" fill="${theme.photoBg}"/>` : ""}
      <line x1="200" y1="580" x2="1000" y2="580" stroke="${theme.line}" stroke-width="1.5"/>
      <circle cx="535" cy="640" r="6" fill="${theme.glow2}"/>
      <circle cx="558" cy="640" r="6" fill="${theme.textAccent}"/>
    `;
  } else if (isStory) {
    svgContent += `
      <rect x="40" y="80" width="${width - 80}" height="${height - 160}" rx="60" fill="${theme.card}" stroke="${theme.line}" stroke-width="3"/>
      ${hasPhoto ? `<rect x="110" y="320" width="860" height="580" rx="30" fill="${theme.photoBg}"/>` : ""}
      <line x1="164" y1="1708" x2="916" y2="1708" stroke="${theme.line}" stroke-width="1.5"/>
      <circle cx="454" cy="1824" r="8" fill="${theme.glow2}"/>
      <circle cx="481" cy="1824" r="8" fill="${theme.textAccent}"/>
    `;
  } else {
    // PORTRAIT
    svgContent += `
      <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="50" fill="${theme.card}" stroke="${theme.line}" stroke-width="2"/>
      ${hasPhoto ? `<rect x="122" y="237" width="836" height="476" rx="30" fill="${theme.photoBg}"/>` : ""}
      <line x1="164" y1="1138" x2="916" y2="1138" stroke="${theme.line}" stroke-width="1.5"/>
      <circle cx="454" cy="1254" r="8" fill="${theme.glow2}"/>
      <circle cx="481" cy="1254" r="8" fill="${theme.textAccent}"/>
    `;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}
