import { PDFParse } from "pdf-parse";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// pdfjs-dist — lazy-loaded to avoid top-level worker initialization issues.
// We use a dynamic import inside extractTextFromPDF so the module is only
// loaded when needed and GlobalWorkerOptions can be set before first use.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TAXONOMY
// 8 canonical section types. All heading detection normalizes to these keys.
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  personal:       "Kişisel Bilgiler",
  summary:        "Özet",
  experience:     "Deneyimler",
  education:      "Eğitim",
  skills:         "Yetenekler",
  projects:       "Projeler",
  certifications: "Sertifikalar",
  languages:      "Diller",
  publications:   "Yayınlar & Patentler",
  references:     "Referanslar",
};

// Only TR and EN are supported — no other language needed.

/**
 * Turkish heading variants (ASCII-normalised, no diacritics).
 * 8-10 most common forms per section — not exhaustive, pragmatic.
 */
const HEADINGS_TR: Record<string, string[]> = {
  personal: [
    "kisisel bilgiler", "kisisel", "iletisim", "iletisim bilgileri",
    "iletisim & kisisel", "iletisim ve kisisel", "kisisel bilgiler & iletisim",
  ],
  summary: [
    "hakkimda", "ozet", "profil", "kisisel ozet", "kariyer hedefi",
    "kariyer ozeti", "ben kimim", "kisisel profil", "kisisel nitelikler",
    "profesyonel ozet", "hakknmda", "ozet bilgi", "genel ozet", "profil ozeti",
  ],
  experience: [
    "deneyim", "is deneyimi", "is deneyimleri", "calisma gecmisi",
    "profesyonel deneyim", "kariyer gecmisi", "is tecrubesi", "tecrubeler",
    "tecrube", "staj", "stajlar", "is gecmisi", "mesleki deneyim",
    "deneyimler", "nn deneynmn", "deneynmn", "nn deneyim",
    "kronolojik deneyim", "kronolojik is gecmisi", "is kronolojisi",
    "calisma takvimi", "pozisyonlar",
  ],
  education: [
    "egitim", "ogrenim", "egitim bilgileri", "egitim gecmisi",
    "akademik gecmis", "okullar", "universite", "lisans",
    "yuksek lisans", "doktora", "enntnm", "egntnm",
    "egitim & akademik", "akademik", "egitim ve akademik", "akademik bilgiler",
  ],
  skills: [
    "yetenekler", "beceriler", "teknik beceriler", "teknik yetenekler",
    "uzmanlik alanlari", "teknolojiler", "diller & teknolojiler",
    "araclar", "yetenekler & araclar", "bilgisayar becerileri",
    "yetkinlik grafikleri", "yetkinlikler", "teknik yetkinlikler",
    "skill grafikleri", "beceriler & araclar", "yetkinlik alanlari",
    "yetkinlikler (barlar)", "teknik beceri grafikleri",
    "yetkinlik matrisi", "teknik adaptasyon", "beceri matrisi", "yetenek matrisi",
  ],
  projects: [
    "projeler", "projelerim", "proje deneyimi", "kisisel projeler",
    "akademik projeler", "portfolyo", "gelistirilen projeler",
    "proje gecmisi",
  ],
  certifications: [
    "sertifikalar", "sertifikalarim", "sertifikasyonlar", "belgeler",
    "kurslar", "seminerler", "sertifika & kurslar", "egitim ve sertifikalar",
    "sertnfnkalar", "sertnfnkalarim",
  ],
  languages: [
    "diller", "yabanci dil", "yabanci diller", "dil bilgisi",
    "konustugu diller", "dnller", "dnllerim",
    "dil seviyeleri", "yabanci diller (yildizlar)", "dil yetkinligi",
    "dil bilgisi & seviyeler", "yabanci dil seviyeleri", "dil & seviye",
    "yabancidiller",
  ],
  publications: [
    "yayinlar", "yayinlarim", "patentler", "yayinlar & patentler",
    "yayinlar ve patentler", "akademik yayinlar", "patentlerim",
    "eserler", "bilimsel yayinlar",
  ],
  references: [
    "referanslar", "referans", "is referanslari",
  ],
};

/**
 * English heading variants (lowercase).
 */
const HEADINGS_EN: Record<string, string[]> = {
  personal: [
    "personal info", "personal information", "contact", "contact information",
    "contact info", "personal details", "personal",
  ],
  summary: [
    "about", "about me", "summary", "profile", "objective",
    "career objective", "professional summary", "overview",
    "introduction", "executive summary", "personal summary",
  ],
  experience: [
    "experience", "work experience", "employment", "employment history",
    "professional experience", "career history", "work history", "internships",
    "chronological experience", "work chronology",
  ],
  education: [
    "education", "academic background", "academic history",
    "educational background", "qualifications", "university",
    "degrees", "educational qualifications", "education & academic",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "expertise",
    "technologies", "skills & tools", "key skills",
    "skill charts", "skill bars", "technical competencies",
    "competence matrix", "technical adaptation", "skills matrix",
  ],
  projects: [
    "projects", "project experience", "personal projects",
    "academic projects", "portfolio", "selected projects",
    "recent projects", "project history",
  ],
  certifications: [
    "certifications", "certificates", "licenses", "credentials",
    "completed courses", "professional training", "trainings",
  ],
  languages: [
    "languages", "language skills", "languages spoken",
    "language levels", "foreign languages", "language proficiency",
  ],
  publications: [
    "publications", "patents", "publications & patents",
    "publications and patents", "academic publications", "scientific publications",
    "selected publications",
  ],
  references: [
    "references", "reference", "referees",
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// SKILL DICTIONARY
// ─────────────────────────────────────────────────────────────────────────────

export const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Node.js", "React", "Vue", "Angular", "Python",
  "Java", "C++", "C#", "Go", "Rust", "SQL", "PostgreSQL", "MongoDB",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "HTML", "CSS", "Git",
  "Tailwind", "Next.js", "Express", "Prisma", "Supabase", "REST API",
];

const SKILL_NORM_MAP: Record<string, string> = {
  "reactjs":      "React",
  "react.js":     "React",
  "react-js":     "React",
  "react native": "React Native",
  "reactnative":  "React Native",
  "nodejs":       "Node.js",
  "node.js":      "Node.js",
  "expressjs":    "Express",
  "express.js":   "Express",
  "javascript":   "JavaScript",
  "typescript":   "TypeScript",
  "postgresql":   "PostgreSQL",
  "postgres":     "PostgreSQL",
  "mongodb":      "MongoDB",
  "nextjs":       "Next.js",
  "next.js":      "Next.js",
  "tailwind css": "Tailwind",
  "tailwindcss":  "Tailwind",
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL COMPILED REGEXES
// Built once at import time — zero per-call re-compilation cost.
// ─────────────────────────────────────────────────────────────────────────────

// Skill matchers
const SKILL_NORM_REGEXES = Object.entries(SKILL_NORM_MAP).map(([key, value]) => ({
  rx: new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  value,
}));
const COMMON_SKILL_REGEXES = COMMON_SKILLS.map((skill) => {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    rx: new RegExp((/^\w/.test(skill) ? "\\b" : "") + escaped + (/\w$/.test(skill) ? "\\b" : ""), "i"),
    skill,
  };
});

// Boundary detection — sub-chunking signals
/** Signal 1: numeric year range  "2022 – 2024", "2020 - present" */
const RX_NUM_DATE =
  /\b(19|20)\d{2}\s*[-–—]\s*(20\d{2}|günümüz|present|halen|hâlen|devam)\b/i;

/** Signal 2: Turkish month + year range  "Ocak 2022 - Mart 2024" */
const _TR_M = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";
const RX_TR_MONTH = new RegExp(
  `(?:${_TR_M})\\s+(19|20)\\d{2}\\s*[-–—]\\s*(?:(?:${_TR_M})\\s+)?(19|20)\\d{2}|(günümüz|present|halen)`,
  "i"
);

/** Signal 3: "Job Title | Company Name" pipe headline */
const RX_PIPE_HEADLINE = /^[^.!?,;]+\|[^.!?,;]+$/;

/**
 * Signal 4 (projects only): project name line — short, starts with a capital,
 * followed by a dash+capital or a tech stack in parentheses.
 * e.g. "Beacon - AI CV Analiz Sistemi (React, Node.js)"
 *      "E-ticaret Platformu (Next.js, Stripe)"
 */
const RX_PROJECT_TITLE =
  /^[A-ZÇĞİÖŞÜ][^.!?,;]{2,70}(?:\s*[-–—]\s*[A-ZÇĞİÖŞÜa-z]|\s*\([^)]{3,}\))\s*$/;

