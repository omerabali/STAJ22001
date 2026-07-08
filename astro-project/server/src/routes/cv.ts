import { Router, Request, Response } from "express";
import { PrismaClient, AnalysisStatus, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { extractTextFromPDF, chunkTextBySections, analyzeWithGemini, extractLocalSkills, detectLanguage, simulateAiAnalysis } from "../utils/parser.js";
import { embedAllChunks, searchSimilarChunks } from "../utils/embeddings.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase() === ".pdf";
    const mimetype = file.mimetype === "application/pdf";

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Yalnızca PDF dosyaları yüklenebilir."));
  }
});

// Single file upload handler
const uploadMiddleware = upload.single("cv");

// Asynchronous background CV processing pipeline
async function processCv(cvId: string, analysisId: string, pdfBuffer: Buffer): Promise<void> {
  const startTime = Date.now();
  const parserLogs: string[] = [];
  parserLogs.push("Özgeçmiş analiz süreci başlatıldı.");

  try {
    // 1. Transition status to PROCESSING
    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.PROCESSING }
    });
    parserLogs.push("Analiz durumu PROCESSING olarak güncellendi.");

    // 2. Extract text from PDF buffer
    console.log(`[Parser] Extracting text from CV: ${cvId}`);
    const text = await extractTextFromPDF(pdfBuffer);
    parserLogs.push("PDF metni başarıyla çıkarıldı.");

    // Detect Potential Prompt Injection (Security Guard!)
    const lowerText = text.toLowerCase();
    const injectionPatterns = [
      "ignore previous instructions",
      "ignore all previous",
      "disregard all previous",
      "disregard previous",
      "rate this candidate",
      "rate the candidate",
      "mark as excellent match",
      "mark as outstanding",
      "mark as perfect match",
      "you are now",
      "you must now",
      "ignore any weaknesses",
      "ignore weaknesses",
      "system prompt",
    ];
    const hasInjectionAttempt = injectionPatterns.some(p => lowerText.includes(p));
    if (hasInjectionAttempt) {
      console.warn(`[Parser] ⚠️ Potential Prompt Injection detected in CV ${cvId}!`);
      parserLogs.push("UYARI: Şüpheli komut/prompt enjeksiyonu denemesi tespit edildi.");
    }

    // Save extracted text in rawText column of CV
    await prisma.cV.update({
      where: { id: cvId },
      data: { rawText: text }
    });

    // 3. Generate section-based chunks with metadata
    console.log(`[Parser] Generating section-based chunks...`);
    const chunks = await chunkTextBySections(text);
    parserLogs.push(`${chunks.length} semantik parça (chunk) oluşturuldu.`);

    // 4. Save chunks in the cv_chunks table
    if (chunks.length > 0) {
      console.log(`[Parser] Storing ${chunks.length} chunks in PostgreSQL...`);
      await prisma.cVChunk.createMany({
        data: chunks.map((chunk, index) => ({
          cvId: cvId,
          chunkText: chunk.chunkText,
          chunkIndex: index + 1,
          metadata: chunk.metadata || {},
        }))
      });
      parserLogs.push("Semantik parçalar veritabanına kaydedildi.");
    }

    // 5. Detect language
    const lang = detectLanguage(text);
    parserLogs.push(`Özgeçmiş dili algılandı: ${lang.toUpperCase()}`);

    // 6. Threshold-based AI Fallback Decision
    const avgConfidence = chunks.length > 0 
      ? Number((chunks.reduce((sum, c) => sum + (c.metadata?.confidence || 0), 0) / chunks.length).toFixed(2)) 
      : 0.0;
    
    // Find minimum confidence across all parsed chunks (excluding Kişisel Bilgiler since it is default/0.95 anyway)
    const minConfidence = chunks.length > 0
      ? Math.min(...chunks.map(c => c.metadata?.confidence || 0.0))
      : 1.0;
    
    let aiFallback = false;
    let aiFallbackReason = "";

    if (chunks.length === 0) {
      aiFallback = true;
      aiFallbackReason = "no_chunks_found";
      parserLogs.push("Hiç chunk bulunamadı. AI Fallback zorunlu tetikleniyor.");
    } else if (avgConfidence < 0.70) {
      aiFallback = true;
      aiFallbackReason = "low_confidence";
      parserLogs.push(`Ortalama güven skoru çok düşük (${avgConfidence} < 0.70). AI Fallback tetikleniyor.`);
    } else if (minConfidence < 0.50) {
      aiFallback = true;
      aiFallbackReason = "low_min_confidence";
      parserLogs.push(`En düşük bölüm güven skoru sınırın altında (${minConfidence} < 0.50). AI Fallback tetikleniyor.`);
    } else {
      aiFallback = false;
      aiFallbackReason = "sufficient_confidence";
      parserLogs.push(`Ortalama güven skoru yeterli (${avgConfidence} >= 0.70) ve tüm bölümler güvenli. AI Fallback atlandı.`);
    }

    let aiAnalysis;
    if (aiFallback) {
      console.log(`[Parser] Running Gemini AI Fallback for CV: ${cvId} (Reason: ${aiFallbackReason})`);
      aiAnalysis = await analyzeWithGemini(text, lang);
      parserLogs.push("Gemini AI Analizi başarıyla çalıştırıldı ve doğrulandı.");
    } else {
      console.log(`[Parser] Skipping AI call for CV: ${cvId}. Running local rule/hybrid analysis.`);
      aiAnalysis = simulateAiAnalysis(text, lang);
      parserLogs.push("Kural tabanlı hibrid analiz başarıyla çalıştırıldı.");
    }

    // Save parser statistics in CV metadata (detailed report!)
    const ruleMatches = chunks.filter(c => c.metadata?.source === "RULE").length;
    const structuralMatches = chunks.filter(c => c.metadata?.source === "STRUCTURAL").length;
    const processingTimeMs = Date.now() - startTime;

    const parserStats = {
      chunksCount: chunks.length,
      language: lang,
      confidence: avgConfidence,
      minConfidence: minConfidence,
      ruleMatches: ruleMatches,
      structuralMatches: structuralMatches,
      aiFallback: aiFallback,
      aiFallbackReason: aiFallbackReason,
      potentialPromptInjection: hasInjectionAttempt,
      processingTimeMs: processingTimeMs,
      parserVersion: "v3.0",
      role: aiAnalysis.role || "Özgeçmiş Analizi",
      logs: parserLogs
    };

    await prisma.cV.update({
      where: { id: cvId },
      data: { metadata: parserStats }
    });

    // 7. Transition status to COMPLETED and save all details in PostgreSQL
    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.COMPLETED,
        atsScore: aiAnalysis.atsScore,
        skills: aiAnalysis.skills,
        strengths: aiAnalysis.strengths,
        weaknesses: aiAnalysis.weaknesses,
        suggestions: aiAnalysis.suggestions
      }
    });

    // 8. Generate & Save Embeddings for all chunks
    try {
      const embedResult = await embedAllChunks(cvId, prisma);
      parserLogs.push(`Semantik vektörler oluşturuldu (Yeni: ${embedResult.embedded}, Cache: ${embedResult.copied}).`);
      
      // Update parserStats logs
      await prisma.cV.update({
        where: { id: cvId },
        data: { metadata: { ...parserStats, logs: parserLogs } }
      });
    } catch (embedErr: any) {
      console.error(`[Parser] ❌ Error generating embeddings for CV ${cvId}:`, embedErr);
      parserLogs.push(`HATA: Embedding oluşturulamadı: ${embedErr.message}`);
      await prisma.cV.update({
        where: { id: cvId },
        data: { metadata: { ...parserStats, logs: parserLogs } }
      });
    }

    console.log(`[Parser] ✅ Successfully parsed, analyzed and chunked CV: ${cvId}`);

  } catch (error) {
    console.error(`[Parser] ❌ Error processing CV ${cvId}:`, error);
    
    // Set status to FAILED on error
    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.FAILED }
    }).catch(err => console.error("Error setting status to FAILED:", err));
  }
}

