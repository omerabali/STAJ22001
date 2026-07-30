const _TR_M = "ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık";

const RX_NUM_DATE =
  /\b(19|20)\d{2}\s*[-–—/.to\s]+\s*(20\d{2}|günümüz|present|halen|hâlen|devam)\b/i;
const RX_TR_MONTH = new RegExp(
  `(?:${_TR_M})\\s+(19|20)\\d{2}\\s*[-–—/.to\\s]+\\s*(?:(?:${_TR_M})\\s+)?(19|20)\\d{2}|(günümüz|present|halen)`,
  "i"
);
const RX_COMPANY =
  /a\.ş\.|ltd\.|holding|holdingi|şirketi|company|inc\.|corp\./i;
const RX_DATE_STRUCT = /\b(19|20)\d{2}\s*[-–—/.to\s]+\s*(20\d{2}|günümüz|present)\b/i;
const RX_EDU_STRUCT =
  /üniversite|universite|lise|fakülte|lisans|yüksek lisans|bachelor|master|phd|school|college/i;
const RX_EXP_STRUCT =
  /mühendis|engineer|developer|staj|intern|manager|lead|director|yazılım|geliştirici/i;

const RX_TR_WORDS = ["ve", "ile", "icin", "olan", "bir", "olarak", "hakkinda", "egitim", "deneyimi"]
  .map((w) => new RegExp(`\\b${w}\\b`, "g"));
const RX_EN_WORDS = ["and", "with", "for", "the", "a", "as", "about", "education", "experience"]
  .map((w) => new RegExp(`\\b${w}\\b`, "g"));

/** Detects whether resume text is primarily Turkish or English. */
export function detectLanguage(text: string): "tr" | "en" {
  const lower = text.toLowerCase();
  let trCount = 0;
  let enCount = 0;
  for (const rx of RX_TR_WORDS) { rx.lastIndex = 0; trCount += (lower.match(rx) || []).length; }
  for (const rx of RX_EN_WORDS) { rx.lastIndex = 0; enCount += (lower.match(rx) || []).length; }
  return trCount >= enCount ? "tr" : "en";
}

/** Structural fallback: guess section from content patterns (dates, edu/exp keywords). */
export function detectSectionByStructure(line: string): string | null {
  const hasDate = RX_DATE_STRUCT.test(line);

  if (RX_EDU_STRUCT.test(line) && (hasDate || /mezun|öğrenci|ogrenci/i.test(line))) {
    return "education";
  }
  if ((RX_EXP_STRUCT.test(line) || RX_COMPANY.test(line)) && hasDate) {
    return "experience";
  }
  return null;
}

