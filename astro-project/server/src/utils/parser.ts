import { PDFParse } from "pdf-parse";

/**
 * Extracts raw text content from a PDF Buffer using pdf-parse.
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const textResult = await parser.getText();
    return textResult.text || "";
  } catch (error) {
    console.error("PDF metin çıkarma hatası:", error);
    throw new Error("PDF dosyası okunurken hata oluştu.");
  } finally {
    await parser.destroy();
  }
}

// Common resume section headings in Turkish and English (normalized lowercase comparison)
const SECTION_HEADINGS = [
  "iş deneyimi", "iş deneyimleri", "deneyimler", "deneyim", "work experience", "experience", "work history",
  "eğitim", "eğitim bilgileri", "education", "academic background",
  "yetenekler", "teknik yetenekler", "skills", "technical skills", "skills & tools",
  "projeler", "projelerim", "projects", "personal projects",
  "sertifikalar", "sertifikalarım", "certificates", "certifications",
  "diller", "yabancı diller", "languages",
  "hakkımda", "özet", "summary", "about me", "personal summary",
  "iletişim", "contact", "contact info",
  "referanslar", "references"
];

/**
 * Utility to split long texts into smaller chunks using a sliding window word boundary.
 */
function splitTextSlidingWindow(text: string, maxWords = 200, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= maxWords) return [text];

  const subChunks: string[] = [];
  const step = maxWords - overlap;
  for (let i = 0; i < words.length; i += step) {
    const chunkWords = words.slice(i, i + maxWords);
    if (chunkWords.length > 0) {
      subChunks.push(chunkWords.join(" "));
    }
    if (i + maxWords >= words.length) break;
  }
  return subChunks;
}

/**
 * Splits resume text into semantic chunks based on section headers (e.g., Education, Experience).
 * If a section is too long, splits it further using a sliding window helper to respect embedding tokens.
 */
export function chunkTextBySections(text: string): string[] {
  if (!text || text.trim() === "") return [];

  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentSectionTitle = "Kişisel Bilgiler / Özet";
  let currentSectionLines: string[] = [];

  // Helper for Turkish-friendly string normalization
  const normalize = (str: string) => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/ı/g, "i")
      .replace(/i̇/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .trim();
  };

  const saveCurrentSection = () => {
    if (currentSectionLines.length > 0) {
      const content = currentSectionLines.join("\n").trim();
      if (content !== "") {
        // If the section is very long, sub-chunk it to avoid embedding token limit issues
        const subChunks = splitTextSlidingWindow(content, 250, 50);
        subChunks.forEach((sub, subIdx) => {
          const suffix = subChunks.length > 1 ? ` (Kısım ${subIdx + 1})` : "";
          chunks.push(`[${currentSectionTitle.toUpperCase()}${suffix}]\n${sub}`);
        });
      }
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    // Check if the line matches one of the section headings
    const isHeading = line.length < 45 && SECTION_HEADINGS.some(heading => {
      return normalize(line) === normalize(heading);
    });

    if (isHeading) {
      saveCurrentSection();
      // Start new section
      currentSectionTitle = line;
      currentSectionLines = [];
    } else {
      currentSectionLines.push(rawLine);
    }
  }

  // Save the last section
  saveCurrentSection();

  return chunks;
}
