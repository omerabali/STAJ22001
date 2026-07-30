import { PrismaClient, AnalysisStatus } from "@prisma/client";
import { getFileText } from "../../utils/parser";
import { embedAllChunks } from "../../utils/embeddings";
import { analyzeCvTextWithOpenAi } from "../../infrastructure/ai/OpenAiCvAnalyzer";
import { emitAnalysisStatus } from "../../infrastructure/websocket/socketService";
import { ChunkQualityService } from "../../services/ChunkQualityService";

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
    let analysis = await prisma.cVAnalysis.findFirst({
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

      if (!text || text.trim().length === 0) {
        console.log(`[Parser] Extracting text for CV ${cvId}...`);
        const extracted = await getFileText(cv.fileUrl, cv.fileName);
        text = extracted.text;
        lang = extracted.language || "tr";

        // DB'ye ham metni yaz
        await prisma.cV.update({
          where: { id: cvId },
          data: { rawText: text }
        });
      }

      if (!text || text.trim().length < 20) {
        throw new Error("CV'den yeterli okunabilir metin çıkarılamadı.");
      }

      // 4. PARÇALAMA (Chunking) & ESKİ PARÇALARI TEMİZLEME
      await prisma.cVChunk.deleteMany({ where: { cvId } });

      const chunkObjs = ChunkQualityService.chunkText(text, 1000, 200);
      const chunks = chunkObjs.map(c => c.text);
      const chunkRecords = chunks.map((chunkText, idx) => ({
        cvId,
        chunkText,
        chunkIndex: idx,
        metadata: { length: chunkText.length }
      }));

      await prisma.cVChunk.createMany({
        data: chunkRecords
      });

      console.log(`[Parser] CV ${cvId} split into ${chunks.length} chunks.`);

      // 5. TEK RUNDA ANINDA YAPAY ZEKA ANALİZİ (GPT-4o-mini)
      emitAnalysisStatus(cvId, "PROCESSING", "Yapay zeka CV analizi gerçekleştiriliyor...", 2);

      const aiStartTime = Date.now();
      const { analysis: aiAnalysis, fallback: aiFallback } = await analyzeCvTextWithOpenAi(text);
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
          interviewQuestions: aiAnalysis.interviewQuestions || aiAnalysis.suggestions,
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
        totalTimeMs: totalDurationMs,
        aiDurationMs,
        textLength: text.length,
        chunksCount: chunks.length,
        language: lang,
        atsScore: aiAnalysis.atsScore,
        aiFallback,
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
      embedAllChunks(cvId, prisma).then(embedResult => {
        console.log(`[Parser] ⚡ Background Embeddings finished for CV ${cvId}: ${embedResult.embedded} embedded in ${embedResult.totalTimeMs}ms`);
      }).catch(embedErr => {
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
