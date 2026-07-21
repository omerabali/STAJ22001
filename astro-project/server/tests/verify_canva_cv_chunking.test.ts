import { describe, test, expect, beforeAll } from "@jest/globals";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { PDFParse } from "pdf-parse";
import { chunkTextBySections, extractTextFromPDF } from "../src/utils/parser.js";

// Compatible paths for ts-jest
const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures");
const CV_TEST_DIR  = path.resolve(process.cwd(), "tests", "cv_test");
const REPORT_PATH  = path.join(FIXTURES_DIR, "chunking_report.txt");

// ── Collect PDFs from fixtures/ and cv_test/ ──
function collectPDFs(): { label: string; filePath: string }[] {
  const results: { label: string; filePath: string }[] = [];
  for (const dir of [FIXTURES_DIR, CV_TEST_DIR]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf")).sort();
    for (const f of files) results.push({ label: f, filePath: path.join(dir, f) });
  }
  return results;
}

// ── Layout-Aware PDF text extractor using pdfjs-dist ──
async function extractText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  return await extractTextFromPDF(buffer);
}

// ── Types ──
interface ChunkStats {
  label: string;
  chunkCount: number;
  avgConf: number;
  lowConfCount: number;
  chunks: any[];
}

// ── Global state ──
const allStats: ChunkStats[] = [];
const pdfs = collectPDFs();

