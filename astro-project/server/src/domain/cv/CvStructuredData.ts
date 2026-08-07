/**
 * CvStructuredData.ts (CV Yapılandırılmış Veri Etki Alanı Tipleri ve Sabitler)
 * Görevi: 2-Aşamalı (Producer / Checker) LLM extraction mimarisine ait veri tiplerini,
 * CEFR hiyerarşi haritalarını ve konfigürasyon eşik değerlerini tanımlar.
 */

export interface StructuredLanguage {
  language: string;  // Normalize dil adı (Örn: "Almanca", "İngilizce", "Fransızca")
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native"; // Normalize CEFR seviyesi
  raw: string;      // CV'de geçen ham metin (Örn: "German - A2 (Elementary)")
}

export interface CvStructuredData {
  languages: StructuredLanguage[];
  skills: string[];
  certifications: string[];
  awards: string[];
  experienceYears: number;
  titles: string[];
  locations: string[];
  education: string[];
}

export interface VerificationResult {
  isConsistent: boolean;
  confidence: number; // 0.0 - 1.0
  issues: string[];
  correctedData?: CvStructuredData;
}

export const CONFIDENCE_THRESHOLD = parseFloat(process.env.EXTRACTION_CONFIDENCE_THRESHOLD || "0.75");

/**
 * CEFR Hiyerarşik Puanlama Haritası
 * A1=1, A2=2, B1=3, B2=4, C1=5, C2=6, Native=7
 */
export const CEFR_SCORES: Record<string, number> = {
  "A1": 1,
  "A2": 2,
  "B1": 3,
  "B2": 4,
  "C1": 5,
  "C2": 6,
  "NATIVE": 7
};

export function getCefrScore(cefrStr: string): number {
  if (!cefrStr) return 0;
  const upper = cefrStr.toUpperCase().trim();
  if (CEFR_SCORES[upper]) return CEFR_SCORES[upper];

  if (upper.includes("NATIVE") || upper.includes("ANADİL") || upper.includes("FLUENT")) return 7;
  if (upper.includes("C2") || upper.includes("PROFICIENT")) return 6;
  if (upper.includes("C1") || upper.includes("ADVANCED")) return 5;
  if (upper.includes("B2") || upper.includes("UPPER")) return 4;
  if (upper.includes("B1") || upper.includes("INTERMEDIATE")) return 3;
  if (upper.includes("A2") || upper.includes("ELEMENTARY")) return 2;
  if (upper.includes("A1") || upper.includes("BEGINNER") || upper.includes("BASIC")) return 1;

  return 1; // Default minimum score for any mentioned language
}
