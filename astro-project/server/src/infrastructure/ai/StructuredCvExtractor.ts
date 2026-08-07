/**
 * StructuredCvExtractor.ts (2-Aşamalı Producer/Checker LLM Extraction Motoru)
 * Görevi:
 * Adım 1 (Producer): CV'nin TAM metninden GPT-4o-mini ile strict JSON (CvStructuredData) çıkarır.
 * Adım 2 (Checker): Üretilen JSON verisini CV metni ile bağımsız ikinci bir GPT çağrısında doğrulayıp confidence skoru üretir.
 * Adım 3 (Retry & Karar): confidence < 0.75 ise 1 kez re-process yapar; yine düşük kalırsa needsReview=true işaretleyip sessizce kaydeder.
 */
import { PrismaClient } from "@prisma/client";
import {
  CvStructuredData,
  VerificationResult,
  CONFIDENCE_THRESHOLD
} from "../../domain/cv/CvStructuredData.js";

export class StructuredCvExtractor {
  /**
   * Adım 1: Producer - CV Tam Metninden Yapılandırılmış JSON Çıkarma
   */
  public static async extractProducer(cvText: string, apiKey: string): Promise<CvStructuredData> {
    const systemPrompt = `You are a precision HR data extraction engine. Extract structured data from the candidate's FULL CV text.

CRITICAL NORMALIZATION RULES:
1. LANGUAGES: Normalize language names into standard Turkish names (e.g. "German"/"Deutsch" -> "Almanca", "English" -> "İngilizce", "French"/"Français" -> "Fransızca", "Spanish"/"Español" -> "İspanyolca").
2. CEFR LEVELS: Map descriptive language levels to CEFR standard strings ("A1", "A2", "B1", "B2", "C1", "C2", "Native"):
   - Beginner / Basic / Başlangıç -> "A1"
   - Elementary / Pre-Intermediate / Temel -> "A2"
   - Intermediate / Orta -> "B1"
   - Upper-Intermediate / Advanced Level / Orta Üstü -> "B2"
   - Advanced / Proficient / İleri -> "C1"
   - Native / Anadil / Mother Tongue / Main Language / Fluent -> "Native"
3. RAW FIELD: Keep the exact raw phrase from the CV in the "raw" field (e.g. "German - A2 (Elementary)").
4. SKILLS & TITLES: Clean and extract all technical skills, frameworks, and job titles.
5. EXPERIENCE: Estimate total years of professional experience as a number.

Return ONLY a valid JSON matching this exact schema:
{
  "languages": [{"language": "Almanca", "cefr": "A2", "raw": "German - A2 (Elementary)"}],
  "skills": ["React.js", "TypeScript", "Node.js"],
  "certifications": ["AWS Certified Developer"],
  "awards": ["Best Project Award 2024"],
  "experienceYears": 4,
  "titles": ["Software Engineer", "Frontend Developer"],
  "locations": ["İstanbul", "Türkiye"],
  "education": ["İstanbul Beykent University - BS Software Engineering"]
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Full CV Text:\n${cvText}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0
      })
    });

    if (!res.ok) throw new Error(`Producer GPT extraction failed with status ${res.status}`);
    const data = (await res.json()) as Record<string, any>;
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const cleanJsonStr = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(cleanJsonStr);
    } catch (jsonErr) {
      console.warn("[StructuredCvExtractor] JSON parse warning, returning partial fallback:", jsonErr);
    }

    return {
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      awards: Array.isArray(parsed.awards) ? parsed.awards : [],
      experienceYears: typeof parsed.experienceYears === "number" ? parsed.experienceYears : 0,
      titles: Array.isArray(parsed.titles) ? parsed.titles : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      education: Array.isArray(parsed.education) ? parsed.education : []
    };
  }

  /**
   * Adım 2: Checker - Çıkarılan JSON Verisini Bağımsız Olarak Doğrulama
   */
  public static async verifyChecker(
    cvText: string,
    extractedData: CvStructuredData,
    apiKey: string
  ): Promise<VerificationResult> {
    const systemPrompt = `You are a strict HR Quality Auditor. Verify if the extracted structured JSON accurately reflects the full CV text.

AUDIT CHECKS:
1. Is any language, skill, or certification missing or hallucinated?
2. Are CEFR language mappings accurate based on the CV text?
3. Produce a confidence score from 0.0 to 1.0.

Return ONLY a valid JSON matching this schema:
{
  "isConsistent": true, // boolean
  "confidence": 0.95,   // float between 0.0 and 1.0
  "issues": [],         // array of short Turkish issue descriptions if any
  "correctedData": null // optional corrected CvStructuredData object if confidence < 0.75
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `CV Text:\n${cvText}\n\nExtracted Structured Data JSON:\n${JSON.stringify(extractedData, null, 2)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0
      })
    });

    if (!res.ok) throw new Error(`Checker GPT verification failed with status ${res.status}`);
    const data = (await res.json()) as Record<string, any>;
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const cleanJsonStr = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn("[StructuredCvExtractor] Checker JSON parse warning:", e);
    }

    return {
      isConsistent: Boolean(parsed.isConsistent),
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      correctedData: parsed.correctedData || undefined
    };
  }

  /**
   * 2-Aşamalı Pipeline Orkestratörü (Adım 1, 2, 3 & 6 Fallback)
   */
  public static async executePipeline(
    cvText: string,
    apiKey: string
  ): Promise<{ structuredData: CvStructuredData; needsReview: boolean; confidence: number }> {
    try {
      // 1. İşlem: Producer Extraction
      let data = await this.extractProducer(cvText, apiKey);
      let verification = await this.verifyChecker(cvText, data, apiKey);

      console.log(`[StructuredCvExtractor] 🧪 Extraction Pass 1 - Confidence: ${verification.confidence} | Consistent: ${verification.isConsistent}`);

      // Karar Eşiği Kontrolü
      if (verification.confidence >= CONFIDENCE_THRESHOLD) {
        return {
          structuredData: verification.correctedData || data,
          needsReview: false,
          confidence: verification.confidence
        };
      }

      // Adım 3: confidence < 0.75 ise 1 kez Yeniden İşleme (Re-process Retry)
      console.warn(`[StructuredCvExtractor] ⚠️ Confidence below threshold (${verification.confidence} < ${CONFIDENCE_THRESHOLD}). Retrying 1 time...`);
      data = await this.extractProducer(cvText, apiKey);
      verification = await this.verifyChecker(cvText, data, apiKey);

      console.log(`[StructuredCvExtractor] 🧪 Extraction Pass 2 (Retry) - Confidence: ${verification.confidence}`);

      const finalData = verification.correctedData || data;

      if (verification.confidence >= CONFIDENCE_THRESHOLD) {
        return {
          structuredData: finalData,
          needsReview: false,
          confidence: verification.confidence
        };
      }

      // Hâlâ düşükse needsReview = true işaretle ama veriyi kaydet (Sessiz Fallback)
      return {
        structuredData: finalData,
        needsReview: true,
        confidence: verification.confidence
      };
    } catch (err: any) {
      // Adım 6: Fallback - Sistem Çökmesin, Sessizce Varsayılan Döner
      console.error(`[StructuredCvExtractor] ❌ Extraction pipeline error (silent fallback): ${err.message || String(err)}`);
      return {
        structuredData: {
          languages: [],
          skills: [],
          certifications: [],
          awards: [],
          experienceYears: 0,
          titles: [],
          locations: [],
          education: []
        },
        needsReview: true,
        confidence: 0.0
      };
    }
  }
}
