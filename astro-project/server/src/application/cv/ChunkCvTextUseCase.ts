/**
 * ChunkCvTextUseCase.ts
 * Clean Architecture Application Use-Case
 * Orchestrates multi-layer semantic text chunking with AI inspection and rule-based fallbacks.
 */

import { detectLanguage, normalizeStars } from "../../domain/cv/CvTextPreprocessor.js";
import { runLocalRuleBasedParser } from "../../domain/cv/LocalRuleBasedChunker.js";
import { splitTextSlidingWindow } from "../../domain/cv/SubChunker.js";
import { SECTION_LABELS } from "../../domain/cv/SectionTaxonomy.js";
import { segmentCvWithAI } from "../../infrastructure/ai/OpenAiSectionSegmenter.js";
import crypto from "crypto";

export async function chunkTextBySections(text: string, prisma?: any): Promise<{ chunkText: string; metadata: any }[]> {
  if (!text || text.trim() === "") return [];

  const lang = detectLanguage(text);
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    console.log(`[Parser] 🤖 [Katman 1] Running Primary AI-Driven Chunking Engine (gpt-4o-mini)...`);
    try {
      const { inspectAndCorrectChunks, retryTargetedChunk } = await import("../../services/ChunkQualityService.js");

      // ── Layer 1: Macro-segmentation ──────────────────────────────────────────
      const aiSections = await segmentCvWithAI(text, lang, prisma);

      if (aiSections.length > 0) {
        console.log(`[Parser] 🔍 [Katman 2] Inspecting & Scoring ${aiSections.length} chunks (temp: 0)...`);
        
        const normalizedAiSections = aiSections.map((s: any) => ({ ...s, originalTitle: s.originalTitle || "" }));
        const layer2Chunks = await inspectAndCorrectChunks(normalizedAiSections, text, lang, prisma);

        const finalChunks: { chunkText: string; metadata: any }[] = [];
        let sectionOrder = 1;

        for (let i = 0; i < layer2Chunks.length; i++) {
          const l1 = aiSections[i] || { sectionKey: "other", originalTitle: "Bölüm", confidence: 0.95, reasoning: "Layer 1" };
          let l2 = layer2Chunks[i];
          let l3Result: any = null;
          let finalSource: "layer2" | "layer3" | "rule_based_final" = "layer2";
          let finalScore = l2.confidence_score;

          // ── Layer 3: Targeted Retry if Layer 2 confidence_score < 65 ────────
          if (l2.confidence_score < 65) {
            console.log(`[Parser] ⚠️ Chunk ${i + 1} (${l2.originalTitle}) score=${l2.confidence_score} < 65. [Katman 3] Retrying targeted chunk...`);
            l3Result = await retryTargetedChunk(
              l2,
              text,
              lang,
              l2.duzeltme_aciklamasi || "Layer 2 low confidence score",
              prisma
            );

            if (l3Result.confidence_score >= 65) {
              console.log(`[Parser] ✅ [Katman 3] Retry successful! New score=${l3Result.confidence_score}`);
              l2 = {
                originalTitle: l3Result.originalTitle,
                type: l3Result.type,
                text: l3Result.text,
                duzeltildi: true,
                duzeltme_aciklamasi: l3Result.aciklama,
                confidence_score: l3Result.confidence_score,
              };
              finalSource = "layer3";
              finalScore = l3Result.confidence_score;
            } else {
              console.log(`[Parser] ⛔ [Katman 3] Retry score=${l3Result.confidence_score} still < 65. Falling back to Rule-Based for this segment (NO 4TH AI CALL).`);
              finalSource = "rule_based_final";
              finalScore = l3Result.confidence_score;
            }
          }

          const rawChunkText = l2.text || l1.text || "";
          if (!rawChunkText.trim()) continue;

          const sectionType = l2.type || l1.sectionKey || "other";
          const originalTitle = l2.originalTitle || l1.originalTitle || SECTION_LABELS[sectionType] || "Bölüm";
          const wordCount = rawChunkText.split(/\s+/).filter((w: string) => w.length > 0).length;
          const normalizedText = normalizeStars(rawChunkText);
          const headerLabel = sectionType === "experience" ? `İŞ DENEYİMİ` : originalTitle.toUpperCase();
          const fullText = `[${headerLabel}]\n${normalizedText}`;
          const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");

          const qualityTraceLog = {
            layer1: {
              type: l1.sectionKey,
              originalTitle: l1.originalTitle,
              confidence: l1.confidence,
              reasoning: l1.reasoning,
            },
            layer2: {
              type: layer2Chunks[i].type,
              originalTitle: layer2Chunks[i].originalTitle,
              confidence_score: layer2Chunks[i].confidence_score,
              duzeltildi: layer2Chunks[i].duzeltildi,
              duzeltme_aciklamasi: layer2Chunks[i].duzeltme_aciklamasi,
            },
            layer3: l3Result ? {
              type: l3Result.type,
              originalTitle: l3Result.originalTitle,
              confidence_score: l3Result.confidence_score,
              aciklama: l3Result.aciklama,
            } : undefined,
            finalSource,
            finalScore,
          };

          finalChunks.push({
            chunkText: fullText,
            metadata: {
              section: originalTitle,
              originalTitle: originalTitle,
              type: sectionType,
              source: finalSource === "rule_based_final" ? "STRUCTURAL" : "AI",
              method: finalSource === "layer2" ? "primary_ai" : (finalSource === "layer3" ? "ai_fallback" : "rule_based"),
              extractionMethod: "layout_aware",
              language: lang,
              order: sectionOrder++,
              wordCount,
              confidence: Number((finalScore / 100).toFixed(2)),
              confidence_score: finalScore,
              reasoning: l2.duzeltme_aciklamasi || l1.reasoning || "3-Layer AI Chunking Pipeline",
              chunkQualityLog: qualityTraceLog,
              aiFallback: finalSource === "layer3",
              createdAt: new Date().toISOString(),
              parserVersion: "v4.0-ai-3layer",
              chunkHash,
            },
          });
        }

        if (finalChunks.length > 0) {
          console.log(`[Parser] 🎉 3-Layer Pipeline completed with ${finalChunks.length} final chunks.`);
          return finalChunks;
        }
      }
    } catch (err: any) {
      console.warn(`[Parser] 3-Layer AI Pipeline failed, falling back to local rule-based parser:`, err.message);
    }
  }

  // ── Tier 2 (FALLBACK): Local Rule-Based Dictionary Parser ─────────────────
  const localChunks = await runLocalRuleBasedParser(text, lang, prisma);
  if (localChunks.length > 0) return localChunks;

  // ── Tier 3 (HARD FALLBACK): Fixed-Size Window ──────────────────────────────
  const hardWordChunks = splitTextSlidingWindow(text, 250, 40);
  return hardWordChunks.map((wc_text: string, idx: number) => {
    const wordCount = wc_text.split(/\s+/).filter(Boolean).length;
    const fullText  = `[GENEL İÇERİK (Kısım ${idx + 1})]\n${wc_text}`;
    const chunkHash = crypto.createHash("sha256").update(fullText).digest("hex");
    return {
      chunkText: fullText,
      metadata: {
        section:       "Genel İçerik",
        originalTitle: "Genel İçerik",
        type:          "other",
        source:        "STRUCTURAL",
        method:        "hard_fallback",
        extractionMethod: "layout_aware",
        language:      lang,
        order:         idx + 1,
        wordCount,
        confidence:    0.30,
        aiFallback:    false,
        createdAt:     new Date().toISOString(),
        parserVersion: "v4.0-ai",
        chunkHash,
      },
    };
  });
}

export class ChunkCvTextUseCase {
  public static async execute(text: string, prisma?: any) {
    return chunkTextBySections(text, prisma);
  }
}
