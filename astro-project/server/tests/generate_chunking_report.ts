import fs from "fs";
import path from "path";
import { extractTextFromPDF } from "../src/utils/parser.js";
import { chunkTextBySections } from "../src/utils/parser.js";

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures");
const CV_TEST_DIR = path.join(process.cwd(), "tests", "cv_test");
const REPORT_PATH = path.join(FIXTURES_DIR, "chunking_report.txt");

// Collect all PDFs: fixtures first, then cv_test
function collectPDFs(): string[] {
  const results: string[] = [];

  // From fixtures/
  if (fs.existsSync(FIXTURES_DIR)) {
    const fixFiles = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".pdf")).sort();
    for (const f of fixFiles) results.push(path.join(FIXTURES_DIR, f));
  }

  // From cv_test/
  if (fs.existsSync(CV_TEST_DIR)) {
    const cvFiles = fs.readdirSync(CV_TEST_DIR).filter(f => f.endsWith(".pdf")).sort();
    for (const f of cvFiles) results.push(path.join(CV_TEST_DIR, f));
  }

  return results;
}

async function main() {
  const pdfs = collectPDFs();

  // Clear / create report file
  fs.writeFileSync(REPORT_PATH, `CANVA CV CHUNKING REPORT\nOluşturulma: ${new Date().toISOString()}\nToplam PDF: ${pdfs.length}\n\n`, "utf-8");

  const globalStats: Array<{ name: string; avgConf: number; lowConfChunks: number }> = [];
  let totalLowConf = 0;

  for (const pdfPath of pdfs) {
    const fileName = path.basename(pdfPath);
    let lines = "";

    lines += `${"=".repeat(64)}\n`;
    lines += `CV: ${fileName}\n`;

    try {
      const buffer = fs.readFileSync(pdfPath);
      const text = await extractTextFromPDF(buffer);
      const chunks = chunkTextBySections(text);

      const confidences = chunks.map((c: any) => c.metadata?.confidence ?? 0);
      const avgConf = confidences.length > 0
        ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
        : 0;
      const lowConf = confidences.filter((c: number) => c < 0.6).length;

      totalLowConf += lowConf;
      globalStats.push({ name: fileName, avgConf, lowConfChunks: lowConf });

      lines += `Toplam Chunk Sayısı: ${chunks.length}\n`;
      lines += `Ortalama Confidence: ${avgConf.toFixed(2)}\n`;
      lines += `${"=".repeat(64)}\n\n`;

      chunks.forEach((chunk: any, i: number) => {
        const section = chunk.sectionType || chunk.section || "UNKNOWN";
        const conf = (chunk.metadata?.confidence ?? 0).toFixed(2);
        lines += `[Chunk ${i + 1}] Section: ${section} | Confidence: ${conf}\n`;
        lines += `${"-".repeat(60)}\n`;
        lines += `${chunk.text?.trim() ?? "(boş)"}\n\n`;
      });

    } catch (e: any) {
      lines += `Toplam Chunk Sayısı: 0\n`;
      lines += `Ortalama Confidence: 0.00\n`;
      lines += `${"=".repeat(64)}\n\n`;
      lines += `[HATA] ${e.message}\n\n`;
      globalStats.push({ name: fileName, avgConf: 0, lowConfChunks: 0 });
    }

    lines += `\n>>> BİR SONRAKİ CV'YE GEÇ\n\n\n`;
    fs.appendFileSync(REPORT_PATH, lines, "utf-8");
  }

  // Global summary
  let summary = `${"=".repeat(64)}\n`;
  summary += `GENEL ÖZET\n`;
  summary += `${"=".repeat(64)}\n`;
  summary += `Toplam İşlenen CV: ${pdfs.length}\n`;

  if (globalStats.length > 0) {
    const lowest = globalStats.reduce((a, b) => a.avgConf < b.avgConf ? a : b);
    const highest = globalStats.reduce((a, b) => a.avgConf > b.avgConf ? a : b);
    summary += `En Düşük Ortalama Confidence: ${lowest.name} (${lowest.avgConf.toFixed(2)})\n`;
    summary += `En Yüksek Ortalama Confidence: ${highest.name} (${highest.avgConf.toFixed(2)})\n`;
  }
  summary += `0.6 Altı Confidence'lı Chunk Sayısı: ${totalLowConf}\n`;
  summary += `${"=".repeat(64)}\n`;

  fs.appendFileSync(REPORT_PATH, summary, "utf-8");

  console.log(`chunking_report.txt oluşturuldu, ${pdfs.length} CV işlendi`);
}

main().catch(console.error);
