export class PdfExtractor {
  /**
   * Extracts clean text content from a PDF Buffer using pdfjs-dist coordinates & font sizes,
   * falling back to pdf-parse if needed.
   */
  public static async extractText(pdfBuffer: Buffer): Promise<string> {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const uint8 = new Uint8Array(pdfBuffer);
      const loadingTask = (pdfjs as any).getDocument({
        data: uint8,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
        disableWorker: true,
      });

      const pdf = await loadingTask.promise;
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        const textContent = await page.getTextContent();

        const topBoundary = pageHeight * 0.94;
        const bottomBoundary = pageHeight * 0.06;

        const allItems: { x: number; y: number; text: string; fontSize: number }[] = [];
        for (const item of textContent.items as any[]) {
          if (item.str && item.str.trim()) {
            const x = item.transform[4];
            const y = item.transform[5];
            const fontSize = Math.abs(item.transform[3]) || 10;
            const txt = item.str.trim();

            if (y > topBoundary || y < bottomBoundary) {
              if (/^(sayfa|\d+|\d+\/\d+|page)$/i.test(txt)) continue;
            }
            allItems.push({ x, y, text: txt, fontSize });
          }
        }

        const lines: { y: number; text: string }[] = [];
        const Y_TOLERANCE = 3.0;

        for (const item of allItems) {
          const existingLine = lines.find((l) => Math.abs(l.y - item.y) <= Y_TOLERANCE);
          if (existingLine) {
            existingLine.text += " " + item.text;
          } else {
            lines.push({ y: item.y, text: item.text });
          }
        }

        lines.sort((a, b) => b.y - a.y);
        pageTexts.push(lines.map((l) => l.text).join("\n"));
      }

      const extractedText = pageTexts.join("\n\n").trim();
      if (extractedText.length > 20) {
        return extractedText;
      }
    } catch (pdfJsErr) {
      console.warn("[PdfExtractor] pdfjs-dist failed, attempting pdf-parse fallback...", pdfJsErr);
    }

    // Fallback Engine: pdf-parse
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const pdfParse = require("pdf-parse");
      const fallbackData = await pdfParse(pdfBuffer);
      return (fallbackData.text || "").trim();
    } catch (fallbackErr) {
      console.error("[PdfExtractor] Both pdfjs-dist and pdf-parse failed:", fallbackErr);
      throw new Error("PDF metni çıkarılamadı. Dosya bozuk veya şifreli olabilir.");
    }
  }
}
