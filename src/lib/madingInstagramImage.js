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
    if (length <= 100) return { fontSize: 34, lineHeight: 50, maxChars: 50, maxLines: 6 };
    if (length <= 200) return { fontSize: 28, lineHeight: 42, maxChars: 60, maxLines: 7 };
    return { fontSize: 24, lineHeight: 36, maxChars: 70, maxLines: 8 };
  }
  if (ratio === "story" || ratio === "9:16") {
    if (length <= 80) return { fontSize: 75, lineHeight: 95, maxChars: 19, maxLines: 12 };
    if (length <= 160) return { fontSize: 60, lineHeight: 80, maxChars: 24, maxLines: 16 };
    if (length <= 300) return { fontSize: 48, lineHeight: 65, maxChars: 30, maxLines: 20 };
    return { fontSize: 36, lineHeight: 52, maxChars: 40, maxLines: 25 };
  }
  // PORTRAIT DEFAULT 4:5
  if (length <= 60) return { fontSize: 100, lineHeight: 115, maxChars: 14, maxLines: 6 };
  if (length <= 120) return { fontSize: 80, lineHeight: 95, maxChars: 18, maxLines: 9 };
  if (length <= 200) return { fontSize: 65, lineHeight: 82, maxChars: 22, maxLines: 12 };
  if (length <= 350) return { fontSize: 50, lineHeight: 65, maxChars: 28, maxLines: 15 };
  return { fontSize: 40, lineHeight: 54, maxChars: 36, maxLines: 20 };
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
// New Clean Minimalist Theme (Reference Style)
const THEMES = [
  {
    bg: "#FFFFFF", card: "#FFFFFF",
    glow1: "#FFFFFF", glow2: "#FFFFFF",
    textPrimary: "#111111", textSecondary: "#444444", textAccent: "#000000",
    line: "#000000", photoBg: "#F3F4F6"
  }
];

function getTheme(postId) {
  return THEMES[0]; // Always use the clean minimalist theme
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
        text: "JUAL BELI USU POLMED",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 24,
        color: theme.textAccent,
        width: 600,
        left: 60,
        top: 60,
        align: "left",
      }),
      pangoTextLayer({
        text: "Mading & Menfess Kampus",
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 18,
        color: theme.textSecondary,
        width: 600,
        left: 60,
        top: 95,
        align: "left",
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
          width: 1080,
          left: 60,
          top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
          align: "left",
        }),
      );
    });

    layers.push(
      pangoTextLayer({
        text: "@usu.zonafess",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 20,
        color: theme.textSecondary,
        width: 400,
        left: 60,
        top: 615,
        align: "left",
      }),
      pangoTextLayer({
        text: "save dulu, baca nanti",
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 20,
        color: theme.textSecondary,
        width: 400,
        left: 700,
        top: 615,
        align: "right",
      }),
    );
    return layers;
  }

  if (isStory) {
    const layers = [
      pangoTextLayer({
        text: "JUAL BELI USU POLMED",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 32,
        color: theme.textAccent,
        width: 800,
        left: 80,
        top: 140,
        align: "left",
      }),
      pangoTextLayer({
        text: "Mading & Menfess Kampus",
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 24,
        color: theme.textSecondary,
        width: 800,
        left: 80,
        top: 185,
        align: "left",
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
          width: 920,
          left: 80,
          top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
          align: "left",
        }),
      );
    });

    layers.push(
      pangoTextLayer({
        text: "@usu.zonafess",
        fontPath: semiboldFontPath,
        fontName: "Plus Jakarta Sans SemiBold",
        fontSize: 28,
        color: theme.textSecondary,
        width: 400,
        left: 80,
        top: 1735,
        align: "left",
      }),
      pangoTextLayer({
        text: "save dulu, baca nanti",
        fontPath: regularFontPath,
        fontName: "Plus Jakarta Sans",
        fontSize: 28,
        color: theme.textSecondary,
        width: 400,
        left: 550,
        top: 1735,
        align: "right",
      }),
    );
    return layers;
  }

  // PORTRAIT DEFAULT 4:5
  const layers = [
    pangoTextLayer({
      text: "JUAL BELI USU POLMED",
      fontPath: semiboldFontPath,
      fontName: "Plus Jakarta Sans SemiBold",
      fontSize: 22,
      color: theme.textAccent,
      width: 800,
      left: 80,
      top: 80,
      align: "left",
    }),
    pangoTextLayer({
      text: "Mading & Menfess Kampus",
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 22,
      color: theme.textSecondary,
      width: 800,
      left: 80,
      top: 110,
      align: "left",
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
        width: 920,
        left: 80,
        top: Math.round(pageData.firstLineY + index * layout.lineHeight - layout.fontSize),
        align: "left", // Reference has left-aligned text!
      }),
    );
  });

  layers.push(
    pangoTextLayer({
      text: "@usu.zonafess",
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 24,
      color: theme.textSecondary,
      width: 400,
      left: 80,
      top: 1230,
      align: "left",
    }),
    pangoTextLayer({
      text: "save dulu, baca nanti",
      fontPath: regularFontPath,
      fontName: "Plus Jakarta Sans",
      fontSize: 24,
      color: theme.textSecondary,
      width: 400,
      left: 560,
      top: 1230,
      align: "right",
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

  // Minimalist clean background
  let svgContent = `
    <rect width="${width}" height="${height}" fill="${theme.bg}"/>
  `;

  // Draw Lines and Bookmark
  if (isLandscape) {
    svgContent += `
      <line x1="60" y1="140" x2="1140" y2="140" stroke="${theme.line}" stroke-width="2"/>
      <line x1="60" y1="590" x2="1140" y2="590" stroke="${theme.line}" stroke-width="2"/>
      <path d="M 1120 640 L 1120 610 C 1120 606 1124 602 1128 602 L 1140 602 C 1144 602 1148 606 1148 610 L 1148 640 L 1134 632 Z" fill="none" stroke="${theme.line}" stroke-width="2.5" stroke-linejoin="round"/>
    `;
  } else if (isStory) {
    svgContent += `
      <line x1="80" y1="240" x2="1000" y2="240" stroke="${theme.line}" stroke-width="3"/>
      <line x1="80" y1="1700" x2="1000" y2="1700" stroke="${theme.line}" stroke-width="3"/>
      <path d="M 975 1770 L 975 1735 C 975 1730 980 1725 985 1725 L 1000 1725 C 1005 1725 1010 1730 1010 1735 L 1010 1770 L 992.5 1760 Z" fill="none" stroke="${theme.line}" stroke-width="3" stroke-linejoin="round"/>
    `;
  } else {
    // PORTRAIT
    svgContent += `
      <line x1="80" y1="150" x2="1000" y2="150" stroke="${theme.line}" stroke-width="3"/>
      <line x1="80" y1="1200" x2="1000" y2="1200" stroke="${theme.line}" stroke-width="3"/>
      <path d="M 970 1260 L 970 1225 C 970 1220 975 1215 980 1215 L 995 1215 C 1000 1215 1005 1220 1005 1225 L 1005 1260 L 987.5 1248 Z" fill="none" stroke="${theme.line}" stroke-width="3" stroke-linejoin="round"/>
    `;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
}
