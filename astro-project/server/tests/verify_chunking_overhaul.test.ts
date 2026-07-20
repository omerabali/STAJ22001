import { describe, test, expect } from "@jest/globals";
import { chunkTextBySections } from "../src/utils/parser.js";
import { GROUND_TRUTH_CVS } from "./fixtures/ground_truth_dataset.js";

describe("CV Chunking Architecture Overhaul Test Suite", () => {
  
  test("1. Ground Truth Dataset Evaluation — High Section Recall (>= 95%) & Confidence (>= 0.80)", async () => {
    let totalExpected = 0;
    let totalDetected = 0;
    let totalConfidence = 0;
    let totalChunks = 0;
    let ruleBasedChunks = 0;

    for (const cv of GROUND_TRUTH_CVS) {
      const chunks = await chunkTextBySections(cv.rawText);
      expect(chunks.length).toBeGreaterThan(0);
      totalChunks += chunks.length;

      const detectedSections = new Set<string>();
      for (const chunk of chunks) {
        // Verify method metadata exists
        expect(["rule_based", "ai_fallback", "hard_fallback"]).toContain(chunk.metadata.method);

        if (chunk.metadata.method === "rule_based") {
          ruleBasedChunks++;
        }

        totalConfidence += chunk.metadata.confidence || 0;
        const secLower = (chunk.metadata.section || "").toLowerCase();

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
        totalExpected++;
        if (detectedSections.has(exp)) {
          totalDetected++;
        }
      }
    }

    const recallRate = totalDetected / totalExpected;
    const avgConfidence = totalConfidence / totalChunks;
    const ruleBasedRatio = ruleBasedChunks / totalChunks;

    console.log(`[Test Result] Ground Truth Recall: ${(recallRate * 100).toFixed(1)}%`);
    console.log(`[Test Result] Overall Avg Confidence: ${avgConfidence.toFixed(2)}`);
    console.log(`[Test Result] Rule-Based Ratio: ${(ruleBasedRatio * 100).toFixed(1)}% (Target >= 75%)`);

    expect(recallRate).toBeGreaterThanOrEqual(0.95);
    expect(avgConfidence).toBeGreaterThanOrEqual(0.80);
    expect(ruleBasedRatio).toBeGreaterThanOrEqual(0.75); // Target: >75% rule-based (less than 25% AI fallback)
  });

  test("2. Metadata Traceability — Each chunk contains method, confidence, wordCount, order", async () => {
    const cv = GROUND_TRUTH_CVS[0];
    const chunks = await chunkTextBySections(cv.rawText);

    for (const chunk of chunks) {
      expect(chunk.metadata).toBeDefined();
      expect(chunk.metadata.method).toBeDefined();
      expect(typeof chunk.metadata.confidence).toBe("number");
      expect(typeof chunk.metadata.wordCount).toBe("number");
      expect(typeof chunk.metadata.order).toBe("number");
      expect(chunk.metadata.chunkHash).toBeDefined();
    }
  });

  test("3. Tier 3 Hard Fallback Verification — Fallback when no section headings match", async () => {
    const scrambledNoHeadingsText = `
    Canberk Yıldız
    canberk@example.com
    555-000-1122

    A random paragraph describing work at tech companies in 2020-2024.
    Another long paragraph with various text items without any headings or structural breaks.
    Yet another paragraph containing details about software engineering projects.
    `;

    const chunks = await chunkTextBySections(scrambledNoHeadingsText);
    expect(chunks.length).toBeGreaterThan(0);
    // Should gracefully produce chunks without crashing
    for (const chunk of chunks) {
      expect(chunk.chunkText).toBeDefined();
      expect(chunk.metadata.method).toBeDefined();
    }
  });

});