// ── Build report + populate allStats before all tests ──
beforeAll(async () => {
  fs.writeFileSync(
    REPORT_PATH,
    `CANVA CV CHUNKING REPORT (3-LAYER AI PIPELINE)\nOluşturulma: ${new Date().toISOString()}\nToplam PDF: ${pdfs.length}\n\n`,
    "utf-8"
  );

  let layer1PassCount = 0;
  let layer2PassCount = 0;
  let layer3RetryCount = 0;
  let ruleBasedFallbackCount = 0;
  let totalAiCalls = 0;
  let totalEstimatedCost = 0;

  const l2CorrectionExamples: string[] = [];
  const l3RetryExamples: string[] = [];
  const ruleBasedExamples: string[] = [];

  for (const { label, filePath } of pdfs) {
    let lines = "";
    lines += `${"=".repeat(64)}\n`;
    lines += `CV: ${label}\n`;

    try {
      const text   = await extractText(filePath);
      const chunks = await chunkTextBySections(text);

      totalAiCalls += 2; // Katman 1 (1 çağrı) + Katman 2 (1 çağrı) per CV

      let l1Count = 0;
      let l2Count = 0;
      let l3Count = 0;
      let rbCount = 0;

      chunks.forEach((chunk: any) => {
        const trace  = chunk.metadata?.chunkQualityLog;
        const source = trace?.finalSource || "layer2";
        if (source === "layer1") { l1Count++; layer1PassCount++; }
        else if (source === "layer2") { l2Count++; layer2PassCount++; }
        else if (source === "layer3") { l3Count++; layer3RetryCount++; totalAiCalls += 1; }
        else if (source === "rule_based_final") { rbCount++; ruleBasedFallbackCount++; }
      });

      const confidences  = chunks.map((c: any) => c.metadata?.confidence ?? 0);
      const avgConf      = confidences.length
        ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
        : 0;
      const lowConfCount = confidences.filter((c: number) => c < 0.6).length;

      allStats.push({ label, chunkCount: chunks.length, avgConf, lowConfCount, chunks });

      lines += `Toplam Chunk Sayısı: ${chunks.length}\n`;
      lines += `Ortalama Confidence: ${avgConf.toFixed(2)}\n`;
      lines += `Katman Dağılımı: Layer1: ${l1Count} | Layer2: ${l2Count} | Layer3: ${l3Count} | RuleBased: ${rbCount}\n`;
      lines += `${"=".repeat(64)}\n\n`;

      chunks.forEach((chunk: any, i: number) => {
        const originalTitle = chunk.metadata?.originalTitle || chunk.metadata?.section || "Bilinmiyor";
        const type          = chunk.metadata?.type || chunk.sectionType || "other";
        const score100      = chunk.metadata?.confidence_score ?? Math.round((chunk.metadata?.confidence ?? 0.95) * 100);
        const trace         = chunk.metadata?.chunkQualityLog;
        const layerName     = trace?.finalSource === "layer3" ? "Layer3" : (trace?.finalSource === "rule_based_final" ? "RuleBased" : "Layer2");
        const duzeltildi    = Boolean(trace?.layer2?.duzeltildi);

        if (duzeltildi && l2CorrectionExamples.length < 3) {
          l2CorrectionExamples.push(
            `[${label}] Chunk ${i + 1} (${originalTitle}): Katman 1 [${trace?.layer1?.type}] -> Katman 2 [${trace?.layer2?.type}, score=${trace?.layer2?.confidence_score}] (Düzeltme: ${trace?.layer2?.duzeltme_aciklamasi || "İçerik/sınır düzenlendi"})`
          );
        }
        if (trace?.layer3 && l3RetryExamples.length < 3) {
          l3RetryExamples.push(
            `[${label}] Chunk ${i + 1} (${originalTitle}): L2 score=${trace?.layer2?.confidence_score} < 70 -> Katman 3 [${trace?.layer3?.type}, new_score=${trace?.layer3?.confidence_score}] (Not: ${trace?.layer3?.aciklama})`
          );
        }
        if (trace?.finalSource === "rule_based_final" && ruleBasedExamples.length < 3) {
          ruleBasedExamples.push(
            `[${label}] Chunk ${i + 1} (${originalTitle}): L3 score=${trace?.layer3?.confidence_score} < 70 -> Rule-Based Fallback`
          );
        }

        lines += `[Chunk ${i + 1}] originalTitle: ${originalTitle} | type: ${type} | confidence_score: ${score100} | layer: ${layerName} | duzeltildi: ${duzeltildi}\n`;
        lines += `${"-".repeat(60)}\n`;
        lines += `${(chunk.text ?? chunk.chunkText ?? "").trim()}\n\n`;
      });

    } catch (e: any) {
      console.error(`[ERROR] ${label}: ${e.message}`);
      allStats.push({ label, chunkCount: 0, avgConf: 0, lowConfCount: 0, chunks: [] });
      lines += `Toplam Chunk Sayısı: 0\nOrtalama Confidence: 0.00\n`;
      lines += `Katman Dağılımı: Layer1: 0 | Layer2: 0 | Layer3: 0 | RuleBased: 0\n`;
      lines += `${"=".repeat(64)}\n\n`;
      lines += `[HATA] ${e.message}\n\n`;
    }

    lines += `\n>>> BİR SONRAKİ CV'YE GEÇ\n\n\n`;
    fs.appendFileSync(REPORT_PATH, lines, "utf-8");
  }

  // ── Global summary ──
  const totalChunks  = allStats.reduce((s, r) => s + r.chunkCount, 0);
  const totalLowConf = allStats.reduce((s, r) => s + r.lowConfCount, 0);
  const withChunks   = allStats.filter(r => r.chunkCount > 0);
  const lowest  = withChunks.reduce((a, b) => a.avgConf < b.avgConf ? a : b, withChunks[0]);
  const highest = withChunks.reduce((a, b) => a.avgConf > b.avgConf ? a : b, withChunks[0]);

  // Rough estimation: ~1200 prompt tokens + 400 completion tokens per call for gpt-4o-mini
  totalEstimatedCost = totalAiCalls * (1200 * 0.00000015 + 400 * 0.00000060);

  let summary = `GENEL ÖZET\n`;
  summary    += `${"=".repeat(64)}\n`;
  summary    += `Toplam Chunk: ${totalChunks}\n`;
  summary    += `Ortalama Confidence: ${(allStats.reduce((a,b)=>a+b.avgConf, 0)/(allStats.length||1)).toFixed(2)}\n`;
  summary    += `Layer1 ile biten chunk oranı: %${((layer1PassCount / (totalChunks || 1)) * 100).toFixed(1)}\n`;
  summary    += `Layer2 ile biten chunk oranı: %${((layer2PassCount / (totalChunks || 1)) * 100).toFixed(1)}\n`;
  summary    += `Layer3'e düşen chunk oranı: %${((layer3RetryCount / (totalChunks || 1)) * 100).toFixed(1)}\n`;
  summary    += `Rule-based fallback'e düşen chunk oranı: %${((ruleBasedFallbackCount / (totalChunks || 1)) * 100).toFixed(1)}\n`;
  summary    += `Toplam AI Çağrısı: ${totalAiCalls} (Katman1: ${pdfs.length} + Katman2: ${pdfs.length} + Katman3: ${layer3RetryCount})\n`;
  summary    += `Tahmini Maliyet: $${totalEstimatedCost.toFixed(4)}\n\n`;

  summary    += `Örnekler:\n`;
  summary    += `- Katman 2'de düzeltilen bir chunk:\n`;
  if (l2CorrectionExamples.length === 0) {
    summary += `  (Katman 2 tüm chunk'ları yüksek skorla doğruladı, majör düzeltme gerekmedi)\n`;
  } else {
    l2CorrectionExamples.forEach(ex => { summary += `  * ${ex}\n`; });
  }

  summary    += `- Katman 3'e düşüp düzelen bir chunk:\n`;
  if (l3RetryExamples.length === 0) {
    summary += `  (Katman 3'e düşen düşük skorlu chunk bulunmadı - tüm skorlar >= 70 çıktı)\n`;
  } else {
    l3RetryExamples.forEach(ex => { summary += `  * ${ex}\n`; });
  }

  summary    += `- Rule-based'e düşen bir chunk:\n`;
  if (ruleBasedExamples.length === 0) {
    summary += `  (Rule-based fallback'e düşen chunk bulunmadı)\n`;
  } else {
    ruleBasedExamples.forEach(ex => { summary += `  * ${ex}\n`; });
  }

  summary    += `${"=".repeat(64)}\n`;

  fs.appendFileSync(REPORT_PATH, summary, "utf-8");
}, 600_000);