export function computeConfidence(
  headingSource: "RULE" | "STRUCTURAL" | "DEFAULT",
  content: string,
  sectionKey?: string
): number {
  const trimmedContent = content.trim();
  const wc = trimmedContent.split(/\s+/).filter(Boolean).length;

  if (wc === 0) return 0.10;

  // 1. Heading Source & Format Signal (0.35 max)
  let headingScore = 0.10;
  if (headingSource === "RULE") {
    headingScore = 0.35;
  } else if (headingSource === "STRUCTURAL") {
    headingScore = 0.25;
  }

  // 2. Content Semantic Fit Signal (0.30 max)
  let semanticScore = 0.10;
  if (sectionKey) {
    const lowerContent = trimmedContent.toLowerCase();
    switch (sectionKey) {
      case "personal":
        if (/@/.test(lowerContent) || /\+?\d[\d\s-]{7,}/.test(lowerContent) || /linkedin|github|email|telefon|adres|phone|doğum|ehliyet|born/i.test(lowerContent)) {
          semanticScore = 0.30;
        } else if (wc <= 60) {
          semanticScore = 0.25;
        }
        break;

      case "experience":
        const hasExpSignals =
          RX_NUM_DATE.test(trimmedContent) ||
          RX_TR_MONTH.test(trimmedContent) ||
          RX_COMPANY.test(trimmedContent) ||
          /staj|engineer|developer|müdür|uzman|yönetici|manager|analyst|intern|senior|lead|consultant|specialist|officer|head|architect/i.test(lowerContent);
        semanticScore = hasExpSignals ? 0.30 : (wc >= 10 ? 0.20 : 0.10);
        break;

      case "education":
        const hasEduSignals =
          RX_EDU_STRUCT.test(trimmedContent) ||
          RX_NUM_DATE.test(trimmedContent) ||
          /üniversite|university|fakülte|lisans|bachelor|master|doktora|phd|gpa|mezun|high school|lise|school|degree|diploma/i.test(lowerContent);
        semanticScore = hasEduSignals ? 0.30 : (wc >= 8 ? 0.20 : 0.10);
        break;

      case "skills":
        const hasSkillSignals =
          /javascript|typescript|python|java|react|node|sql|docker|git|aws|figma|css|html|agile|scrum|c\+\+|c#|c1|c2|b1|b2|linux|devops|jira|photoshop|ui\/ux/i.test(lowerContent) ||
          /[,|•*%]/.test(lowerContent);
        semanticScore = hasSkillSignals ? 0.30 : (wc >= 3 ? 0.20 : 0.10);
        break;

      case "languages":
        const hasLangSignals =
          /türkçe|ingilizce|almanca|fransızca|ispanyolca|english|turkish|german|french|spanish|c1|c2|b1|b2|ana dil|native|fluent|ileri|orta|b2|c1/i.test(lowerContent);
        semanticScore = hasLangSignals ? 0.30 : (wc >= 2 ? 0.20 : 0.10);
        break;

      case "projects":
        const hasProjSignals =
          /github|proje|project|app|system|sistem|uygulama|stack|http|api|microservice|database/i.test(lowerContent) ||
          RX_NUM_DATE.test(trimmedContent);
        semanticScore = hasProjSignals ? 0.30 : (wc >= 8 ? 0.20 : 0.10);
        break;

      case "certifications":
        const hasCertSignals =
          /sertifika|certif|burs|ödül|award|license|credential|course|bootcamp|completion|dijital|honors|fellowship/i.test(lowerContent) ||
          /\b(20\d\d|19\d\d)\b/.test(lowerContent);
        semanticScore = hasCertSignals ? 0.30 : (wc >= 3 ? 0.20 : 0.10);
        break;

      case "publications":
        const hasPubSignals = /paper|journal|patent|ieee|nature|conference|article|yayın|bildiri|eser/i.test(lowerContent) || /\b(20\d\d|19\d\d)\b/.test(lowerContent);
        semanticScore = hasPubSignals ? 0.30 : (wc >= 5 ? 0.20 : 0.10);
        break;

      case "summary":
        semanticScore = wc >= 8 ? 0.30 : (wc >= 4 ? 0.20 : 0.10);
        break;

      default:
        semanticScore = wc >= 5 ? 0.25 : 0.10;
        break;
    }
  }

  // 3. Structural Signal (0.25 max)
  const hasStructuralSignal =
    RX_NUM_DATE.test(trimmedContent) ||
    RX_TR_MONTH.test(trimmedContent) ||
    RX_COMPANY.test(trimmedContent) ||
    /[•*–-]/.test(trimmedContent) ||
    /[:|]/.test(trimmedContent);
  const structuralScore = hasStructuralSignal ? 0.25 : 0.10;

  // 4. Content Quantity Appropriateness (0.10 max)
  let sizeScore = 0.10;
  if (sectionKey === "personal" && wc >= 1 && wc <= 60) {
    sizeScore = 0.10;
  } else if (["skills", "languages", "certifications"].includes(sectionKey || "") && wc >= 2 && wc <= 250) {
    sizeScore = 0.10;
  } else if (wc >= 10 && wc <= 500) {
    sizeScore = 0.10;
  } else if (wc < 3 && sectionKey !== "personal") {
    sizeScore = 0.02;
  }

  const rawConfidence = headingScore + semanticScore + structuralScore + sizeScore;
  return Math.min(1.0, Math.max(0.20, Math.round(rawConfidence * 100) / 100));
}

export function normalizeStars(text: string): string {
  return text;
}

export function preprocessTwoColumnText(text: string): string {
  const lines = text.split("\n");
  const processed: string[] = [];

  const emojiRx = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}]/gu;
  const barPctRx = /^%?\d{1,3}(?:\s*\([\w\s\u00c0-\u017e-]+\))?$|^\(\s*%?\d{1,3}\s*\)$/;

  const strippedLines: string[] = [];
  for (const line of lines) {
    const stripped = line
      .replace(/^[\s]*[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}]+\s*/gu, "")
      .replace(emojiRx, "")
      .trim();
    strippedLines.push(stripped);
  }

  const paired: string[] = [];
  let i = 0;
  while (i < strippedLines.length) {
    const line = strippedLines[i];

    if (barPctRx.test(line)) {
      const barLines: string[] = [line];
      let j = i + 1;
      while (j < strippedLines.length && barPctRx.test(strippedLines[j])) {
        barLines.push(strippedLines[j]);
        j++;
      }

      const skippedHeadings: string[] = [];
      while (j < strippedLines.length) {
        const sl = strippedLines[j].replace(emojiRx, "").trim();
        if (sl === "") { j++; continue; }
        const isHeading = sl === sl.toUpperCase() && sl.length > 3 && sl.length <= 55
          && !/^%?\d/.test(sl);
        if (isHeading) { skippedHeadings.push(strippedLines[j]); j++; continue; }
        break;
      }

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
        if (sl === strippedLines[k] && strippedLines[k].length > 3 && strippedLines[k].length <= 55) break;
        labelLines.push(strippedLines[k]);
        k++;
      }

      if (labelLines.length === barLines.length) {
        for (const h of skippedHeadings) paired.push(h);
        for (let m = 0; m < barLines.length; m++) {
          paired.push(`${labelLines[m]}: ${barLines[m]}`);
        }
        i = k;
        continue;
      } else {
        for (const h of skippedHeadings) paired.push(h);
        for (const b of barLines) paired.push(b);
        i = j;
        continue;
      }
    }

    paired.push(line);
    i++;
  }

  for (const line of paired) {
    const segments = line.split(/\s{3,}/);
    if (segments.length >= 2) {
      for (const seg of segments) {
        const t = seg.trim();
        if (t) processed.push(t);
      }
    } else {
      processed.push(line);
    }
  }

  return processed.join("\n");
}
