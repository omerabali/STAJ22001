import { computeConfidence } from "./CvTextPreprocessor.js";

const _TR_M = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";

const RX_NUM_DATE =
  /\b(19|20)\d{2}\s*[-–—/.to\s]+\s*(20\d{2}|günümüz|present|halen|hâlen|devam)\b/i;
const RX_TR_MONTH = new RegExp(
  `(?:${_TR_M})\\s+(19|20)\\d{2}\\s*[-–—/.to\\s]+\\s*(?:(?:${_TR_M})\\s+)?(19|20)\\d{2}|(günümüz|present|halen)`,
  "i"
);
const RX_PIPE_HEADLINE = /^[^.!?,;]+\|[^.!?,;]+$/;
const RX_PROJECT_TITLE =
  /^[A-ZÇĞİÖŞÜ][^.!?,;]{2,70}(?:\s*[-–—]\s*[A-ZÇĞİÖŞÜa-z]|\s*\([^)]{3,}\))\s*$/;

export function splitTextSlidingWindow(text: string, maxWords = 300, overlap = 50): string[] {
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

export type SubChunk = { text: string; confidence: number; source: "RULE" | "STRUCTURAL" };

export function subChunkSection(
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

    if (RX_NUM_DATE.test(t) || RX_TR_MONTH.test(t)) return true;
    if (RX_PIPE_HEADLINE.test(t)) return true;
    if (sectionKey === "projects" && RX_PROJECT_TITLE.test(t)) return true;

    return false;
  };

  const raw: SubChunk[] = [];
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join("\n").trim();
    if (content) {
      const subConf = computeConfidence("STRUCTURAL", content, sectionKey);
      raw.push({ text: content, confidence: subConf, source: "STRUCTURAL" });
    }
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isBoundary(trimmed)) {
      const poppedLines: string[] = [];
      while (buf.length > 0 && poppedLines.length < 2) {
        const lastLine = buf[buf.length - 1].trim();
        const isList = lastLine.startsWith("•") || lastLine.startsWith("-") || lastLine.startsWith("*");
        const isLongText = lastLine.split(/\s+/).filter(Boolean).length > 10;
        
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

  if (merged.length === 0) {
    return [{ text: lines.join("\n"), confidence: sectionConfidence, source: parentSource }];
  }

  return merged;
}