// ─── JEST TEST SUITE ────────────────────────────────────────────────────
describe("Canva CV Real PDF — Chunking Kalite Testleri", () => {

  test("1. Tüm PDF'ler başarıyla chunklandi (chunk > 0)", () => {
    expect(pdfs.length).toBeGreaterThan(0);
    for (const stat of allStats) {
      expect(stat.chunkCount).toBeGreaterThan(0);
    }
  });

  test("2. Her CV'nin ortalama confidence'ı >= 0.70 olmalı", () => {
    for (const stat of allStats) {
      expect(stat.avgConf).toBeGreaterThanOrEqual(0.70);
    }
  });

  test("3. Genel ortalama confidence >= 0.80 olmalı", () => {
    const total   = allStats.reduce((s, r) => s + r.avgConf, 0);
    const overall = allStats.length > 0 ? total / allStats.length : 0;
    console.log(`[Genel Avg Confidence] ${overall.toFixed(2)}`);
    expect(overall).toBeGreaterThanOrEqual(0.80);
  });

  test("4. 0.6 altı confidence'lı chunk oranı <= %20 olmalı", () => {
    const totalChunks  = allStats.reduce((s, r) => s + r.chunkCount, 0);
    const totalLowConf = allStats.reduce((s, r) => s + r.lowConfCount, 0);
    const ratio = totalChunks > 0 ? totalLowConf / totalChunks : 0;
    console.log(`[Low Conf Chunks] ${totalLowConf}/${totalChunks} (${(ratio * 100).toFixed(1)}%)`);
    expect(ratio).toBeLessThanOrEqual(0.20);
  });

  test("5. Her chunk metadata alanlarına sahip (method, confidence, wordCount, order)", () => {
    for (const stat of allStats) {
      for (const chunk of stat.chunks) {
        expect(chunk.metadata).toBeDefined();
        expect(["primary_ai", "rule_based", "ai_fallback", "hard_fallback"]).toContain(chunk.metadata.method);
        expect(typeof chunk.metadata.confidence).toBe("number");
        expect(typeof chunk.metadata.wordCount).toBe("number");
        expect(typeof chunk.metadata.order).toBe("number");
      }
    }
  });

  test("6. chunking_report.txt oluşturuldu ve dolu", () => {
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
    const content = fs.readFileSync(REPORT_PATH, "utf-8");
    expect(content.length).toBeGreaterThan(500);
    console.log(`[Report] chunking_report.txt — ${Math.round(content.length / 1024)} KB, ${pdfs.length} CV işlendi`);
  });

});