// Confidence formula helpers
const RX_COMPANY =
  /a\.ş\.|ltd\.|holding|holdingi|şirketi|company|inc\.|corp\./i;

// detectSectionByStructure regexes
const RX_DATE_STRUCT = /\b(19|20)\d{2}\s*[-–—]\s*(20\d{2}|günümüz|present)\b/i;
const RX_EDU_STRUCT  =
  /üniversite|universite|lise|fakülte|lisans|yüksek lisans|bachelor|master|phd|school|college/i;
const RX_EXP_STRUCT  =
  /mühendis|engineer|developer|staj|intern|manager|lead|director|yazılım|geliştirici/i;

// matchHeading helpers
const RX_SENTENCE_END = /[.,;]$/;
const RX_VERB_PAST    =
  /(aldim|yaptim|calistim|mezunum|tamamladim|ogrendim|completed|graduated|worked)/;

// detectLanguage word sets
const RX_TR_WORDS = ["ve", "ile", "icin", "olan", "bir", "olarak", "hakkinda", "egitim", "deneyimi"]
  .map((w) => new RegExp(`\\b${w}\\b`, "g"));
const RX_EN_WORDS = ["and", "with", "for", "the", "a", "as", "about", "education", "experience"]
  .map((w) => new RegExp(`\\b${w}\\b`, "g"));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Normalises a string for heading comparison: lowercase + ASCII-only Turkish. */
function normalizeHeading(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/i̇/g, "i")
    .replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function extractLocalSkills(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const { rx, value } of SKILL_NORM_REGEXES) {
    if (rx.test(lowerText)) found.add(value);
  }
  for (const { rx, skill } of COMMON_SKILL_REGEXES) {
    if (rx.test(lowerText)) found.add(SKILL_NORM_MAP[skill.toLowerCase()] ?? skill);
  }

  return Array.from(found).slice(0, 6);
}

/**
 * Dynamically detects vertical column boundaries on a page using Projection Profile Analysis.
 * Scans vertical projection of character boundaries and finds low-density zones (gutters).
 */
function detectColumns(
  items: { x: number; y: number; text: string }[],
  pageWidth: number,
  pageHeight: number
): number[] {
  const steps = Math.floor(pageWidth);
  const profile = new Array(steps).fill(0);
  const charWidth = 4.0; // conservative character width estimate in points

  // Filter out top 16% (header) and bottom 10% (footer) to get columns profile
  const bodyItems = items.filter((i) => i.y > pageHeight * 0.10 && i.y < pageHeight * 0.84);

  // Project item bounding boxes onto the x-axis
  for (const item of bodyItems) {
    const startX = Math.max(0, Math.floor(item.x));
    const endX = Math.min(steps - 1, Math.floor(item.x + item.text.length * charWidth));
    for (let x = startX; x <= endX; x++) {
      profile[x]++;
    }
  }

  const boundaries: number[] = [];
  const minGutterWidth = 25; // minimum width of vertical empty space to call it a column gap
  const maxIntersects = 1;   // strictly tolerate minor overlaps in body

  let gutterStart = -1;
  for (let x = Math.floor(pageWidth * 0.15); x < Math.floor(pageWidth * 0.85); x++) {
    if (profile[x] <= maxIntersects) {
      if (gutterStart === -1) {
        gutterStart = x;
      }
    } else {
      if (gutterStart !== -1) {
        const gutterWidth = x - gutterStart;
        if (gutterWidth >= minGutterWidth) {
          const boundary = Math.floor((gutterStart + x) / 2);
          // Verify both sides have meaningful text content
          const leftCount = items.filter((i) => i.x < boundary).length;
          const rightCount = items.filter((i) => i.x >= boundary).length;
          
          if (leftCount >= 4 && rightCount >= 4) {
            boundaries.push(boundary);
          }
        }
        gutterStart = -1;
      }
    }
  }

  if (gutterStart !== -1) {
    const endScan = Math.floor(pageWidth * 0.85);
    const gutterWidth = endScan - gutterStart;
    if (gutterWidth >= minGutterWidth) {
      const boundary = Math.floor((gutterStart + endScan) / 2);
      const leftCount = items.filter((i) => i.x < boundary).length;
      const rightCount = items.filter((i) => i.x >= boundary).length;
      if (leftCount >= 4 && rightCount >= 4) {
        boundaries.push(boundary);
      }
    }
  }

  return boundaries.sort((a, b) => a - b);
}

/**
 * Groups pdfjs text items into lines based on y-coordinate proximity.
 * Returns a single string with newline-separated lines.
 */
