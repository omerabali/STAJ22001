import "../src/load-env.js";
import fs from "fs";
import { chunkTextBySections } from "../src/utils/parser.js";
import { GROUND_TRUTH_CVS } from "./fixtures/ground_truth_dataset.js";

import { GROUND_TRUTH_CVS } from "./fixtures/ground_truth_dataset.js";

async function generateBaseline() {
  let report = "==================================================\n";
  report += "📌 BASELINE CHUNKING REPORT (BEFORE REFACTOR)\n";
  report += `Date: ${new Date().toISOString()}\n`;
  report += "==================================================\n\n";

  // Force local rule parser for deterministic reproducible baseline
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  let totalChunks = 0;

  for (const item of GROUND_TRUTH_CVS) {
    const chunks = await chunkTextBySections(item.rawText);
    totalChunks += chunks.length;

    report += `--- CV: ${item.id} (${item.name || "Untitled"}) ---\n`;
    report += `Total Chunks: ${chunks.length}\n`;
    
    chunks.forEach((c: any, idx: number) => {
      const title = c.metadata?.originalTitle || c.metadata?.sectionKey || "Bölüm";
      const type = c.metadata?.type || 'SECTION';
      const conf = c.metadata?.confidence ?? 1.0;
      const snippet = (c.chunkText || "").replace(/\n/g, " ").slice(0, 70);
      report += `  [Chunk ${idx + 1}] Title: "${title}" | Type: ${type} | Conf: ${conf}\n`;
      report += `     Snippet: "${snippet}..."\n`;
    });
    report += "\n";
  }

  process.env.OPENAI_API_KEY = originalApiKey;

  report += `==================================================\n`;
  report += `SUMMARY: Total CVs Analyzed: ${GROUND_TRUTH_CVS.length} | Total Chunks Generated: ${totalChunks}\n`;
  report += `==================================================\n`;

  fs.writeFileSync("tests/baseline_after_step1.txt", report);
  console.log("✅ Step 1 baseline report saved successfully!");
}

generateBaseline();
