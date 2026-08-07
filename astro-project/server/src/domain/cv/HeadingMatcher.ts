/**
 * HeadingMatcher.ts (Başlık Eşleştirme & Metin İçi Yetenek Çıkarıcı)
 * Görevi: Metin içindeki başlıkları temizler (`normalizeHeading`), başlığın hangi CV bölümüne
 * (Eğitim, Deneyim vb.) denk geldiğini eşleştirir (`matchHeading`) ve metin içindeki yazılım yeteneklerini yakalar (`extractLocalSkills`).
 */
import { HEADINGS_TR, HEADINGS_EN, COMMON_SKILLS, SKILL_NORM_MAP } from "./SectionTaxonomy.js";

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

const RX_NUM_DATE =
  /\b(19|20)\d{2}\s*[-–—/.to\s]+\s*(20\d{2}|günümüz|present|halen|hâlen|devam)\b/i;
const RX_DATE_STRUCT = /\b(19|20)\d{2}\s*[-–—/.to\s]+\s*(20\d{2}|günümüz|present)\b/i;
const RX_SENTENCE_END = /[.,;]$/;
const RX_VERB_PAST =
  /(aldim|yaptim|calistim|mezunum|tamamladim|ogrendim|completed|graduated|worked)/;

const EXACT_MATCH_ONLY_WORDS = new Set([
  "university", "universite", "lisans", "lisanslar", "staj", "stajlar", 
  "degrees", "qualifications", "okullar", "lise", "doktora", "referans"
]);

/** Normalises a string for heading comparison: lowercase + ASCII-only Turkish. */
export function normalizeHeading(str: string): string {
  const parts = str.trim().split(/\s+/);
  const unspaced = (parts.length >= 2 && parts.every((p) => p.length === 1))
    ? parts.join("")
    : str.replace(/(?<=[A-ZÇĞİÖŞÜa-zA-Zçğışöü\u0130\u0131])\s+(?=[A-ZÇĞİÖŞÜa-zA-Zçğışöü\u0130\u0131])/gu, "");

  return unspaced
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/i̇/g, "i")
    .replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function matchHeading(
  line: string,
  lang: "tr" | "en"
): { sectionKey: string; confidence: number; source: "RULE" | "STRUCTURAL" } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;

  const clean = trimmed.replace(/:$/, "").replace(/^[\[(]|[\])]$/g, "").trim();
  if (!clean || RX_SENTENCE_END.test(clean)) return null;

  // If the line contains a numeric date range, it is a sub-entry, not a section heading.
  if (RX_NUM_DATE.test(clean) || RX_DATE_STRUCT.test(clean)) {
    return null;
  }

  const norm = normalizeHeading(clean);
  if (norm.split(/\s+/).length > 6) return null;
  const normNoSpaces = norm.replace(/\s+/g, "");

  // 1. Exact match across both Turkish and English heading lists
  const allHeadingsList = [HEADINGS_TR, HEADINGS_EN];
  
  for (const headings of allHeadingsList) {
    for (const [key, list] of Object.entries(headings)) {
      for (const h of list) {
        const hNorm = normalizeHeading(h);
        const hNoSpaces = hNorm.replace(/\s+/g, "");
        if (
          norm === hNorm ||
          normNoSpaces === hNoSpaces ||
          [`${hNoSpaces}ler`, `${hNoSpaces}lar`, `${hNoSpaces}leri`, `${hNoSpaces}lari`].includes(normNoSpaces)
        ) {
          return { sectionKey: key, confidence: 0.98, source: "RULE" };
        }
      }
    }
  }

  // 2. Word-boundary regex match across both dictionaries
  for (const headings of allHeadingsList) {
    for (const [key, list] of Object.entries(headings)) {
      for (const phrase of list) {
        if (EXACT_MATCH_ONLY_WORDS.has(phrase)) continue;

        if (new RegExp(`(^|\\s)${phrase}(\\s|$)`, "i").test(norm) && !RX_VERB_PAST.test(norm)) {
          return { sectionKey: key, confidence: 0.85, source: "RULE" };
        }
      }
    }
  }

  return null;
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