// POST /api/cv/upload
router.post("/upload", authMiddleware, (req: Request, res: Response): void => {
  uploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ message: "Dosya boyutu çok büyük. Maksimum limit 5MB'dır." });
        return;
      }
      res.status(400).json({ message: `Yükleme hatası: ${err.message}` });
      return;
    } else if (err) {
      res.status(400).json({ message: err.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Lütfen bir dosya seçin." });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Yetkisiz erişim." });
      return;
    }

    try {
      const rawOriginalName = req.file.originalname;
      const fileName = Buffer.from(rawOriginalName, "latin1").toString("utf8");
      const fileExt = path.extname(fileName).toLowerCase();
      
      // If admin, allow uploading on behalf of another candidate
      let userId = req.user.id;
      if (req.user.role === "ADMIN" && req.body.targetUserId) {
        userId = req.body.targetUserId;
      }
      
      const fileUuid = crypto.randomUUID();
      const filePath = `cvs/${userId}/${fileUuid}${fileExt}`;

      const fileBuffer = req.file.buffer;
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // Check if a CV with this hash already exists for this user
      const existingCv = await prisma.cV.findFirst({
        where: {
          userId: userId,
          hash: fileHash,
        },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (existingCv) {
        console.log(`[Upload] Overwriting existing CV for user ${userId} with hash ${fileHash} to apply parser updates.`);
        // Delete existing CV (cascade will handle chunks and analyses in DB)
        await prisma.cV.delete({ where: { id: existingCv.id } });
        // Delete from Supabase Storage
        const oldFilePath = existingCv.fileUrl.split("/public/cv-files/")[1];
        if (oldFilePath) {
          await supabase.storage.from("cv-files").remove([oldFilePath]);
        }
      }


      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("cv-files")
        .upload(filePath, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) {
        console.error("Supabase Storage yükleme hatası:", error);
        res.status(500).json({ message: "Dosya depolama sunucusuna yüklenemedi." });
        return;
      }

      // Get public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("cv-files")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        res.status(500).json({ message: "Dosya indirme linki oluşturulamadı." });
        return;
      }

      const fileUrl = publicUrlData.publicUrl;

      // Save records in the PostgreSQL database using Prisma
      const cv = await prisma.cV.create({
        data: {
          userId: userId,
          fileName: fileName,
          fileUrl: fileUrl,
          hash: fileHash,
        }
      });

      const analysis = await prisma.cVAnalysis.create({
        data: {
          cvId: cv.id,
          status: AnalysisStatus.PENDING,
        }
      });

      // Asynchronously trigger parsing in the background
      processCv(cv.id, analysis.id, fileBuffer);

      res.status(201).json({
        message: "CV başarıyla yüklendi, analiz sıraya alındı.",
        cv,
        analysis,
      });
    } catch (dbError) {
      console.error("Veritabanı kayıt hatası:", dbError);
      res.status(500).json({ message: "Kayıt veritabanına işlenemedi." });
    }
  });
});

