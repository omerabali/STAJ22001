/**
 * PdfTextExtractor.ts (Gelişmiş PDF Metin Okuma & Sütun Ayrıştırma Motoru)
 * Görevi: Yüklenen PDF dosyasının ham metnini okur. İki veya üç sütunlu CV tasarımlarını (Canva vb.)
 * düşey izdüşüm analizi (Projection Profile Analysis) ile tespit ederek doğru okuma sırasına sokar.
 */
import { PDFParse } from "pdf-parse";
import { preprocessTwoColumnText } from "../../domain/cv/CvTextPreprocessor.js";

/**
 * 1. ADIM: SÜTUN TESPİTİ (detectColumns)
 * Görevi: Sayfadaki harflerin X (yatay) konumlarını analiz eder.
 * Harflerin olmadığı en az 25 piksel genişliğindeki dikey boşluğu (Gutter / Sütun Çizgisi) bulur.
 */
function detectColumns(
  items: { x: number; y: number; text: string }[],
  pageWidth: number,
  pageHeight: number
): number[] {
  const steps = Math.floor(pageWidth);
  const profile = new Array(steps).fill(0);
  const charWidth = 4.0; // Tahmini karakter genişliği (piksel)

  // Sayfanın en üst %16 (Header) ve en alt %10 (Footer) kısımlarını hariç tut (Sadece gövdeye bak)
  const bodyItems = items.filter((i) => i.y > pageHeight * 0.10 && i.y < pageHeight * 0.84);

  // Harflerin yatay kapsama alanını (X eksenini) haritalandır
  for (const item of bodyItems) {
    const startX = Math.max(0, Math.floor(item.x));
    const endX = Math.min(steps - 1, Math.floor(item.x + item.text.length * charWidth));
    for (let x = startX; x <= endX; x++) {
      profile[x]++;
    }
  }

  const boundaries: number[] = [];
  const minGutterWidth = 25; // En az 25px dikey boşluk varsa orayı sütun çizgisi kabul et
  const maxIntersects = 1;

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
          // Çizginin hem solunda hem sağında en az 4 harf/kelime var mı kontrol et
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
 * 2. ADIM: METİNLERİ SATIRA DÖNÜŞTÜRME & BOŞLUK HESABI (groupItemsIntoText)
 * Görevi: Y koordinatı yakın olan kelimeleri aynı satırda birleştirir.
 * Font boyutuna göre kelimelerin birleşik mi yoksa ayrı mı olduğunu anlar.
 */
function groupItemsIntoText(
  items: { x: number; y: number; text: string; fontSize?: number }[],
  yTolerance = 6
): string {
  if (items.length === 0) return "";

  type Line = { y: number; parts: { x: number; text: string; fontSize: number }[] };
  const lines: Line[] = [];

  // Y yükseklik farkı 6px'den az olan kelimeleri aynı satır grubuna al
  for (const item of items) {
    const existing = lines.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    const fs = item.fontSize ?? 10;
    if (existing) {
      existing.parts.push({ x: item.x, text: item.text, fontSize: fs });
    } else {
      lines.push({ y: item.y, parts: [{ x: item.x, text: item.text, fontSize: fs }] });
    }
  }

  // Satırları yukarıdan aşağıya (b.y - a.y) doğru sırala
  lines.sort((a, b) => b.y - a.y);

  return lines
    .map((line) => {
      // Satır içindeki kelimeleri soldan sağa (a.x - b.x) doğru sırala
      const sorted = line.parts.sort((a, b) => a.x - b.x);
      let mergedText = "";
      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        if (i === 0) {
          mergedText = curr.text;
        } else {
          const prev = sorted[i - 1];
          // Font boyutuna göre harf genişliği hesabı
          const prevCharWidth = Math.max(3.6, prev.fontSize * 0.55);
          const prevEndPos = prev.x + (prev.text.length * prevCharWidth);

          // İki kelime arası mesafe 2px'den azsa birleştir, çoksa boşluk koy
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
 * 3. ADIM: ANA PDF OKUMA VE SÜTUN YENİDEN YAPILANDIRMA (extractTextFromPDF)
 * Görevi: PDF dosyasını okur, üst/alt sayfa numarası çöplerini temizler,
 * 2 sütunlu tasarımlarda önce sol sütunu sonra sağ sütunu birleştirip metin çıktısı üretir.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
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

    // PDF'in tüm sayfalarını sırayla gez
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const textContent = await page.getTextContent();

      // En üst %6 (Header) ve en alt %6 (Footer / Sayfa no) sınırları
      const topBoundary = pageHeight * 0.94;
      const bottomBoundary = pageHeight * 0.06;

      const allItems: { x: number; y: number; text: string; fontSize: number }[] = [];
      for (const item of textContent.items as any[]) {
        if (item.str && item.str.trim()) {
          const x = item.transform[4];
          const y = item.transform[5];
          const fontSize = Math.abs(item.transform[3]) || 10;
          const txt = item.str.trim();

          // Çöp sayfa numaralarını ve alt/üst bilgileri atla
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

      // Kelimeleri aynı yükseklikteki satırlara topla
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

      // Satırları yukarıdan aşağıya diz
      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
      }

      // Otomatik Sütun Boşluğu Tespiti (Örn: Sol sütun ile Sağ sütun arası çizgi)
      let boundaries = detectColumns(allItems, pageWidth, pageHeight);

      // Birden fazla sınır varsa en mantıklı ana sütun ayrımını seç
      if (boundaries.length > 1) {
        const leftSidebarBoundary = boundaries.find(b => b >= pageWidth * 0.18 && b <= pageWidth * 0.44);
        const rightSidebarBoundary = [...boundaries].reverse().find(b => b >= pageWidth * 0.56 && b <= pageWidth * 0.82);

        if (leftSidebarBoundary !== undefined) {
          boundaries = [leftSidebarBoundary];
        } else if (rightSidebarBoundary !== undefined) {
          boundaries = [rightSidebarBoundary];
        } else {
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
      }

      let pageText: string;
      if (boundaries.length > 0) {
        // ÇOKLU SÜTUN YENİDEN YAPILANDIRMASI
        type ColItem = { x: number; y: number; text: string; fontSize: number };
        type PageBlock =
          | { type: "spanning"; text: string } // Tüm genişliği kaplayan ana başlıklar
          | { type: "columns"; cols: ColItem[][] }; // Sütun içerikleri

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

          const avgFontSize = line.items.reduce((sum, i) => sum + i.fontSize, 0) / line.items.length;

          // Büyük punto ana başlıklar (Aday adı vb.) sütunları böler, tam genişlik kabul edilir
          const allOnOneSide = boundaries.every(b =>
            line.items.every(i => i.x < b) || line.items.every(i => i.x >= b)
          );
          let isSpanning = allOnOneSide && (line.y > pageHeight * 0.80 || avgFontSize >= 14);

          if (!isSpanning) {
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

          if (isSpanning) {
            flushColumns();
            const mappedItems = line.items.map(i => ({ x: i.x, y: line.y, text: i.text, fontSize: i.fontSize }));
            blocks.push({ type: "spanning", text: groupItemsIntoText(mappedItems) });
          } else {
            // Kelimeleri ait oldukları sütunlara dağıt
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

        // ÖNCE SOL SÜTUNU, SONRA SAĞ SÜTUNU BAŞTAN SONA BİRLEŞTİR
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
      } else {
        // Tek sütunlu standart CV ise doğrudan yukarıdan aşağıya oku
        pageText = groupItemsIntoText(allItems);
      }

      page.cleanup();
      if (pageText.trim()) pageTexts.push(pageText.trim());
    }

    // Temizlenen metni son Türkçe/İngilizce çift sütun preprocessor'ına gönder
    return preprocessTwoColumnText(pageTexts.join("\n\n"));

  } catch (err) {
    console.warn("[PDF] pdfjs-dist extraction failed, falling back to pdf-parse:", (err as Error).message);

    // Hata durumunda 2. Yedek Motor (pdf-parse) devreye girer
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const result = await parser.getText();
      return preprocessTwoColumnText(result.text || "");
    } finally {
      await parser.destroy();
    }
  }
}
