/**
 * ProcessCvPipelineUseCase.ts (CV Analiz Boru Hattı Kullanım Senaryosu)
 * Görevi: Arka planda çalışan ana CV işleme motorudur.
 * PDF metnini okur -> Dilini tespit eder -> Mantıksal parçalara (chunks) böler -> 
 * 1536-boyutlu vektörleri çıkarıp pgvector'e yazar -> OpenAI GPT-4o ile ATS Skoru ve SWOT analizi üretir -> 
 * Canlı durumu WebSocket (Socket.io) ile ön yüze aktarır.
 */
import { PrismaClient, AnalysisStatus } from "@prisma/client";
import {
  extractTextFromPDF,
  detectLanguage,
  chunkTextBySections,
  analyzeWithOpenAI
} from "../../utils/parser.js";
import { embedAllChunks } from "../../utils/embeddings.js";
import { emitAnalysisStatus } from "../../index.js";
import { supabase } from "../../lib/supabase.js";

export class ProcessCvPipelineUseCase {
  public static async execute(cvId: string, prisma: PrismaClient): Promise<void> {
    const startTime = Date.now();
    console.log(`[Parser] 🚀 Processing CV Pipeline for ID: ${cvId}`);

    // 1. DB'den CV'yi çek
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
      include: { user: true }
    });

    if (!cv) {
      console.error(`[Parser] ❌ CV not found in DB for ID: ${cvId}`);
      return;
    }

    // 2. cVAnalysis kaydını oluştur veya getir
    let analysis = await prisma.cVAnalysis.findFirst({//findfirst ilk bulunanı getir
      where: { cvId, status: AnalysisStatus.PROCESSING }
    });

    if (!analysis) {
      analysis = await prisma.cVAnalysis.create({
        data: {
          cvId,
          status: AnalysisStatus.PROCESSING
        }
      });
    }

    const analysisId = analysis.id;

    try {
      emitAnalysisStatus(cvId, "PROCESSING", "Metin ayrıştırılıyor...", 1);

      // 3. METİN ÇIKARMA (Parser)
      let text = cv.rawText;
      let lang = "tr";
      // CV dosyasının (PDF) saklandığı yeri tespit edip dosyanın kendisini
      // (Buffer olarak) indiriyor ve ardından içerikteki ham metni (rawText) çıkarıyor.
      if (!text || text.trim().length < 50) {
        console.log(`[Parser] Extracting fresh text for CV ${cvId}...`);
        let pdfBuffer: Buffer;
        if (cv.fileUrl.includes("/cv-files/")) {
          const storagePath = cv.fileUrl.split("/cv-files/")[1];
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("cv-files")
            .download(storagePath);

          if (downloadError || !fileData) {
            console.warn(`[Parser] Supabase storage download warning: ${downloadError?.message}. Falling back to fetch.`);
            const res = await fetch(cv.fileUrl);
            pdfBuffer = Buffer.from(await res.arrayBuffer());
          } else {
            pdfBuffer = Buffer.from(await fileData.arrayBuffer());
          }
        } else if (cv.fileUrl.startsWith("http://") || cv.fileUrl.startsWith("https://")) {
          const res = await fetch(cv.fileUrl);
          pdfBuffer = Buffer.from(await res.arrayBuffer());
        } else {
          const fs = await import("fs");
          pdfBuffer = fs.readFileSync(cv.fileUrl);
        }
        text = await extractTextFromPDF(pdfBuffer);
        lang = detectLanguage(text) || "tr";

        console.log(`[Parser] Extracted ${text.length} chars of text for CV ${cvId}`);

        // DB'ye ham metni yaz
        await prisma.cV.update({
          where: { id: cvId },
          data: { rawText: text }
        });
      }

      if (!text || text.trim().length < 20) {
        throw new Error("CV'den yeterli okunabilir metin çıkarılamadı.");
      }

      // 3.5 2-AŞAMALI YAPILANDIRILMIŞ VERİ ÇIKARMA VE DOĞRULAMA (Producer / Checker Engine)
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        console.log(`[Parser] 🧬 Running 2-Pass Structured Extraction for CV ${cvId}...`);
        const { StructuredCvExtractor } = await import("../../infrastructure/ai/StructuredCvExtractor.js");
        const structuredResult = await StructuredCvExtractor.executePipeline(text, apiKey);

        await prisma.cV.update({
          where: { id: cvId },
          data: {
            structuredData: structuredResult.structuredData as any,
            needsReview: structuredResult.needsReview,
            extractionConfidence: structuredResult.confidence
          }
        });

        console.log(`[Parser] ✅ Structured data saved. Confidence: ${structuredResult.confidence} | NeedsReview: ${structuredResult.needsReview}`);
      }

      // 4. PARÇALAMA (4-Aşamalı Yapay Zeka Chunklama Motoru) & ESKİ PARÇALARI TEMİZLEME
      await prisma.cVChunk.deleteMany({ where: { cvId } });

      const parsedChunks = await chunkTextBySections(text, prisma);
      const chunkRecords = parsedChunks.map((chunkObj, idx: number) => ({
        cvId,
        chunkText: chunkObj.chunkText,
        chunkIndex: idx,
        metadata: chunkObj.metadata
      }));

      await prisma.cVChunk.createMany({
        data: chunkRecords
      });

      console.log(`[Parser] CV ${cvId} split into ${parsedChunks.length} multi-layer AI section chunks.`);

      // 5. TEK RUNDA ANINDA YAPAY ZEKA ANALİZİ (GPT-4o-mini / OpenAI)
      emitAnalysisStatus(cvId, "PROCESSING", "Yapay zeka CV analizi gerçekleştiriliyor...", 2);

      const aiStartTime = Date.now();
      const aiAnalysis = await analyzeWithOpenAI(text, (lang as "tr" | "en") || "tr", prisma, cvId);
      const aiDurationMs = Date.now() - aiStartTime;

      // 6. ANALİZ SONUCUNU ANINDA DB'YE KAYDET
      emitAnalysisStatus(cvId, "PROCESSING", "Analiz verileri kaydediliyor...", 3);

      await prisma.cVAnalysis.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.COMPLETED,
          atsScore: aiAnalysis.atsScore,
          skills: aiAnalysis.skills,
          strengths: aiAnalysis.strengths,
          weaknesses: aiAnalysis.weaknesses,
          suggestions: aiAnalysis.suggestions,
          interviewQuestions: (aiAnalysis as any).interviewQuestions || aiAnalysis.suggestions,
          updatedAt: new Date()
        }
      });

      const totalDurationMs = Date.now() - startTime;

      // 7. HARCANAN TOKEN VE TAHMİNİ DOLAR MALİYETİ HESAPLA
      const approxInputTokens = Math.round(text.length / 4);
      const approxOutputTokens = 600; // GPT JSON Çıktısı ortalama 600 token
      const totalTokensUsed = approxInputTokens + approxOutputTokens;

      // GPT-4o-mini Fiyatı: $0.00015/1k input, $0.0006/1k output
      const inputCost = (approxInputTokens / 1000) * 0.00015;
      const outputCost = (approxOutputTokens / 1000) * 0.0006;
      const estimatedCostUsd = parseFloat((inputCost + outputCost).toFixed(8));

      // 8. COST LOGGING (Maliyet ve Token Verileri ile Birlikte DB'ye Yaz)
      const parserStats = {
        processingTimeMs: totalDurationMs,
        totalTimeMs: totalDurationMs,
        aiDurationMs,
        textLength: text.length,
        chunksCount: parsedChunks.length,
        language: lang,
        atsScore: aiAnalysis.atsScore,
        aiFallback: (aiAnalysis as any).aiFallback || false,
        tokensUsed: totalTokensUsed,
        estimatedCostUsd
      };

      await prisma.cV.update({
        where: { id: cvId },
        data: { metadata: parserStats }
      });

      await prisma.costLog.create({
        data: {
          cvId,
          analysisId,
          operation: "CV_ANALYSIS",
          durationMs: totalDurationMs,
          tokensUsed: totalTokensUsed,
          estimatedCostUsd,
          status: "SUCCESS",
          metadata: parserStats
        }
      }).catch(err => console.error("[CostLog] Loglama hatası:", err));

      console.log(`[Parser] 🚀 INSTANT COMPLETED: CV ${cvId} analyzed in ${totalDurationMs}ms (Tokens: ${totalTokensUsed}, Cost: $${estimatedCostUsd})!`);
      emitAnalysisStatus(cvId, "COMPLETED", "Analiz başarıyla tamamlandı.", 4);

      // 9. ARKA PLAN VEKTÖR EMBEDDINGS (Non-blocking Background Task)
      embedAllChunks(cvId, prisma).then((embedResult: any) => {
        console.log(`[Parser] ⚡ Background Embeddings finished for CV ${cvId}: ${embedResult.embedded} embedded in ${embedResult.totalTimeMs}ms`);
      }).catch((embedErr: any) => {
        console.error(`[Parser] ⚠️ Background embedding error for CV ${cvId}:`, embedErr);
      });

    } catch (error: any) {
      console.error(`[Parser] ❌ Error processing CV ${cvId}:`, error);

      const failDurationMs = Date.now() - startTime;
      await prisma.costLog.create({
        data: {
          cvId,
          analysisId,
          operation: "CV_ANALYSIS",
          durationMs: failDurationMs,
          status: "FAILED",
          metadata: { error: String(error) }
        }
      }).catch(err => console.error("[CostLog] Failed log hatası:", err));

      await prisma.cVAnalysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.FAILED }
      });

      emitAnalysisStatus(cvId, "FAILED", error.message || "Analiz sırasında bir hata oluştu.", 0);
    }
  }
}
