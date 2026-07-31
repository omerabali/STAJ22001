import { Router, Request, Response } from "express";
import { PrismaClient, AnalysisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { analyzeWithOpenAI } from "../infrastructure/ai/OpenAiCvAnalyzer.js";
import { simulateAiAnalysis } from "../infrastructure/ai/LocalRuleAnalyzer.js";
import { detectLanguage } from "../domain/cv/CvTextPreprocessor.js";
import { searchSimilarChunks } from "../utils/embeddings.js";
import { emitAnalysisStatus } from "../index.js";
import { ProcessCvPipelineUseCase } from "../application/cv/ProcessCvPipelineUseCase.js";
import { GetCvListUseCase } from "../application/cv/GetCvListUseCase.js";
import { DeleteCvUseCase } from "../application/cv/DeleteCvUseCase.js";
import { DownloadCvUseCase } from "../application/cv/DownloadCvUseCase.js";
import { GetCvChunksUseCase } from "../application/cv/GetCvChunksUseCase.js";
import { cvQueue } from "../infrastructure/queue/cvQueue.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase() === ".pdf";
    const mimetype = file.mimetype === "application/pdf";

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Yalnızca PDF dosyaları yüklenebilir."));
  }
});

const uploadMiddleware = upload.single("cv");

function processCv(cvId: string, _analysisId?: string, _pdfBuffer?: Buffer): void {
  cvQueue.add("process-cv", { cvId }, { jobId: `cv-${cvId}-${Date.now()}` })
    .then((job) => {
      console.log(`[Main Thread] 📥 Job added to cv-processing-queue (Job ID: ${job.id}, CV: ${cvId})`);
    })
    .catch((err) => {
      console.error(`[Main Thread] ❌ Failed to add job to cvQueue for CV ${cvId}:`, err);
    });
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
      
      let userId = req.user.id;
      if (req.user.role === "ADMIN" && req.body.targetUserId) {
        userId = req.body.targetUserId;
      }
      
      const fileUuid = crypto.randomUUID();
      const filePath = `cvs/${userId}/${fileUuid}${fileExt}`;

      const fileBuffer = req.file.buffer;
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

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
        await prisma.cV.delete({ where: { id: existingCv.id } });
        const oldFilePath = existingCv.fileUrl.split("/public/cv-files/")[1];
        if (oldFilePath) {
          await supabase.storage.from("cv-files").remove([oldFilePath]);
        }
      }

      const { error } = await supabase.storage
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

      const { data: publicUrlData } = supabase.storage
        .from("cv-files")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        res.status(500).json({ message: "Dosya indirme linki oluşturulamadı." });
        return;
      }

      const fileUrl = publicUrlData.publicUrl;

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

      await cvQueue.add("process-cv", { cvId: cv.id }, { jobId: `cv-${cv.id}-${Date.now()}` });

      emitAnalysisStatus(cv.id, "CV_UPLOADED", "CV başarıyla yüklendi ve işleme sırasına alındı.", 1, {
        cvId: cv.id,
        fileName: cv.fileName
      });

      res.status(201).json({
        message: "CV başarıyla yüklendi, analiz sıraya alındı.",
        cv,
        analysis,
        status: "PENDING"
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
    const cvs = await GetCvListUseCase.execute(req.user.id, req.user.role, prisma);
    res.json({ cvs });
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
    const result = await GetCvChunksUseCase.execute(id, { id: req.user.id, role: req.user.role }, prisma);
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Chunk listesi alınamadı." });
  }
});

// DELETE /api/cv/:id
router.delete("/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const cvId = req.params.id as string;

  try {
    const result = await DeleteCvUseCase.execute(cvId, req.user.id, prisma);
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "CV silinemedi." });
  }
});

// GET /api/cv/:id/download
router.get("/:id/download", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const cvId = req.params.id as string;

  try {
    const fileResult = await DownloadCvUseCase.execute(cvId, req.user.id, req.user.role, prisma);
    
    res.setHeader("Content-Type", fileResult.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileResult.fileName)}"`);
    res.send(fileResult.buffer);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Dosya indirilemedi." });
  }
});

// GET /api/cv/search
router.get("/search", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  const limit = parseInt(req.query.limit as string || "5", 10);

  if (!query || query.trim() === "") {
    res.status(400).json({ message: "Arama sorgusu boş olamaz." });
    return;
  }

  try {
    const results = await searchSimilarChunks(query, limit, prisma, undefined, req.user?.id);
    res.json({ results });
  } catch (error: any) {
    console.error("Semantic search endpoint error:", error);
    res.status(500).json({ message: `Arama sırasında hata oluştu: ${error.message}` });
  }
});

// POST /api/cv/:id/reanalyze (Yeniden AI Analiz Başlatma)
router.post("/:id/reanalyze", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const cvId = req.params.id as string;

  try {
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
      include: { user: true }
    });

    if (!cv) {
      res.status(404).json({ message: "CV bulunamadı." });
      return;
    }

    // Aday sadece kendi CV'sini, Admin ise herkesin CV'sini reanalyze edebilir
    if (req.user.role !== "ADMIN" && cv.userId !== req.user.id) {
      res.status(403).json({ message: "Bu işlem için yetkiniz yok." });
      return;
    }

    // Supabase Storage path ayrıştırma (bucket adı: "cv-files")
    let storagePath = cv.fileUrl;
    if (storagePath.includes("/cv-files/")) {
      storagePath = storagePath.split("/cv-files/")[1];
    } else {
      storagePath = storagePath.replace(/^.*\/cvs\//, "");
    }

    // Storage'dan PDF dosyasını indir (bucket: "cv-files")
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cv-files")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("[Reanalyze] Supabase indirme hatası:", downloadError, "Path:", storagePath);
      res.status(500).json({ message: `CV dosyası depolamadan alınamadı (${downloadError?.message || 'Bilinmeyen hata'}).` });
      return;
    }

    const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

    // Yeni Analysis kaydı oluştur (Prisma Model: cVAnalysis)
    const analysis = await prisma.cVAnalysis.create({
      data: {
        cvId: cv.id,
        status: AnalysisStatus.PENDING,
      }
    });

      await cvQueue.add("process-cv", { cvId: cv.id }, { jobId: `cv-reanalyze-${cv.id}-${Date.now()}` });

      emitAnalysisStatus(cv.id, "CV_UPLOADED", "Yeniden analiz sıraya alındı.", 1, {
        cvId: cv.id,
        fileName: cv.fileName
      });

      res.status(200).json({
        message: "Yeniden analiz başarıyla başlatıldı, kuyruğa alındı.",
        cvId: cv.id,
        analysisId: analysis.id,
        status: "PENDING"
      });
  } catch (error: any) {
    console.error("[Reanalyze] Hata:", error);
    res.status(500).json({ message: error.message || "Yeniden analiz başlatılamadı." });
  }
});

export default router;
