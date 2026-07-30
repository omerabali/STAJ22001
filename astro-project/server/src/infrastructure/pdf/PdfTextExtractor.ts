import { PDFParse } from "pdf-parse";
import { preprocessTwoColumnText } from "../../domain/cv/CvTextPreprocessor.js";

/**
 * Dynamically detects vertical column boundaries on a page using Projection Profile Analysis.
 * Scans vertical projection of character boundaries and finds low-density zones (gutters).
 */
function detectColumns(
  items: { x: number; y: number; text: string }[],
  pageWidth: number,
  pageHeight: number
): number[] {
  const steps = Math.floor(pageWidth);
  const profile = new Array(steps).fill(0);
  const charWidth = 4.0; // conservative character width estimate in points

  // Filter out top 16% (header) and bottom 10% (footer) to get columns profile
  const bodyItems = items.filter((i) => i.y > pageHeight * 0.10 && i.y < pageHeight * 0.84);

  // Project item bounding boxes onto the x-axis
  for (const item of bodyItems) {
    const startX = Math.max(0, Math.floor(item.x));
    const endX = Math.min(steps - 1, Math.floor(item.x + item.text.length * charWidth));
    for (let x = startX; x <= endX; x++) {
      profile[x]++;
    }
  }

  const boundaries: number[] = [];
  const minGutterWidth = 25; // minimum width of vertical empty space to call it a column gap
  const maxIntersects = 1;   // strictly tolerate minor overlaps in body

  let gutterStart = -1;
  for (let x = Math.floor(pageWidth * 0.15); x < Math.floor(pageWidth * 0.85); x++) {
    if (profile[x] <= maxIntersects) {
      if (gutterStart === -1) {
        gutterStart = x;
      }
    } else {
      if (gutterStart !== -1) {
        const gutterWidth = x - gutterStart;
        if (gutterWidth >= minGutterWidth) {
          const boundary = Math.floor((gutterStart + x) / 2);
          // Verify both sides have meaningful text content
          const leftCount = items.filter((i) => i.x < boundary).length;
          const rightCount = items.filter((i) => i.x >= boundary).length;
          
          if (leftCount >= 4 && rightCount >= 4) {
            boundaries.push(boundary);
          }
        }
        gutterStart = -1;
      }
    }
  }

  if (gutterStart !== -1) {
    const endScan = Math.floor(pageWidth * 0.85);
    const gutterWidth = endScan - gutterStart;
    if (gutterWidth >= minGutterWidth) {
      const boundary = Math.floor((gutterStart + endScan) / 2);
      const leftCount = items.filter((i) => i.x < boundary).length;
      const rightCount = items.filter((i) => i.x >= boundary).length;
      if (leftCount >= 4 && rightCount >= 4) {
        boundaries.push(boundary);
      }
    }
  }

  return boundaries.sort((a, b) => a - b);
}

/**
 * Groups pdfjs text items into lines based on y-coordinate proximity.
 * Returns a single string with newline-separated lines.
 * Items may carry an optional `fontSize` field for accurate gap detection.
 */
function groupItemsIntoText(
  items: { x: number; y: number; text: string; fontSize?: number }[],
  yTolerance = 6
): string {
  if (items.length === 0) return "";

  type Line = { y: number; parts: { x: number; text: string; fontSize: number }[] };
  const lines: Line[] = [];

  for (const item of items) {
    const existing = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    const fs = item.fontSize ?? 10;
    if (existing) {
      existing.parts.push({ x: item.x, text: item.text, fontSize: fs });
    } else {
      lines.push({ y: item.y, parts: [{ x: item.x, text: item.text, fontSize: fs }] });
    }
  }

  // Sort lines top-to-bottom
  lines.sort((a, b) => b.y - a.y);

  return lines
    .map((line) => {
      const sorted = line.parts.sort((a, b) => a.x - b.x);
      let mergedText = "";
      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        if (i === 0) {
          mergedText = curr.text;
        } else {
          const prev = sorted[i - 1];
          // Use font-size-aware char width: 0.55 * fontSize, min 3.6pt
          const prevCharWidth = Math.max(3.6, prev.fontSize * 0.55);
          const prevEndPos = prev.x + (prev.text.length * prevCharWidth);
          
          if (curr.x - prevEndPos < 2.0) {
            mergedText += curr.text;
          } else {
            mergedText += " " + curr.text;
          }
        }
      }
      return mergedText;
    })
    .filter((l) => l.trim().length > 0)
    .join("\n");
}

