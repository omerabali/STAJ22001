import { describe, test, expect } from "@jest/globals";
import { chunkTextBySections } from "../src/utils/parser.js";
import { GROUND_TRUTH_CVS } from "./fixtures/ground_truth_dataset.js";

describe("Baseline Ground Truth Evaluation", () => {
  test("Diagnostic evaluation across 25 ground truth CVs", async () => {
    let totalExpectedSections = 0;
    let totalDetectedExpectedSections = 0;
    let totalChunksProduced = 0;
    let totalConfidenceSum = 0;

    for (const cv of GROUND_TRUTH_CVS) {
      const chunks = await chunkTextBySections(cv.rawText);
      totalChunksProduced += chunks.length;

      const detectedSections = new Set<string>();
      for (const chunk of chunks) {
        const sectionName = chunk.metadata.section || "";
        totalConfidenceSum += chunk.metadata.confidence || 0;

        const secLower = sectionName.toLowerCase();
        if (secLower.includes("kişisel") || secLower.includes("personal") || secLower.includes("iletişim") || secLower.includes("contact")) detectedSections.add("personal");
        if (secLower.includes("özet") || secLower.includes("summary") || secLower.includes("profil") || secLower.includes("hakkımda") || secLower.includes("objective")) detectedSections.add("summary");
        if (secLower.includes("deneyim") || secLower.includes("experience") || secLower.includes("iş") || secLower.includes("work") || secLower.includes("staj") || secLower.includes("history")) detectedSections.add("experience");
        if (secLower.includes("eğitim") || secLower.includes("education") || secLower.includes("öğrenim") || secLower.includes("academic")) detectedSections.add("education");
        if (secLower.includes("yetenek") || secLower.includes("skill") || secLower.includes("beceri") || secLower.includes("bilgi") || secLower.includes("competenc")) detectedSections.add("skills");
        if (secLower.includes("dil") || secLower.includes("language")) detectedSections.add("languages");
        if (secLower.includes("proje") || secLower.includes("project")) detectedSections.add("projects");
        if (secLower.includes("sertifika") || secLower.includes("certif") || secLower.includes("burs") || secLower.includes("ödül")) detectedSections.add("certifications");
        if (secLower.includes("yayın") || secLower.includes("publication")) detectedSections.add("publications");
        if (secLower.includes("referans") || secLower.includes("reference") || secLower.includes("board")) detectedSections.add("references");
      }

      for (const exp of cv.expectedSections) {
        totalExpectedSections++;
        if (detectedSections.has(exp)) {
          totalDetectedExpectedSections++;
        }
      }
    }

    const overallRecall = totalDetectedExpectedSections / totalExpectedSections;
    const overallAvgConf = totalConfidenceSum / totalChunksProduced;

    expect(overallRecall).toBeGreaterThanOrEqual(0.95);
    expect(overallAvgConf).toBeGreaterThanOrEqual(0.80);
  });
});