// GET /api/cv/list
router.get("/list", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  try {
    const list = await prisma.cV.findMany({
      where: req.user.role === "ADMIN" ? {} : { userId: req.user.id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate 1-hour signed URLs for each CV in the private storage
    const cvsWithSignedUrls = await Promise.all(
      list.map(async (cv) => {
        const urlParts = cv.fileUrl.split('/cv-files/');
        const filePath = urlParts[1];

        if (!filePath) return cv;

        const { data, error } = await supabase.storage
          .from("cv-files")
          .createSignedUrl(filePath, 3600); // 1 hour expiration

        if (error) {
          console.error(`Error generating signed URL for CV ${cv.id}:`, error);
        }

        return {
          ...cv,
          fileUrl: data?.signedUrl || cv.fileUrl
        };
      })
    );

    res.json({ cvs: cvsWithSignedUrls });
  } catch (error) {
    console.error("CV listeleme hatası:", error);
    res.status(500).json({ message: "CV listesi alınamadı." });
  }
});

// GET /api/cv/:id/chunks
router.get("/:id/chunks", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const id = req.params.id as string;

  try {
    const cv = await prisma.cV.findFirst({
      where: req.user.role === "ADMIN"
        ? { id }
        : { id, userId: req.user.id },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" } }
      }
    });

    if (!cv) {
      res.status(404).json({ message: "CV bulunamadı veya yetkiniz yok." });
      return;
    }

    res.json({ chunks: cv.chunks, fileName: cv.fileName });
  } catch (error) {
    console.error("Chunk listeleme hatası:", error);
    res.status(500).json({ message: "Chunk listesi alınamadı." });
  }
});