/**
 * Extracts raw text from a PDF buffer using pdfjs-dist with coordinate awareness.
 *
 * Strategy:
 * 1. For each page, collect all text items with their (x, y) coordinates.
 * 2. Detect whether the page has a 2-column layout by checking if significant
 *    text mass exists on both sides of the page midpoint.
 * 3. If 2-column: emit left column lines first (top→bottom), then right column
 *    lines — preserving correct reading order for section headings and content.
 * 4. If single column: emit all items sorted top→bottom, left→right.
 * 5. Apply the existing preprocessTwoColumnText post-processor.
 *
 * Falls back to the legacy pdf-parse extractor on any error.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use the legacy build as recommended for Node.js environments
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const uint8 = new Uint8Array(pdfBuffer);
    const loadingTask = (pdfjs as any).getDocument({
      data: uint8,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      disableWorker: true,   // Run in same thread — no separate worker needed
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const textContent = await page.getTextContent();

      // Page boundary cleaning: filter out page numbers, headers, and footers
      const topBoundary = pageHeight * 0.94;
      const bottomBoundary = pageHeight * 0.06;
      
      // Store font size alongside items — pdfjs provides it in the transform matrix
      // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
      // Font size ≈ Math.abs(transform[3]) (scaleY)
      const allItems: { x: number; y: number; text: string; fontSize: number }[] = [];
      for (const item of textContent.items as any[]) {
        if (item.str && item.str.trim()) {
          const x = item.transform[4];
          const y = item.transform[5];
          const fontSize = Math.abs(item.transform[3]) || 10; // fallback 10pt
          const txt = item.str.trim();
          
          // Skip typical page numbers/footers at boundaries
          const isAtBoundary = y > topBoundary || y < bottomBoundary;
          const isPageNumPattern = /^(?:page|sayfa)?\s*\d+\s*(?:\/|of|-)?\s*\d*\s*$/i.test(txt) || /^--\s*\d+\s*of\s*\d+\s*--$/i.test(txt);
          if (isAtBoundary && isPageNumPattern) {
            continue;
          }
          
          allItems.push({ x, y, text: item.str, fontSize });
        }
      }

      if (allItems.length === 0) {
        page.cleanup();
        continue;
      }

      // Group items into lines — carry font size per item
      const yTolerance = 6;
      type LineItem = { x: number; text: string; fontSize: number };
      type Line = { y: number; items: LineItem[] };
      const lines: Line[] = [];

      for (const item of allItems) {
        const existing = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
        if (existing) {
          existing.items.push({ x: item.x, text: item.text, fontSize: item.fontSize });
        } else {
          lines.push({ y: item.y, items: [{ x: item.x, text: item.text, fontSize: item.fontSize }] });
        }
      }

      // Sort lines top-to-bottom
      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
      }

      // Dynamic Column Detection
      let boundaries = detectColumns(allItems, pageWidth, pageHeight);

      // Post-process boundaries to keep at most 1 boundary (typically sidebar vs main body separator)
      if (boundaries.length > 1) {
        const leftSidebarBoundary = boundaries.find(b => b >= pageWidth * 0.18 && b <= pageWidth * 0.44);
        const rightSidebarBoundary = [...boundaries].reverse().find(b => b >= pageWidth * 0.56 && b <= pageWidth * 0.82);

        if (leftSidebarBoundary !== undefined) {
          boundaries = [leftSidebarBoundary];
        } else if (rightSidebarBoundary !== undefined) {
          boundaries = [rightSidebarBoundary];
        } else {
          // Keep the one closest to a typical 30% width sidebar
          const target = pageWidth * 0.30;
          let best = boundaries[0];
          let minDiff = Math.abs(best - target);
          for (const b of boundaries) {
            const diff = Math.abs(b - target);
            if (diff < minDiff) {
              minDiff = diff;
              best = b;
            }
          }
          boundaries = [best];
        }
        console.log(`[PDF] Filtered multiple column boundaries. Kept: ${boundaries[0]} from original: [${boundaries.join(", ")}]`);
      }

      let pageText: string;
      if (boundaries.length > 0) {
        // Multi-column reconstruction with full-width spanning lines (headers/footers) support
        type ColItem = { x: number; y: number; text: string; fontSize: number };
        type PageBlock = 
          | { type: "spanning"; text: string }
          | { type: "columns"; cols: ColItem[][] };

        const blocks: PageBlock[] = [];
        let currentCols: ColItem[][] = Array.from({ length: boundaries.length + 1 }, () => []);

        const flushColumns = () => {
          const hasContent = currentCols.some((c) => c.length > 0);
          if (hasContent) {
            blocks.push({ type: "columns", cols: currentCols });
            currentCols = Array.from({ length: boundaries.length + 1 }, () => []);
          }
        };

        for (const line of lines) {
          if (line.items.length === 0) continue;

          // Compute average font size for this line — large font = name/title = spanning
          const avgFontSize = line.items.reduce((sum, i) => sum + i.fontSize, 0) / line.items.length;

          // Rule 1: Top 20% of page OR large font — but ONLY if items don't straddle a column boundary.
          const allOnOneSide = boundaries.every(b => 
            line.items.every(i => i.x < b) || line.items.every(i => i.x >= b)
          );
          let isSpanning = allOnOneSide && (line.y > pageHeight * 0.80 || avgFontSize >= 14);

          if (!isSpanning) {
            // Rule 3: Check if any single item physically crosses a column boundary
            for (const item of line.items) {
              const startX = item.x;
              const itemCharWidth = Math.max(3.6, item.fontSize * 0.55);
              const endX = item.x + item.text.length * itemCharWidth;
              for (const b of boundaries) {
                if (startX < b - 8 && endX > b + 8) {
                  isSpanning = true;
                  break;
                }
              }
              if (isSpanning) break;
            }
          }

          // Rule 4: If not spanning, check if there is a gap at boundaries on this line
          if (!isSpanning) {
            for (const b of boundaries) {
              const leftItems = line.items.filter((item) => item.x < b);
              const rightItems = line.items.filter((item) => item.x >= b);
              
              if (leftItems.length > 0 && rightItems.length > 0) {
                const rightmostLeft = leftItems[leftItems.length - 1];
                const leftmostRight = rightItems[0];
                const leftCharWidth = Math.max(3.6, rightmostLeft.fontSize * 0.55);
                const leftEnd = rightmostLeft.x + rightmostLeft.text.length * leftCharWidth;
                const rightStart = leftmostRight.x;
                
                const gap = rightStart - leftEnd;
                if (gap < 20) { // Gutter is too small on this line -> treat line as spanning/full-width
                  isSpanning = true;
                  break;
                }
              }
            }
          }

          if (isSpanning) {
            flushColumns();
            // Pass fontSize through so groupItemsIntoText can use accurate gap detection
            const mappedItems = line.items.map(i => ({ x: i.x, y: line.y, text: i.text, fontSize: i.fontSize }));
            blocks.push({ type: "spanning", text: groupItemsIntoText(mappedItems) });
          } else {
            // Split line parts into respective columns
            for (let c = 0; c <= boundaries.length; c++) {
              const prevBound = c === 0 ? 0 : boundaries[c - 1];
              const nextBound = c < boundaries.length ? boundaries[c] : pageWidth;
              
              const colItems = line.items.filter((item) => item.x >= prevBound && item.x < nextBound);
              if (colItems.length > 0) {
                const mappedColItems = colItems.map(i => ({ x: i.x, y: line.y, text: i.text, fontSize: i.fontSize }));
                currentCols[c].push(...mappedColItems);
              }
            }
          }
        }
        flushColumns();

        // Assemble page block text
        const assembledBlocks: string[] = [];
        for (const block of blocks) {
          if (block.type === "spanning") {
            assembledBlocks.push(block.text);
          } else {
            for (let c = 0; c < block.cols.length; c++) {
              const colText = groupItemsIntoText(block.cols[c]);
              if (colText) assembledBlocks.push(colText);
            }
          }
        }
        pageText = assembledBlocks.join("\n");
        console.log(`[PDF] Page ${pageNum}: Block reconstructed multi-column (Columns: ${boundaries.length + 1}, boundaries: ${boundaries.join(", ")})`);
      } else {
        pageText = groupItemsIntoText(allItems);
      }

      page.cleanup();
      if (pageText.trim()) pageTexts.push(pageText.trim());
    }

    return preprocessTwoColumnText(pageTexts.join("\n\n"));

  } catch (err) {
    console.warn("[PDF] pdfjs-dist extraction failed, falling back to pdf-parse:", (err as Error).message);

    // Legacy fallback
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const result = await parser.getText();
      return preprocessTwoColumnText(result.text || "");
    } finally {
      await parser.destroy();
    }
  }
}
