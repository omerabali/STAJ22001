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
    
    let aiFallback = false;
    let aiFallbackReason = "";

    const hasExperience = chunks.some(c => c.metadata?.section === "Deneyimler");
    const hasEducation = chunks.some(c => c.metadata?.section === "Eğitim");
    const missingCritical = !hasExperience || !hasEducation;

    if (chunks.length === 0) {
      aiFallback = true;
      aiFallbackReason = "no_chunks_found";
      parserLogs.push("Hiç chunk bulunamadı. AI Fallback zorunlu tetikleniyor.");
    } else if (avgConfidence < 0.70) {
      aiFallback = true;
      aiFallbackReason = "low_confidence";
      parserLogs.push(`Ortalama güven skoru çok düşük (${avgConfidence} < 0.70). AI Fallback tetikleniyor.`);
    } else if (avgConfidence >= 0.70 && avgConfidence < 0.90) {
      if (missingCritical) {
        aiFallback = true;
        aiFallbackReason = "missing_critical_sections";
        parserLogs.push(`Ortalama güven skoru orta düzeyde (${avgConfidence}). Kritik bölümler (Deneyim/Eğitim) eksik olduğu için AI Fallback tetikleniyor.`);
      } else {
        aiFallback = false;
        aiFallbackReason = "optional_skipped_due_to_critical_sections_present";
        parserLogs.push(`Ortalama güven skoru orta düzeyde (${avgConfidence}) ve kritik bölümler mevcut. AI Fallback atlandı.`);
      }
    } else {
      aiFallback = false;
      aiFallbackReason = "high_confidence";
      parserLogs.push(`Ortalama güven skoru yüksek (${avgConfidence} >= 0.90). AI Fallback atlandı.`);
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
      ruleMatches: ruleMatches,
      structuralMatches: structuralMatches,
      aiFallback: aiFallback,
      aiFallbackReason: aiFallbackReason,
      processingTimeMs: processingTimeMs,
      parserVersion: "v2.0",
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
        console.log(`[Upload] Duplicate CV found for user ${userId} with hash ${fileHash}`);
        const latestAnalysis = existingCv.analyses && existingCv.analyses[0];
        
        res.status(200).json({
          message: "Bu CV daha önce yüklendi. Mevcut analiz sonucu getiriliyor.",
          cv: existingCv,
          analysis: latestAnalysis,
        });
        return;
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

export default router;