function groupItemsIntoText(
  items: { x: number; y: number; text: string }[],
  yTolerance = 6
): string {
  if (items.length === 0) return "";

  type Line = { y: number; parts: { x: number; text: string }[] };
  const lines: Line[] = [];

  for (const item of items) {
    const existing = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (existing) {
      existing.parts.push({ x: item.x, text: item.text });
    } else {
      lines.push({ y: item.y, parts: [{ x: item.x, text: item.text }] });
    }
  }

  // Sort lines top-to-bottom
  lines.sort((a, b) => b.y - a.y);

  return lines
    .map((line) => {
      const sorted = line.parts.sort((a, b) => a.x - b.x);
      let mergedText = "";
      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        if (i === 0) {
          mergedText = curr.text;
        } else {
          const prev = sorted[i - 1];
          const prevLength = prev.text.length;
          const charWidthEstimate = 3.6;
          const prevEndPos = prev.x + (prevLength * charWidthEstimate);
          
          if (curr.x - prevEndPos < 2.0) {
            mergedText += curr.text;
          } else {
            mergedText += " " + curr.text;
          }
        }
      }
      return mergedText;
    })
    .filter((l) => l.trim().length > 0)
    .join("\n");
}

/**
 * Extracts raw text from a PDF buffer using pdfjs-dist with coordinate awareness.
 *
 * Strategy:
 * 1. For each page, collect all text items with their (x, y) coordinates.
 * 2. Detect whether the page has a 2-column layout by checking if significant
 *    text mass exists on both sides of the page midpoint.
 * 3. If 2-column: emit left column lines first (top→bottom), then right column
 *    lines — preserving correct reading order for section headings and content.
 * 4. If single column: emit all items sorted top→bottom, left→right.
 * 5. Apply the existing preprocessTwoColumnText post-processor.
 *
 * Falls back to the legacy pdf-parse extractor on any error.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use the legacy build as recommended for Node.js environments
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const uint8 = new Uint8Array(pdfBuffer);
    const loadingTask = (pdfjs as any).getDocument({
      data: uint8,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      disableWorker: true,   // Run in same thread — no separate worker needed
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const textContent = await page.getTextContent();

      // Page boundary cleaning: filter out page numbers, headers, and footers
      const topBoundary = pageHeight * 0.94;
      const bottomBoundary = pageHeight * 0.06;
      
      const allItems: { x: number; y: number; text: string }[] = [];
      for (const item of textContent.items as any[]) {
        if (item.str && item.str.trim()) {
          const x = item.transform[4];
          const y = item.transform[5];
          const txt = item.str.trim();
          
          // Skip typical page numbers/footers at boundaries
          const isAtBoundary = y > topBoundary || y < bottomBoundary;
          const isPageNumPattern = /^(?:page|sayfa)?\s*\d+\s*(?:\/|of|-)?\s*\d*\s*$/i.test(txt) || /^--\s*\d+\s*of\s*\d+\s*--$/i.test(txt);
          if (isAtBoundary && isPageNumPattern) {
            continue;
          }
          
          allItems.push({ x, y, text: item.str });
        }
      }

      if (allItems.length === 0) {
        page.cleanup();
        continue;
      }

      // Group items into lines
      const yTolerance = 6;
      type Line = { y: number; items: { x: number; text: string }[] };
      const lines: Line[] = [];

      for (const item of allItems) {
        const existing = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
        if (existing) {
          existing.items.push({ x: item.x, text: item.text });
        } else {
          lines.push({ y: item.y, items: [{ x: item.x, text: item.text }] });
        }
      }

      // Sort lines top-to-bottom
      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
      }

      // Dynamic Column Detection
      const boundaries = detectColumns(allItems, pageWidth, pageHeight);

      let pageText: string;
      if (boundaries.length > 0) {
        // Multi-column reconstruction with full-width spanning lines (headers/footers) support
        type PageBlock = 
          | { type: "spanning"; text: string }
          | { type: "columns"; cols: { x: number; y: number; text: string }[][] };

        const blocks: PageBlock[] = [];
        let currentCols: { x: number; y: number; text: string }[][] = Array.from({ length: boundaries.length + 1 }, () => []);

        const flushColumns = () => {
          const hasContent = currentCols.some((c) => c.length > 0);
          if (hasContent) {
            blocks.push({ type: "columns", cols: currentCols });
            currentCols = Array.from({ length: boundaries.length + 1 }, () => []);
          }
        };

        const charWidthEstimate = 3.6;

        for (const line of lines) {
          if (line.items.length === 0) continue;

          let isSpanning = false;

          // Check if any single item crosses a column boundary
          for (const item of line.items) {
            const startX = item.x;
            const endX = item.x + item.text.length * charWidthEstimate;
            for (const b of boundaries) {
              if (startX < b - 8 && endX > b + 8) {
                isSpanning = true;
                break;
              }
            }
            if (isSpanning) break;
          }

          // If not spanning, check if there is a gap at boundaries on this line
          if (!isSpanning) {
            for (const b of boundaries) {
              const leftItems = line.items.filter((item) => item.x < b);
              const rightItems = line.items.filter((item) => item.x >= b);
              
              if (leftItems.length > 0 && rightItems.length > 0) {
                const rightmostLeft = leftItems[leftItems.length - 1];
                const leftmostRight = rightItems[0];
                const leftEnd = rightmostLeft.x + rightmostLeft.text.length * charWidthEstimate;
                const rightStart = leftmostRight.x;
                
                const gap = rightStart - leftEnd;
                if (gap < 20) { // Gutter is too small on this line -> treat line as spanning/full-width
                  isSpanning = true;
                  break;
                }
              }
            }
          }

          if (isSpanning) {
            flushColumns();
            const mappedItems = line.items.map(i => ({ x: i.x, y: line.y, text: i.text }));
            blocks.push({ type: "spanning", text: groupItemsIntoText(mappedItems) });
          } else {
            // Split line parts into respective columns
            for (let c = 0; c <= boundaries.length; c++) {
              const prevBound = c === 0 ? 0 : boundaries[c - 1];
              const nextBound = c < boundaries.length ? boundaries[c] : pageWidth;
              
              const colItems = line.items.filter((item) => item.x >= prevBound && item.x < nextBound);
              if (colItems.length > 0) {
                const mappedColItems = colItems.map(i => ({ x: i.x, y: line.y, text: i.text }));
                currentCols[c].push(...mappedColItems);
              }
            }
          }
        }
        flushColumns();

        // Assemble page block text
        const assembledBlocks: string[] = [];
        for (const block of blocks) {
          if (block.type === "spanning") {
            assembledBlocks.push(block.text);
          } else {
            for (let c = 0; c < block.cols.length; c++) {
              const colText = groupItemsIntoText(block.cols[c]);
              if (colText) assembledBlocks.push(colText);
            }
          }
        }
        pageText = assembledBlocks.join("\n");
        console.log(`[PDF] Page ${pageNum}: Block reconstructed multi-column (Columns: ${boundaries.length + 1}, boundaries: ${boundaries.join(", ")})`);
      } else {
        pageText = groupItemsIntoText(allItems);
      }

      page.cleanup();
      if (pageText.trim()) pageTexts.push(pageText.trim());
    }

    return preprocessTwoColumnText(pageTexts.join("\n\n"));

  } catch (err) {
    console.warn("[PDF] pdfjs-dist extraction failed, falling back to pdf-parse:", (err as Error).message);

    // Legacy fallback
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const result = await parser.getText();
      return preprocessTwoColumnText(result.text || "");
    } finally {
      await parser.destroy();
    }
  }
}


/** Detects whether resume text is primarily Turkish or English. */
export function detectLanguage(text: string): "tr" | "en" {
  const lower = text.toLowerCase();
  let trCount = 0;
  let enCount = 0;
  for (const rx of RX_TR_WORDS) { rx.lastIndex = 0; trCount += (lower.match(rx) || []).length; }
  for (const rx of RX_EN_WORDS) { rx.lastIndex = 0; enCount += (lower.match(rx) || []).length; }
  return trCount >= enCount ? "tr" : "en";
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADING DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Structural fallback: guess section from content patterns (dates, edu/exp keywords). */
function detectSectionByStructure(line: string): string | null {
  const hasDate = RX_DATE_STRUCT.test(line);

  if (RX_EDU_STRUCT.test(line) && (hasDate || /mezun|öğrenci|ogrenci/i.test(line))) {
    return "education";
  }
  if ((RX_EXP_STRUCT.test(line) || RX_COMPANY.test(line)) && hasDate) {
    return "experience";
  }
  return null;
}

/**
 * Matches a single line against the heading dictionary.
 * Returns { sectionKey, confidence, source } or null if not a heading.
 *
 * Confidence:
 *   0.98 — exact dictionary hit
 *   0.85 — word-boundary regex hit
 *   0.75 — structural pattern guess
 */
function matchHeading(
  line: string,
  lang: "tr" | "en"
): { sectionKey: string; confidence: number; source: "RULE" | "STRUCTURAL" } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return null;

  const clean = trimmed.replace(/:$/, "").replace(/^[\[(]|[\])]$/g, "").trim();
  if (!clean || RX_SENTENCE_END.test(clean)) return null;

  const norm = normalizeHeading(clean);
  if (norm.split(/\s+/).length > 4) return null;

  // 1. Exact match across both Turkish and English heading lists
  const allHeadingsList = [HEADINGS_TR, HEADINGS_EN];
  
  for (const headings of allHeadingsList) {
    for (const [key, list] of Object.entries(headings)) {
      if (
        list.includes(norm) ||
        list.some((h) => [`${h}ler`, `${h}lar`, `${h}leri`, `${h}lari`].includes(norm))
      ) {
        return { sectionKey: key, confidence: 0.98, source: "RULE" };
      }
    }
  }

  // 2. Word-boundary regex match across both dictionaries
  for (const headings of allHeadingsList) {
    for (const [key, list] of Object.entries(headings)) {
      for (const phrase of list) {
        if (new RegExp(`(^|\\s)${phrase}(\\s|$)`, "i").test(norm) && !RX_VERB_PAST.test(norm)) {
          return { sectionKey: key, confidence: 0.85, source: "RULE" };
        }
      }
    }
  }

  // 3. Structural guess
  const structKey = detectSectionByStructure(line);
  if (structKey) {
    return { sectionKey: structKey, confidence: 0.75, source: "STRUCTURAL" };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE FORMULA
// User spec: +0.4 (heading found) + 0.3 (≥20 words) + 0.3 (date/company signal)
// ─────────────────────────────────────────────────────────────────────────────

function computeConfidence(
  headingSource: "RULE" | "STRUCTURAL" | "DEFAULT",
  content: string,
  sectionKey?: string
): number {
  // If it's a list-based section (skills, languages, certs) and heading was found via RULE,
  // return high confidence directly to avoid false low-confidence scores on short lists.
  if (headingSource === "RULE" && sectionKey && ["skills", "languages", "certifications", "publications"].includes(sectionKey)) {
    return 0.95;
  }

  // Heading contribution
  const headingContrib =
    headingSource === "RULE"       ? 0.40 :
    headingSource === "STRUCTURAL" ? 0.25 :
    /* DEFAULT */                    0.10;

  // Content quantity (+0.3 if ≥20 words, +0.15 if ≥10)
  const wc = content.split(/\s+/).filter(Boolean).length;
  const contentContrib = wc >= 20 ? 0.30 : wc >= 10 ? 0.15 : 0;

  // Signal presence: date range OR company keyword in content (+0.3)
  const hasSignal =
    RX_NUM_DATE.test(content) ||
    RX_TR_MONTH.test(content) ||
    RX_COMPANY.test(content);
  const signalContrib = hasSignal ? 0.30 : 0;

  return Math.min(1.0, Math.round((headingContrib + contentContrib + signalContrib) * 100) / 100);
}

/**
 * Normalizes star characters — currently a no-op (disabled by design).
 */
function normalizeStars(text: string): string {
  return text;
}

/**
 * Normalizes unicode block bar characters (e.g. ████████░░) to percentage text.
 * e.g. "Python (LLM) ████████░░" → "Python (LLM) (%80)"
 */
function normalizeSkillBar(text: string): string {
  // Match label followed by block/shade chars (at least 3 chars)
  return text.replace(
    /([^\n]*?)([▀-▟█-▏░-▓█▉▊▋▌▍▎▏▐░▒▓▔▕■□▪▫◾◽⬛⬜⬢⬡●○\|█\u2589\u258a\u258b\u258c\u258d\u258e\u258f]{3,})/g,
    (_match, label, bars) => {
      const filled = (bars.match(/[█▉▊▋▌▍▎▏|]/g) || []).length;
      const total  = bars.replace(/\s/g, "").length;
      if (total === 0) return label;
      const pct = Math.round((filled / total) * 100);
      return `${label}(%${pct})`;
    }
  );
}

/**
 * Pre-processes raw PDF text to handle two-column layouts.
 *
 * Two-column PDFs often produce lines where left-column and right-column
 * content are merged on the same line, separated by multiple spaces.
 * This function detects such merged heading lines and splits them into
 * separate lines so the heading detector can process them correctly.
 *
 * Also strips emoji characters that block heading matching.
 */
function preprocessTwoColumnText(text: string): string {
  const lines = text.split("\n");
  const processed: string[] = [];

  // Emoji regex (broad — covers most common emoji ranges)
  const emojiRx = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}]/gu;

  // Regex to detect "floating" bar percentage lines like:
  // "%95 (Uzman)", "%90 (İleri Seviye)", "(%80)", "(80%)"
  const barPctRx = /^%?\d{1,3}(?:\s*\([\w\s\u00c0-\u017e-]+\))?$|^\(\s*%?\d{1,3}\s*\)$/;

  // Collect all stripped lines first for lookahead
  const strippedLines: string[] = [];
  for (const line of lines) {
    const stripped = line
      .replace(/^[\s]*[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}]+\s*/gu, "")
      .replace(emojiRx, "")
      .trim();
    strippedLines.push(stripped);
  }

  // ── Pass 1: detect orphaned bar-pct lines and pair with following skill name ─
  // Pattern: several consecutive barPct lines followed by the same number of skill names.
  // We buffer them and reconstruct as "SkillName: %XX (Level)" pairs.
  const paired: string[] = [];
  let i = 0;
  while (i < strippedLines.length) {
    const line = strippedLines[i];

    if (barPctRx.test(line)) {
      // Collect consecutive bar-pct lines
      const barLines: string[] = [line];
      let j = i + 1;
      while (j < strippedLines.length && barPctRx.test(strippedLines[j])) {
        barLines.push(strippedLines[j]);
        j++;
      }

      // After bar lines, skip empty/emoji-only lines and collect any
      // ALL_CAPS headings to re-emit them later (they separate bar values from labels)
      const skippedHeadings: string[] = [];
      while (j < strippedLines.length) {
        const sl = strippedLines[j].replace(emojiRx, "").trim();
        if (sl === "") { j++; continue; }
        // ALL_CAPS heading between bars and labels — save to emit, skip for pairing
        const isHeading = sl === sl.toUpperCase() && sl.length > 3 && sl.length <= 55
          && !/^%?\d/.test(sl);
        if (isHeading) { skippedHeadings.push(strippedLines[j]); j++; continue; }
        break;
      }

      // Collect subsequent non-bar, non-heading skill label lines
      const labelLines: string[] = [];
      let k = j;
      while (
        k < strippedLines.length &&
        labelLines.length < barLines.length &&
        !barPctRx.test(strippedLines[k]) &&
        strippedLines[k].length > 0 &&
        strippedLines[k].length < 80
      ) {
        const sl = strippedLines[k].toUpperCase();
        // If we hit another ALL_CAPS heading, stop
        if (sl === strippedLines[k] && strippedLines[k].length > 3 && strippedLines[k].length <= 55) break;
        labelLines.push(strippedLines[k]);
        k++;
      }


      if (labelLines.length === barLines.length) {
        // Emit the section heading(s) that were between bars and labels
        for (const h of skippedHeadings) paired.push(h);
        // Perfect pairing — emit as "Label: %pct" lines
        for (let m = 0; m < barLines.length; m++) {
          paired.push(`${labelLines[m]}: ${barLines[m]}`);
        }
        i = k; // skip all consumed lines
        continue;
      } else {
        // Could not pair — emit headings and bar lines as-is
        for (const h of skippedHeadings) paired.push(h);
        for (const b of barLines) paired.push(b);
        i = j;
        continue;
      }
    }

    paired.push(line);
    i++;
  }

  // ── Pass 2: two-column heading detection ─────────────────────────────────────
  for (const line of paired) {
    const segments = line.split(/\s{4,}/);
    if (segments.length >= 2) {
      const headingLike = segments.filter((s) => {
        const t = s.trim();
        if (t.length === 0 || t.length > 60) return false;
        const norm = t.replace(emojiRx, "").trim();
        return (
          norm.length > 2 &&
          (norm === norm.toUpperCase() || /^[A-ZÇĞİÖŞÜ][a-zA-ZçğışöüÇĞİÖŞÜ\s&()]+$/.test(norm))
        );
      });
      if (headingLike.length >= 2) {
        for (const seg of segments) {
          const t = seg.trim();
          if (t) processed.push(t);
        }
        continue;
      }
    }
    processed.push(line);
  }

  return processed.join("\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE CHUNK SPLITTING (sentence-boundary sliding window)
// ─────────────────────────────────────────────────────────────────────────────

function splitTextSlidingWindow(text: string, maxWords = 300, overlap = 50): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 1) {

    const chunks: string[] = [];
    const step = maxWords - overlap;
    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + maxWords);
      if (slice.length > 0) chunks.push(slice.join(" "));
      if (i + maxWords >= words.length) break;
    }
    return chunks;
  }

  const chunks: string[] = [];
  let cur: string[] = [];
  let curWC = 0;

  for (const sent of sentences) {
    const wc = sent.split(/\s+/).filter((w) => w.length > 0).length;
    if (wc === 0) continue;

    if (curWC > 0 && curWC + wc > maxWords) {
      chunks.push(cur.join(" "));
      const overlap_: string[] = [];
      let ow = 0;
      for (let j = cur.length - 1; j >= 0; j--) {
        const w = cur[j].split(/\s+/).filter((w) => w.length > 0).length;
        if (ow + w > overlap) break;
        overlap_.unshift(cur[j]);
        ow += w;
      }
      cur = overlap_;
      curWC = ow;
    }

    cur.push(sent);
    curWC += wc;
  }

  if (cur.length > 0) chunks.push(cur.join(" "));
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC SUB-CHUNKING
// Splits Experience, Education, Projects into individual entry chunks.
// All regexes pre-compiled at module level.
// ─────────────────────────────────────────────────────────────────────────────