// DELETE /api/cv/:id
router.delete("/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const id = req.params.id as string;

  try {
    // 1. Find the CV and ensure it belongs to the logged-in user (or user is admin)
    const cv = await prisma.cV.findFirst({
      where: req.user.role === "ADMIN"
        ? { id: id }
        : { id: id, userId: req.user.id }
    });

    if (!cv) {
      res.status(404).json({ message: "CV bulunamadı veya yetkiniz yok." });
      return;
    }

    // 2. Extract Supabase Storage file path from fileUrl
    const urlParts = cv.fileUrl.split('/cv-files/');
    const filePath = urlParts[1];

    if (filePath) {
      // Delete file from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("cv-files")
        .remove([filePath]);

      if (storageError) {
        console.error(`Supabase Storage dosya silme hatası (CV ID: ${id}):`, storageError);
      }
    }

    // 3. Delete from Database (Prisma cascades automatically due to onDelete: Cascade)
    await prisma.cV.delete({
      where: { id: id }
    });

    res.json({ message: "CV başarıyla silindi." });
  } catch (error) {
    console.error("CV silme hatası:", error);
    res.status(500).json({ message: "CV silinemedi." });
  }
});

// POST /api/cv/:id/retry
router.post("/:id/retry", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Bu işlem için admin yetkisi gerekiyor." });
    return;
  }

  const id = req.params.id as string;

  try {
    const cv = await prisma.cV.findUnique({
      where: { id },
      include: {
        analyses: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!cv) {
      res.status(404).json({ message: "CV bulunamadı." });
      return;
    }

    const urlParts = cv.fileUrl.split('/cv-files/');
    const filePath = urlParts[1];

    if (!filePath) {
      res.status(400).json({ message: "Geçersiz dosya adresi." });
      return;
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("cv-files")
      .download(filePath);

    if (downloadError || !fileBlob) {
      console.error("Supabase Storage dosya indirme hatası:", downloadError);
      res.status(500).json({ message: "Dosya depolama sunucusundan indirilemedi." });
      return;
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

    let analysis = cv.analyses && cv.analyses[0];
    if (analysis) {
      analysis = await prisma.cVAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: AnalysisStatus.PENDING,
          atsScore: null,
          skills: Prisma.DbNull,
          strengths: Prisma.DbNull,
          weaknesses: Prisma.DbNull,
          suggestions: Prisma.DbNull
        }
      });
    } else {
      analysis = await prisma.cVAnalysis.create({
        data: {
          cvId: cv.id,
          status: AnalysisStatus.PENDING
        }
      });
    }

    // Delete chunks to avoid duplicate chunks on reprocessing
    await prisma.cVChunk.deleteMany({
      where: { cvId: cv.id }
    });

    // Run processing asynchronoulsy in the background
    processCv(cv.id, analysis.id, fileBuffer);

    res.json({ message: "Analiz yeniden başlatıldı.", cv, analysis });
  } catch (error) {
    console.error("Yeniden deneme hatası:", error);
    res.status(500).json({ message: "Analiz yeniden başlatılamadı." });
  }
});

// GET /api/cv/search - Semantic Search endpoint
router.get("/search", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  const limit = parseInt(req.query.limit as string || "5", 10);

  if (!query || query.trim() === "") {
    res.status(400).json({ message: "Arama sorgusu boş olamaz." });
    return;
  }

  try {
    const results = await searchSimilarChunks(query, limit, prisma);
    res.json({ results });
  } catch (error: any) {
    console.error("Semantic search endpoint error:", error);
    res.status(500).json({ message: `Arama sırasında hata oluştu: ${error.message}` });
  }
});

export default router;
