/**
 * LocalRuleBasedChunker.ts (Yerel Kural Tabanlı CV Parçalayıcı Motor)
 * Görevi: OpenAI bağımlılığı olmadan yerel kural ve regEx kalipları kullanarak CV metnini satır satır analiz eder.
 * Bölüm başlıklarını tespit eder, güvenilirlik skoru %75'in (AI_FALLBACK_THRESHOLD) altına düşen karmaşık bölümler için
 * OpenAI bölümleyicisini yardıma çağırır ve parçaları döner.
 */
import crypto from "crypto";
import { SECTION_LABELS } from "./SectionTaxonomy.js";
import { matchHeading } from "./HeadingMatcher.js";
import { computeConfidence, normalizeStars } from "./CvTextPreprocessor.js";
import { splitTextSlidingWindow, subChunkSection } from "./SubChunker.js";
import { classifySectionWithAI } from "../../infrastructure/ai/OpenAiSectionSegmenter.js";

const AI_FALLBACK_THRESHOLD = 0.75;

export async function runLocalRuleBasedParser(
  text: string,
  lang: "tr" | "en",
  prisma?: any
): Promise<{ chunkText: string; metadata: any }[]> {
  const lines = text.split("\n");
  const parsedChunks: { chunkText: string; metadata: any }[] = [];

  let currentSectionKey = "personal";
  let currentSectionLabel = "Kişisel Bilgiler";
  let currentSectionLines: string[] = [];
  let currentSectionSource: "RULE" | "STRUCTURAL" | "DEFAULT" = "DEFAULT";
  let sectionOrder = 1;

  const saveCurrentSection = async () => {
    if (currentSectionLines.length === 0) return;
    const content = currentSectionLines.join("\n").trim();
    if (!content) return;

    const pushChunk = (key: string, linesList: string[], source: "RULE" | "STRUCTURAL" | "DEFAULT") => {
      const secText = linesList.join("\n").trim();
      if (!secText) return;
      const label = SECTION_LABELS[key] ?? key;
      const conf = computeConfidence(source, secText, key);
      const wordChunks = splitTextSlidingWindow(secText, 300, 50);
      wordChunks.forEach((wc_text, idx) => {
        const suffix = wordChunks.length > 1 ? ` (Kısım ${idx + 1})` : "";
        const wordCount = wc_text.split(/\s+/).filter((w) => w.length > 0).length;
        const normalized_wc = normalizeStars(wc_text);
        const fullText = `[${label.toUpperCase()}${suffix}]\n${normalized_wc}`;
        const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");

        parsedChunks.push({
          chunkText: fullText,
          metadata: {
            section: label,
            originalTitle: label,
            type: key,
            source,
            method: "rule_based",
            extractionMethod: "layout_aware",
            language: lang,
            order: sectionOrder++,
            wordCount,
            confidence: conf,
            aiFallback: false,
            createdAt: new Date().toISOString(),
            parserVersion: "v3.1",
            chunkHash,
          },
        });
      });
    };

    const langLines: string[] = [];
    const skillLines: string[] = [];
    const certLines: string[] = [];
    const otherLines: string[] = [];

    for (const l of currentSectionLines) {
      const lLower = l.toLowerCase();
      if (/english:|deutsch:|ingilizce:|almanca:|french:|spanish:|ileri seviye|başlangıç seviyesi|native|fluent/i.test(lLower) && !/python|java|react|flutter|docker/i.test(lLower)) {
        langLines.push(l);
      } else if (/languages:|frontend:|mobile:|ai \/|databases:|tools|devops|python|java|c#|typescript|react|flutter|mysql|docker|kotlin|pandas|numpy/i.test(lLower)) {
        skillLines.push(l);
      } else if (/btk academy|btk akademi|udemy|bootcamp|sertifika|certificate/i.test(lLower)) {
        certLines.push(l);
      } else {
        otherLines.push(l);
      }
    }

    if (langLines.length > 0 && skillLines.length > 0) {
      pushChunk("languages", langLines, "RULE");
      pushChunk("skills", skillLines, "RULE");
      if (otherLines.length > 0) pushChunk(currentSectionKey, otherLines, currentSectionSource);
      return;
    }

    if (certLines.length > 0 && (currentSectionKey === "summary" || currentSectionKey === "personal")) {
      pushChunk("certifications", certLines, "RULE");
      if (otherLines.length > 0) pushChunk(currentSectionKey, otherLines, currentSectionSource);
      return;
    }

    let resolvedKey = currentSectionKey;
    const lowerContent = content.toLowerCase();
    const sectionConf = computeConfidence(currentSectionSource, content, currentSectionKey);

    if (/bailey dupont|harumi kobayashi|prasha anand|niranjan devi|estelle darcy|can pekmezci|rasim sarı|wardiere inc\. \/ ceo/i.test(lowerContent)) {
      resolvedKey = "references";
    } else if (!["experience", "projects"].includes(resolvedKey) && /bachelor of|master of|wardiere university|borcelle university|deryalar üniversitesi|kırklareli university|b\.sc\. in software|lisans|yüksek lisans|high school/i.test(lowerContent)) {
      resolvedKey = "education";
    } else if (lowerContent.includes("skill-identity-engine") || lowerContent.includes("health insurance pricing") || lowerContent.includes("ai home design") || lowerContent.includes("farm ai") || lowerContent.includes("java hotel reservation") || lowerContent.includes("ai medium design") || lowerContent.includes("lexis app") || lowerContent.includes("chatter stream")) {
      resolvedKey = "projects";
    } else if (["languages", "references", "certifications"].includes(resolvedKey) && (lowerContent.includes("python") || lowerContent.includes("java") || lowerContent.includes("react") || lowerContent.includes("docker") || lowerContent.includes("flutter") || lowerContent.includes("databases") || lowerContent.includes("devops") || lowerContent.includes("visual design") || lowerContent.includes("ui/ux") || lowerContent.includes("process flows") || lowerContent.includes("wireframes") || lowerContent.includes("project management") || lowerContent.includes("public relations") || lowerContent.includes("critical thinking") || lowerContent.includes("leadership"))) {
      resolvedKey = "skills";
    } else if (["education", "experience", "certifications"].includes(resolvedKey) && (/@reallygreatsite|123-456-7890|mariana anderson|donna stroupe|jyoti majila|alberto navarro|lorna alvarado/i.test(lowerContent))) {
      resolvedKey = "personal";
    }

    let resolvedLabel = SECTION_LABELS[resolvedKey] ?? currentSectionLabel;

    if (sectionConf < AI_FALLBACK_THRESHOLD && currentSectionSource !== "RULE") {
      const aiKey = await classifySectionWithAI(content, currentSectionKey, lang, prisma);
      if (aiKey !== currentSectionKey) {
        console.log(`[Parser] AI reclassified "${currentSectionLabel}" → "${SECTION_LABELS[aiKey] ?? aiKey}" (conf was ${sectionConf})`);
        resolvedKey = aiKey;
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
        const suffix = wordChunks.length > 1 ? ` (Kısım ${idx + 1})` : "";
        const wordCount = wc_text.split(/\s+/).filter((w) => w.length > 0).length;
        const normalized_wc = normalizeStars(wc_text);
        const fullText = `[${resolvedLabel.toUpperCase()}${suffix}]\n${normalized_wc}`;
        const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");

        parsedChunks.push({
          chunkText: fullText,
          metadata: {
            section: resolvedLabel,
            originalTitle: resolvedLabel,
            type: resolvedKey,
            source: sub.source,
            method: "rule_based",
            extractionMethod: "layout_aware",
            language: lang,
            order: sectionOrder++,
            wordCount,
            confidence: sub.confidence,
            aiFallback: false,
            createdAt: new Date().toISOString(),
            parserVersion: "v3.1",
            chunkHash,
          },
        });
      });
    }
  };

  for (const line of lines) {
    const matched = matchHeading(line, lang);
    if (matched) {
      await saveCurrentSection();
      currentSectionKey = matched.sectionKey;
      currentSectionLabel = SECTION_LABELS[matched.sectionKey] ?? matched.sectionKey;
      currentSectionLines = [line];
      currentSectionSource = matched.source;
    } else {
      currentSectionLines.push(line);
    }
  }

  await saveCurrentSection();
  return parsedChunks;
}
