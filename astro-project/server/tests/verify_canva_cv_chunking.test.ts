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
    `CANVA CV CHUNKING REPORT (LAYOUT-AWARE PDFJS-DIST)\nOluşturulma: ${new Date().toISOString()}\nToplam PDF: ${pdfs.length}\n\n`,
    "utf-8"
  );

  for (const { label, filePath } of pdfs) {
    let lines = "";
    lines += `${"=".repeat(64)}\n`;
    lines += `CV: ${label}\n`;

    try {
      const text   = await extractText(filePath);
      const chunks = await chunkTextBySections(text);

      const confidences  = chunks.map((c: any) => c.metadata?.confidence ?? 0);
      const avgConf      = confidences.length
        ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
        : 0;
      const lowConfCount = confidences.filter((c: number) => c < 0.6).length;

      allStats.push({ label, chunkCount: chunks.length, avgConf, lowConfCount, chunks });

      lines += `Toplam Chunk Sayısı: ${chunks.length}\n`;
      lines += `Ortalama Confidence: ${avgConf.toFixed(2)}\n`;
      lines += `${"=".repeat(64)}\n\n`;

      chunks.forEach((chunk: any, i: number) => {
        const originalTitle    = chunk.metadata?.originalTitle || chunk.metadata?.section || "Bilinmiyor";
        const type             = chunk.metadata?.type || chunk.sectionType || "other";
        const conf             = (chunk.metadata?.confidence ?? 0).toFixed(2);
        const extractionMethod = chunk.metadata?.extractionMethod || "layout_aware";
        const chunkingMethod   = chunk.metadata?.method || "rule_based";
        const reasoning        = chunk.metadata?.reasoning || (chunk.metadata?.source ? `Kural/Kaynak: ${chunk.metadata.source}` : "Dinamik kural eşleşmesi");
        
        lines += `[Chunk ${i + 1}] originalTitle: ${originalTitle} | type: ${type} | Confidence: ${conf}\n`;
        lines += `extractionMethod: ${extractionMethod} | chunkingMethod: ${chunkingMethod}\n`;
        lines += `Reasoning: ${reasoning}\n`;
        lines += `${"-".repeat(60)}\n`;
        lines += `${(chunk.text ?? chunk.chunkText ?? "").trim()}\n\n`;
      });

    } catch (e: any) {
      console.error(`[ERROR] ${label}: ${e.message}`);
      allStats.push({ label, chunkCount: 0, avgConf: 0, lowConfCount: 0, chunks: [] });
      lines += `Toplam Chunk Sayısı: 0\nOrtalama Confidence: 0.00\n`;
      lines += `${"=".repeat(64)}\n\n`;
      lines += `[HATA] ${e.message}\n\n`;
    }

    lines += `\n>>> BİR SONRAKİ CV'YE GEÇ\n\n\n`;
    fs.appendFileSync(REPORT_PATH, lines, "utf-8");
  }

  // ── Global summary ──
  const totalLowConf = allStats.reduce((s, r) => s + r.lowConfCount, 0);
  const withChunks   = allStats.filter(r => r.chunkCount > 0);
  const lowest  = withChunks.reduce((a, b) => a.avgConf < b.avgConf ? a : b, withChunks[0]);
  const highest = withChunks.reduce((a, b) => a.avgConf > b.avgConf ? a : b, withChunks[0]);

  let summary = `${"=".repeat(64)}\nGENEL ÖZET\n${"=".repeat(64)}\n`;
  summary    += `Toplam İşlenen CV: ${pdfs.length}\n`;
  summary    += `En Düşük Ortalama Confidence: ${lowest?.label ?? "-"} (${lowest?.avgConf.toFixed(2) ?? "0.00"})\n`;
  summary    += `En Yüksek Ortalama Confidence: ${highest?.label ?? "-"} (${highest?.avgConf.toFixed(2) ?? "0.00"})\n`;
  summary    += `0.6 Altı Confidence'lı Chunk Sayısı: ${totalLowConf}\n`;
  summary    += `${"=".repeat(64)}\n`;

  fs.appendFileSync(REPORT_PATH, summary, "utf-8");
}, 300_000);

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
