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

  const matchHeading = (line: string): string | null => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return null;
    
    // Header should not end with punctuation like a sentence
    if (trimmed.endsWith(".") || trimmed.endsWith(",") || trimmed.endsWith(";")) return null;
    
    const norm = normalize(trimmed);
    const wordCount = trimmed.split(/\s+/).length;
    
    // We only match short lines (e.g. <= 4 words)
    if (wordCount > 4) return null;

    const categories = [
      { key: "deneyim", label: "Deneyimler" },
      { key: "tecrube", label: "Deneyimler" },
      { key: "experience", label: "Deneyimler" },
      { key: "history", label: "Deneyimler" },
      { key: "staj", label: "Deneyimler" },
      { key: "employment", label: "Deneyimler" },
      { key: "career", label: "Deneyimler" },
      
      { key: "egitim", label: "Eğitim" },
      { key: "education", label: "Eğitim" },
      { key: "academic", label: "Eğitim" },
      { key: "okul", label: "Eğitim" },
      { key: "universite", label: "Eğitim" },
      { key: "lisans", label: "Eğitim" },
      
      { key: "yetenek", label: "Yetenekler" },
      { key: "skills", label: "Yetenekler" },
      { key: "tools", label: "Yetenekler" },
      { key: "teknoloji", label: "Yetenekler" },
      
      { key: "proje", label: "Projeler" },
      { key: "projects", label: "Projeler" },
      
      { key: "sertifika", label: "Sertifikalar" },
      { key: "certificate", label: "Sertifikalar" },
      { key: "kurs", label: "Sertifikalar" },
      { key: "seminer", label: "Sertifikalar" },
      
      { key: "dil", label: "Diller" },
      { key: "language", label: "Diller" },
      
      { key: "hakkimda", label: "Hakkımda" },
      { key: "ozet", label: "Hakkımda" },
      { key: "summary", label: "Hakkımda" },
      { key: "about me", label: "Hakkımda" },
      { key: "profile", label: "Hakkımda" },
      { key: "profil", label: "Hakkımda" },
      
      { key: "iletisim", label: "İletişim" },
      { key: "contact", label: "İletişim" },
      
      { key: "referans", label: "Referanslar" },
      { key: "references", label: "Referanslar" }
    ];

    for (const cat of categories) {
      if (norm.includes(cat.key)) {
        return cat.label;
      }
    }

    return null;
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

    const matchedTitle = matchHeading(line);

    if (matchedTitle) {
      saveCurrentSection();
      // Start new section
      currentSectionTitle = matchedTitle;
      currentSectionLines = [];
    } else {
      currentSectionLines.push(rawLine);
    }
  }

  // Save the last section
  saveCurrentSection();

  return chunks;
}