type SubChunk = { text: string; confidence: number; source: "RULE" | "STRUCTURAL" };

function subChunkSection(
  sectionKey: string,
  lines: string[],
  parentSource: "RULE" | "STRUCTURAL",
  sectionConfidence: number
): SubChunk[] {
  const SUB_CHUNK_SECTIONS = new Set(["experience", "education", "projects"]);
  if (!SUB_CHUNK_SECTIONS.has(sectionKey)) {
    return [{ text: lines.join("\n"), confidence: sectionConfidence, source: parentSource }];
  }

  const MAX_LEN = 120;

  const isBoundary = (t: string): boolean => {
    if (!t || t.length > MAX_LEN) return false;
    if (t.startsWith("•") || t.startsWith("-") || t.startsWith("*")) return false;

    // Signals 1 & 2: date ranges (experience + projects)
    if (RX_NUM_DATE.test(t) || RX_TR_MONTH.test(t)) return true;
    // Signal 3: pipe headline  "Title | Company" (experience + projects)
    if (RX_PIPE_HEADLINE.test(t)) return true;
    // Signal 4 (projects only): project title with dash or tech stack in parens
    if (sectionKey === "projects" && RX_PROJECT_TITLE.test(t)) return true;

    return false;
  };

  // ── Pass 1: split into raw entry blocks ─────────────────────────────────
  const raw: SubChunk[] = [];
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join("\n").trim();
    if (content) {
      // Each sub-chunk re-evaluates its own confidence signals
      const subConf = computeConfidence("STRUCTURAL", content, sectionKey);
      raw.push({ text: content, confidence: subConf, source: "STRUCTURAL" });
    }
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isBoundary(trimmed)) {
      // Look-back: identify and move the preceding 1-2 short lines (title, company) to the new chunk
      const poppedLines: string[] = [];
      while (buf.length > 0 && poppedLines.length < 2) {
        const lastLine = buf[buf.length - 1].trim();
        const isList = lastLine.startsWith("•") || lastLine.startsWith("-") || lastLine.startsWith("*");
        const isLongText = lastLine.split(/\s+/).length > 10;
        
        // Stop look-back if we hit a list bullet, long description paragraph, or empty line
        if (isList || isLongText || lastLine === "") {
          break;
        }
        poppedLines.unshift(buf.pop()!);
      }

      flush();
      buf = [...poppedLines, line];
    } else {
      buf.push(line);
    }
  }
  flush();
  // ─────────────────────────────────────────────────────────────────────────

  // ── Pass 2: merge orphan title-only blocks (< MIN_STANDALONE_WORDS) ─────
  const MIN_STANDALONE_WORDS = 15;
  const merged: SubChunk[] = [];

  for (let i = 0; i < raw.length; i++) {
    const wc = raw[i].text.split(/\s+/).filter(Boolean).length;
    if (wc < MIN_STANDALONE_WORDS && i + 1 < raw.length) {
      raw[i + 1] = { ...raw[i + 1], text: raw[i].text + "\n" + raw[i + 1].text };
    } else {
      merged.push(raw[i]);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (merged.length === 0) {
    return [{ text: lines.join("\n"), confidence: sectionConfidence, source: parentSource }];
  }

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum confidence below which per-section AI reclassification is triggered. */
const AI_FALLBACK_THRESHOLD = 0.75;

/**
 * Runs the local rule-based heading dictionary parser.
 * This is the first pass — fast, synchronous regex and word matching.
 */
async function runLocalRuleBasedParser(
  text: string,
  lang: "tr" | "en"
): Promise<{ chunkText: string; metadata: any }[]> {
  const lines = text.split("\n");
  const parsedChunks: { chunkText: string; metadata: any }[] = [];

  let currentSectionKey     = "personal";
  let currentSectionLabel   = "Kişisel Bilgiler";
  let currentSectionLines: string[] = [];
  let currentSectionSource: "RULE" | "STRUCTURAL" | "DEFAULT" = "DEFAULT";
  let sectionOrder = 1;

  const saveCurrentSection = async () => {
    if (currentSectionLines.length === 0) return;
    const content = currentSectionLines.join("\n").trim();
    if (!content) return;

    const sectionConf = computeConfidence(currentSectionSource, content, currentSectionKey);

    let resolvedKey   = currentSectionKey;
    let resolvedLabel = currentSectionLabel;

    if (sectionConf < AI_FALLBACK_THRESHOLD && currentSectionSource !== "RULE") {
      const aiKey = await classifySectionWithAI(content, currentSectionKey, lang);
      if (aiKey !== currentSectionKey) {
        console.log(`[Parser] AI reclassified "${currentSectionLabel}" → "${SECTION_LABELS[aiKey] ?? aiKey}" (conf was ${sectionConf})`);
        resolvedKey   = aiKey;
        resolvedLabel = SECTION_LABELS[aiKey] ?? aiKey;
      }
    }

    const subSections = subChunkSection(
      resolvedKey,
      currentSectionLines,
      currentSectionSource === "DEFAULT" ? "RULE" : currentSectionSource,
      sectionConf
    );

    for (const sub of subSections) {
      const wordChunks = splitTextSlidingWindow(sub.text, 300, 50);
      wordChunks.forEach((wc_text, idx) => {
        const suffix    = wordChunks.length > 1 ? ` (Kısım ${idx + 1})` : "";
        const wordCount = wc_text.split(/\s+/).filter((w) => w.length > 0).length;
        const normalized_wc = normalizeStars(wc_text);
        const fullText  = `[${resolvedLabel.toUpperCase()}${suffix}]\n${normalized_wc}`;
        const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");

        parsedChunks.push({
          chunkText: fullText,
          metadata: {
            section:       resolvedLabel,
            source:        sub.source,
            language:      lang,
            order:         sectionOrder++,
            wordCount,
            confidence:    sub.confidence,
            aiFallback:    sectionConf < AI_FALLBACK_THRESHOLD,
            createdAt:     new Date().toISOString(),
            parserVersion: "v2.3",
            chunkHash,
          },
        });
      });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    const matched = matchHeading(line, lang);

    if (matched) {
      await saveCurrentSection();
      currentSectionKey    = matched.sectionKey;
      currentSectionLabel  = SECTION_LABELS[matched.sectionKey] ?? matched.sectionKey;
      currentSectionSource = matched.source;
      currentSectionLines  = [];
    } else {
      currentSectionLines.push(rawLine);
    }
  }

  await saveCurrentSection();

  return parsedChunks;
}

/**
 * Splits a resume text into semantic chunks with section metadata.
 * Hybrid Pipeline:
 *   1. Try local rule-based parsing.
 *   2. If confidence is low (< 0.70) or too few unique sections are found (< 3)
 *      meaning layout is scrambled/irregular, fall back to Macro AI Segmentation (gpt-4o-mini).
 *   3. Run local sub-chunking & sliding-window on segmented blocks.
 */
export async function chunkTextBySections(text: string): Promise<{ chunkText: string; metadata: any }[]> {
  if (!text || text.trim() === "") return [];

  const lang = detectLanguage(text);

  // ── 1. First Pass: Local Rule-Based Dictionary ───────────────────────────
  const localChunks = await runLocalRuleBasedParser(text, lang);

  const uniqueSections = new Set(localChunks.map(c => c.metadata.section));
  const avgConfidence = localChunks.length > 0
    ? localChunks.reduce((sum, c) => sum + c.metadata.confidence, 0) / localChunks.length
    : 0;

  console.log(`[Parser] Rule-based parser produced ${localChunks.length} chunks. avgConfidence: ${avgConfidence.toFixed(2)}, uniqueSections: ${uniqueSections.size}`);

  // ── 2. Evaluation: Trigger Macro AI Fallback if needed ───────────────────
  const needsAISegmentation =
    localChunks.length === 0 ||
    avgConfidence < 0.75 ||
    uniqueSections.size < 3;

  const apiKey = process.env.OPENAI_API_KEY;

  if (needsAISegmentation && apiKey) {
    console.log(`[Parser] ⚡ Triggering Macro AI Segmentation Fallback (avgConf: ${avgConfidence.toFixed(2)}, sections: ${uniqueSections.size})`);
    const aiSections = await segmentCvWithAI(text, lang);

    if (aiSections.length > 0) {
      // Merge duplicate section keys to avoid multiple duplicate heading blocks
      // Do NOT merge skills, languages or publications blocks so they can remain separate
      const mergedSections: typeof aiSections = [];
      for (const section of aiSections) {
        const existing = mergedSections.find(
          s => s.sectionKey === section.sectionKey && 
               !["skills", "languages", "publications"].includes(s.sectionKey) && 
               (s.sectionKey !== "other" || s.customName === section.customName)
        );
        if (existing) {
          existing.text += "\n\n" + section.text;
        } else {
          mergedSections.push({ ...section });
        }
      }

      const aiChunks: { chunkText: string; metadata: any }[] = [];
      let sectionOrder = 1;

      for (const section of mergedSections) {
        const sectionLabel = section.sectionKey === "other" && section.customName
          ? section.customName
          : (SECTION_LABELS[section.sectionKey] ?? section.sectionKey);

        // ── Local Semantic Sub-chunking (experience/projects split) ─────────
        const subSections = subChunkSection(
          section.sectionKey,
          section.text.split("\n"),
          "STRUCTURAL",
          0.95 // Base high confidence for OpenAI-verified segment
        );

        for (const sub of subSections) {
          // ── Local Adaptive Sizing (sliding window) ───────────────────────
          const wordChunks = splitTextSlidingWindow(sub.text, 300, 50);
          wordChunks.forEach((wc_text, idx) => {
            const suffix    = wordChunks.length > 1 ? ` (Kısım ${idx + 1})` : "";
            const wordCount = wc_text.split(/\s+/).filter((w) => w.length > 0).length;
            const normalized_wc = normalizeStars(wc_text);
            const fullText  = `[${sectionLabel.toUpperCase()}${suffix}]\n${normalized_wc}`;
            const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");

            aiChunks.push({
              chunkText: fullText,
              metadata: {
                section:       sectionLabel,
                source:        "AI",
                language:      lang,
                order:         sectionOrder++,
                wordCount,
                confidence:    0.95,
                aiFallback:    true,
                createdAt:     new Date().toISOString(),
                parserVersion: "v3.0",
                chunkHash,
              },
            });
          });
        }
      }

      console.log(`[Parser] ✅ Macro AI Segmentation successful! Produced ${aiChunks.length} chunks.`);
      return aiChunks;
    }

    console.warn(`[Parser] AI segmentation returned empty, falling back to local rule-based chunks.`);
  }

  return localChunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — OpenAI gpt-4o-mini
//
// Three separate responsibilities:
//   1. segmentCvWithAI        — macro-segmentation: split entire CV text into sections
//   2. classifySectionWithAI  — micro-segmentation: reclassify a single low-confidence section
//   3. analyzeWithOpenAI      — full CV: produce ATS score, skills, strengths, etc.
// ─────────────────────────────────────────────────────────────────────────────

const OPENAI_SECTION_KEYS = Object.keys(SECTION_LABELS).join(" | ");

/**
 * Macro-segmentation: splits the entire CV text into section blocks using gpt-4o-mini.
 * Bypasses reading order scrambling and custom layout issues.
 */
export async function segmentCvWithAI(
  text: string,
  lang: "tr" | "en"
): Promise<{ sectionKey: string; customName?: string; text: string }[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Segment] No OPENAI_API_KEY — skipping AI segmentation.");
    return [];
  }

  try {
    const prompt = [
      `You are an expert CV parser. Segment the following raw CV text into logical sections.`,
      `The standard section keys are:`,
      Object.keys(SECTION_LABELS).map(k => `  - "${k}" (${SECTION_LABELS[k]})`).join("\n"),
      ``,
      `Rules:`,
      `1. Return a JSON object with a single key "sections" which is an array of objects.`,
      `2. Only extract sections that actually exist in the text. Do not invent missing sections.`,
      `3. For each section, if it fits one of the standard keys listed above, set "sectionKey" to that key.`,
      `4. If a section is custom/unrecognized (e.g., "Hobiler", "Askerlik", "Yayınlar", "Sosyal Faaliyetler"), set "sectionKey" to "other" and provide the actual heading title in "customName" (e.g., "Sosyal Sorumluluk Projeleri").`,
      `5. Put all text of the CV into the most appropriate sections. Do not miss any text.`,
      `6. CRITICAL: The contact details, email, phone, name, and links at the very top of the CV MUST be classified as "personal" (Kişisel Bilgiler).`,
      `7. CRITICAL VERBATIM RULE: You MUST copy-paste the text exactly word-for-word as it appears in the raw CV text. Do NOT summarize, paraphrase, rewrite, correct typos, translate, or add/remove any single character or detail. Keep all original sentences completely intact.`,
      `8. CRITICAL ORDER RULE: The sections in the returned array MUST be in the exact sequential order they appear in the raw CV text from top to bottom. Do not rearrange or sort them in any other way.`,
      `9. Do not include markdown formatting or backticks in the response.`,
      ``,
      `Response JSON format example:`,
      JSON.stringify({
        sections: [
          { sectionKey: "personal", text: "Canberk Yıldız | canberk@email.com..." },
          { sectionKey: "summary", text: "..." },
          { sectionKey: "experience", text: "..." },
          { sectionKey: "other", customName: "Hobiler ve Sosyal Sorumluluk", text: "..." }
        ]
      }, null, 2),
      ``,
      `Language of CV: ${lang === "tr" ? "Turkish" : "English"}.`,
      ``,
      `Raw CV Text:`,
      text
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI returned ${res.status}`);
    }

    const data = await res.json() as Record<string, any>;
    const responseText = data.choices?.[0]?.message?.content as string;
    const parsed = JSON.parse(responseText);

    if (Array.isArray(parsed.sections)) {
      return parsed.sections.filter(
        (s: any) => s && typeof s.sectionKey === "string" && typeof s.text === "string"
      );
    }
    return [];
  } catch (err) {
    console.error("[AI Segment] segmentCvWithAI failed:", err);
    return [];
  }
}



/**
 * Per-section AI fallback (Feature 1 — low-cost, targeted).
 *
 * Sends ONLY the low-confidence section text to gpt-4o-mini and asks it to
 * identify the correct section type. Returns the corrected section key, or
 * the original key if AI fails / API key is missing.
 *
 * Cost: ~100-300 tokens per section (cheap).
 * Only called when sectionConfidence < AI_FALLBACK_THRESHOLD.
 */
export async function classifySectionWithAI(
  sectionText: string,
  currentKey: string,
  lang: "tr" | "en"
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Section] No OPENAI_API_KEY — keeping rule-based classification.");
    return currentKey;
  }

  try {
    const prompt = [
      `You are a CV section classifier. Given a CV section text, identify which section type it belongs to.`,
      `Reply with ONLY one of these exact keys (no other text): ${OPENAI_SECTION_KEYS}`,
      `Language hint: ${lang === "tr" ? "Turkish" : "English"}.`,
      ``,
      `Section text:`,
      sectionText.slice(0, 600), // send at most 600 chars to minimise tokens
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      console.warn(`[AI Section] OpenAI returned ${res.status} — keeping original key.`);
      return currentKey;
    }

    const data = await res.json() as Record<string, any>;
    const reply = ((data.choices?.[0]?.message?.content as string) ?? "").trim().toLowerCase();

    // Accept only known section keys
    const validKey = Object.keys(SECTION_LABELS).find((k) => k === reply);
    if (validKey) {
      console.log(`[AI Section] Reclassified "${currentKey}" → "${validKey}"`);
      return validKey;
    }

    console.warn(`[AI Section] Unexpected reply "${reply}" — keeping "${currentKey}".`);
    return currentKey;
  } catch (err) {
    console.error("[AI Section] classifySectionWithAI failed:", err);
    return currentKey;
  }
}

/**
 * Full CV ATS analysis via OpenAI gpt-4o-mini.
 * Replaces the former analyzeWithGemini.
 * Called once per CV upload for ATS scoring.
 */
export async function analyzeWithOpenAI(text: string, lang: "tr" | "en"): Promise<{
  atsScore: number;
  role: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}> {
  if (
    text.includes("DATA CORRUPTED") ||
    text.includes("ENCRYPTION KEY REQUIRED") ||
    text.includes("STREAM_BLOCKED_BY_CYPHER")
  ) {
    throw new Error("Geçersiz veya bozuk PDF verisi. AI analizi yapılamaz.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[OpenAI] No OPENAI_API_KEY — using local fallback.");
    return simulateAiAnalysis(text, lang);
  }

  try {
    const prompt = [
      "You are an expert recruiter and ATS system. Analyze the following CV.",
      "Return ONLY a valid JSON object (no markdown, no backticks):",
      JSON.stringify({
        atsScore: 85,
        role: "Frontend Developer",
        skills: ["React", "TypeScript"],
        strengths: ["Strong background."],
        weaknesses: ["Lacks cloud exp."],
        suggestions: ["Get AWS cert."],
      }),
      `Language of analysis: ${lang === "tr" ? "Turkish" : "English"}.`,
      "",
      "CV Text:",
      text,
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI returned status ${res.status}`);

    const data         = await res.json() as Record<string, any>;
    const responseText = data.choices?.[0]?.message?.content as string;
    const parsed       = JSON.parse(responseText);

    const atsScore    = Number(parsed.atsScore);
    const role        = parsed.role ? String(parsed.role).trim() : "";
    const skills      = parsed.skills;
    const strengths   = parsed.strengths;
    const weaknesses  = parsed.weaknesses;
    const suggestions = parsed.suggestions;

    if (
      isNaN(atsScore) ||
      !role ||
      !Array.isArray(skills)      || skills.length === 0 ||
      !Array.isArray(strengths)   || strengths.length === 0 ||
      !Array.isArray(weaknesses)  || weaknesses.length === 0 ||
      !Array.isArray(suggestions) || suggestions.length === 0
    ) {
      console.log("[OpenAI] Validation failed — using local fallback.");
      return simulateAiAnalysis(text, lang);
    }

    const normalizedSkills = Array.from(
      new Set(skills.map((s: string) => SKILL_NORM_MAP[s.toLowerCase()] ?? s))
    );

    return {
      atsScore:    Math.min(100, Math.max(0, atsScore)),
      role:        role,
      skills:      normalizedSkills.slice(0, 6),
      strengths:   strengths.slice(0, 3),
      weaknesses:  weaknesses.slice(0, 3),
      suggestions: suggestions.slice(0, 3),
    };
  } catch (err) {
    console.error("[OpenAI] analyzeWithOpenAI failed — using local fallback:", err);
    return simulateAiAnalysis(text, lang);
  }
}

/**
 * @deprecated Use analyzeWithOpenAI instead.
 * Kept temporarily so cv.ts import doesn't break during migration.
 */
export const analyzeWithGemini = analyzeWithOpenAI;

export function simulateAiAnalysis(text: string, lang: "tr" | "en") {
  if (
    text.includes("DATA CORRUPTED") ||
    text.includes("ENCRYPTION KEY REQUIRED") ||
    text.includes("STREAM_BLOCKED_BY_CYPHER")
  ) {
    throw new Error("Geçersiz veya bozuk PDF verisi. AI analizi yapılamaz.");
  }

  // Extract role/title from first lines — handles emoji prefixes and various title patterns
  let extractedRole = lang === "en" ? "Software Engineer" : "Yazılım Geliştirici";
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Broad emoji & icon strip regex
  const emojiStripRx = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}🚀📊🛠️💼🎓🔧⚙️📌📍✅❌⭐★☆▶►]/gu;

  const titleKeywordsTR = [
    "mühendis", "muhendis", "geliştirici", "gelistirici", "developer",
    "mimar", "architect", "tasarımcı", "tasarimci", "designer",
    "analist", "analyst", "yönetici", "yonetici", "manager",
    "uzman", "specialist", "lead", "direktör", "direktor", "director",
    "koordinatör", "koordinator", "koordinatör", "danışman", "danishman",
    "consultant", "sorumlu", "başkan", "baskan", "stajyer", "intern",
  ];

  for (const line of lines.slice(0, 20)) { // Check first 20 lines only
    const cleaned = line.replace(emojiStripRx, "").trim();
    if (cleaned.length < 4 || cleaned.length > 80) continue;
    const lower = cleaned.toLowerCase();
    const isTitle = titleKeywordsTR.some((kw) => lower.includes(kw));
    if (isTitle) {
      extractedRole = cleaned;
      break;
    }
  }

  const foundSkills = extractLocalSkills(text);
  const atsScore    = Math.min(60 + foundSkills.length * 6, 95);

  const trData = {
    strengths: [
      foundSkills.length > 0
        ? `${foundSkills.slice(0, 3).join(", ")} gibi modern teknolojilerde pratik deneyim.`
        : "Yazılım geliştirme alanında temel teknik bilgi birikimi.",
      "Düzenli ve anlaşılır özgeçmiş yapısı.",
      "Akademik gelişim ve mühendislik yaklaşımı.",
    ],
    weaknesses: [
      "Bulut bilişim teknolojileri (AWS/GCP) deneyim eksikliği.",
      "Uzun soluklu proje tecrübesi kısıtlılığı.",
      "Büyük ölçekli sistem tasarımı pratik eksikliği.",
    ],
    suggestions: [
      "AWS Practitioner veya Associate sertifikası edinin.",
      "Docker/Kubernetes kullanan uçtan uca bir proje geliştirin.",
      "Açık kaynaklı projelere katkıda bulunun.",
    ],
  };

  const enData = {
    strengths: [
      foundSkills.length > 0
        ? `Practical experience with ${foundSkills.slice(0, 3).join(", ")}.`
        : "Solid foundational knowledge in software engineering.",
      "Well-structured and readable resume layout.",
      "Clear academic progression.",
    ],
    weaknesses: [
      "Limited hands-on cloud experience (AWS/GCP).",
      "Short internship/work history duration.",
      "Lack of large-scale system design practice.",
    ],
    suggestions: [
      "Obtain a cloud certification (e.g., AWS Certified Developer).",
      "Build a microservices portfolio with Docker.",
      "Contribute to open-source projects.",
    ],
  };

  return {
    atsScore,
    role: extractedRole,
    skills: foundSkills,
    ...(lang === "tr" ? trData : enData),
  };
}


