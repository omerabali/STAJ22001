import { PDFParse } from "pdf-parse";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TAXONOMY
// 8 canonical section types. All heading detection normalizes to these keys.
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  summary:        "Özet",
  experience:     "Deneyimler",
  education:      "Eğitim",
  skills:         "Yetenekler",
  projects:       "Projeler",
  certifications: "Sertifikalar",
  languages:      "Diller",
  references:     "Referanslar",
};

// Only TR and EN are supported — no other language needed.

/**
 * Turkish heading variants (ASCII-normalised, no diacritics).
 * 8-10 most common forms per section — not exhaustive, pragmatic.
 */
const HEADINGS_TR: Record<string, string[]> = {
  summary: [
    "hakkimda", "ozet", "profil", "kisisel ozet", "kariyer hedefi",
    "kariyer ozeti", "ben kimim", "kisisel profil", "kisisel nitelikler",
    "profesyonel ozet", "hakknmda",
  ],
  experience: [
    "deneyim", "is deneyimi", "is deneyimleri", "calisma gecmisi",
    "profesyonel deneyim", "kariyer gecmisi", "is tecrubesi", "tecrubeler",
    "tecrube", "staj", "stajlar", "is gecmisi", "mesleki deneyim",
    "deneyimler", "nn deneynmn", "deneynmn", "nn deneyim",
  ],
  education: [
    "egitim", "ogrenim", "egitim bilgileri", "egitim gecmisi",
    "akademik gecmis", "okullar", "universite", "lisans",
    "yuksek lisans", "doktora", "enntnm", "egntnm",
  ],
  skills: [
    "yetenekler", "beceriler", "teknik beceriler", "teknik yetenekler",
    "uzmanlik alanlari", "teknolojiler", "diller & teknolojiler",
    "araclar", "yetenekler & araclar", "bilgisayar becerileri",
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
  ],
  references: [
    "referanslar", "referans", "is referanslari",
  ],
};

/**
 * English heading variants (lowercase).
 */
const HEADINGS_EN: Record<string, string[]> = {
  summary: [
    "about", "about me", "summary", "profile", "objective",
    "career objective", "professional summary", "overview",
    "introduction", "executive summary", "personal summary",
  ],
  experience: [
    "experience", "work experience", "employment", "employment history",
    "professional experience", "career history", "work history", "internships",
  ],
  education: [
    "education", "academic background", "academic history",
    "educational background", "qualifications", "university",
    "degrees", "educational qualifications",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "expertise",
    "technologies", "skills & tools", "key skills",
  ],
  projects: [
    "projects", "project experience", "personal projects",
    "academic projects", "portfolio", "selected projects",
    "recent projects", "project history",
  ],
  certifications: [
    "certifications", "certificates", "licenses", "courses",
    "training", "credentials",
  ],
  languages: [
    "languages", "language skills", "languages spoken",
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

/** Extracts raw text from a PDF buffer. */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return result.text || "";
  } catch (err) {
    console.error("PDF metin çıkarma hatası:", err);
    throw new Error("PDF dosyası okunurken hata oluştu.");
  } finally {
    await parser.destroy();
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

  const headings = lang === "tr" ? HEADINGS_TR : HEADINGS_EN;

  // 1. Exact match
  for (const [key, list] of Object.entries(headings)) {
    if (
      list.includes(norm) ||
      list.some((h) => [`${h}ler`, `${h}lar`, `${h}leri`, `${h}lari`].includes(norm))
    ) {
      return { sectionKey: key, confidence: 0.98, source: "RULE" };
    }
  }

  // 2. Word-boundary regex match
  for (const [key, list] of Object.entries(headings)) {
    for (const phrase of list) {
      if (new RegExp(`(^|\\s)${phrase}(\\s|$)`, "i").test(norm) && !RX_VERB_PAST.test(norm)) {
        return { sectionKey: key, confidence: 0.85, source: "RULE" };
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
  content: string
): number {
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

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE CHUNK SPLITTING (sentence-boundary sliding window)
// ─────────────────────────────────────────────────────────────────────────────

function splitTextSlidingWindow(text: string, maxWords = 300, overlap = 50): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length <= 1) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= maxWords) return [text];

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
      const subConf = computeConfidence("STRUCTURAL", content);
      raw.push({ text: content, confidence: subConf, source: "STRUCTURAL" });
    }
    buf = [];
  };

  for (const line of lines) {
    if (isBoundary(line.trim())) {
      flush();
      buf = [line];
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
 * Splits a resume text into semantic chunks with section metadata.
 * Pipeline: heading detection → confidence scoring → [AI reclassify if conf < 0.75]
 *           → semantic sub-chunking → adaptive sizing.
 *
 * Now async: low-confidence sections are sent to classifySectionWithAI (gpt-4o-mini)
 * which reclassifies just that section's text (max 600 chars, ~150 tokens → ~$0.0001).
 */
export async function chunkTextBySections(text: string): Promise<{ chunkText: string; metadata: any }[]> {
  if (!text || text.trim() === "") return [];

  const lang = detectLanguage(text);
  const lines = text.split("\n");
  const parsedChunks: { chunkText: string; metadata: any }[] = [];

  // Default section: text before the first detected heading
  let currentSectionKey     = "summary";
  let currentSectionLabel   = "Özet";
  let currentSectionLines: string[] = [];
  let currentSectionSource: "RULE" | "STRUCTURAL" | "DEFAULT" = "DEFAULT";
  let sectionOrder = 1;

  const saveCurrentSection = async () => {
    if (currentSectionLines.length === 0) return;
    const content = currentSectionLines.join("\n").trim();
    if (!content) return;

    const sectionConf = computeConfidence(currentSectionSource, content);

    // ── Per-section AI Fallback ───────────────────────────────────────────────
    // If confidence is below threshold, ask gpt-4o-mini to reclassify.
    // Only the section text is sent (max 600 chars) — cheap, targeted.
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
    // ─────────────────────────────────────────────────────────────────────────

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
        const fullText  = `[${resolvedLabel.toUpperCase()}${suffix}]\n${wc_text}`;
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
            aiFallback:    sectionConf < AI_FALLBACK_THRESHOLD,  // flag: was AI used?
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
    if (line === "") continue; // skip blanks early

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

// ─────────────────────────────────────────────────────────────────────────────
// AI — OpenAI gpt-4o-mini
//
// Two separate responsibilities:
//   1. classifySectionWithAI  — per-section: reclassify a single low-confidence
//                               section by sending only that section's text.
//   2. analyzeWithOpenAI      — full CV: produce ATS score, skills, strengths,
//                               weaknesses, suggestions.
//
// Gemini has been removed. simulateAiAnalysis is the offline fallback.
// ─────────────────────────────────────────────────────────────────────────────

const OPENAI_SECTION_KEYS = Object.keys(SECTION_LABELS).join(" | ");

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
    const skills      = parsed.skills;
    const strengths   = parsed.strengths;
    const weaknesses  = parsed.weaknesses;
    const suggestions = parsed.suggestions;

    if (
      isNaN(atsScore) ||
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
    skills: foundSkills,
    ...(lang === "tr" ? trData : enData),
  };
}


