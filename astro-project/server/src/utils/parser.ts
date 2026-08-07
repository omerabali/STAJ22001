/**
 * parser.ts (CV Metin Parçalama & Ayrıştırma Facade Giriş Kapısı)
 * Görevi: PDF metin çıkarma, bölüm başlığı algılama, dil tespiti, yetenek çıkarma,
 * sliding-window parçalama ve yapay zeka bölümleme servislerini tek bir noktadan dışarı aktaran (Facade) ana giriş kapısıdır.
 */

// Domain Taxonomies & Matchers
export {
  SECTION_LABELS,
  HEADINGS_TR,
  HEADINGS_EN,
  COMMON_SKILLS,
  SKILL_NORM_MAP
} from "../domain/cv/SectionTaxonomy.js";

export {
  normalizeHeading,
  matchHeading,
  extractLocalSkills
} from "../domain/cv/HeadingMatcher.js";

export {
  detectLanguage,
  detectSectionByStructure,
  computeConfidence,
  normalizeStars,
  preprocessTwoColumnText
} from "../domain/cv/CvTextPreprocessor.js";

export {
  splitTextSlidingWindow,
  subChunkSection
} from "../domain/cv/SubChunker.js";

export {
  runLocalRuleBasedParser
} from "../domain/cv/LocalRuleBasedChunker.js";

// Infrastructure Components
export {
  extractTextFromPDF
} from "../infrastructure/pdf/PdfTextExtractor.js";

export {
  simulateAiAnalysis
} from "../infrastructure/ai/LocalRuleAnalyzer.js";

export {
  analyzeWithOpenAI,
  analyzeWithGemini
} from "../infrastructure/ai/OpenAiCvAnalyzer.js";

export {
  segmentCvWithAI,
  classifySectionWithAI
} from "../infrastructure/ai/OpenAiSectionSegmenter.js";

// Application Use-Case Entrypoint
export {
  ChunkCvTextUseCase,
  chunkTextBySections
} from "../application/cv/ChunkCvTextUseCase.js";
