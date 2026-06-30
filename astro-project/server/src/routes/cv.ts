import { Router, Request, Response } from "express";
import { PrismaClient, AnalysisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { extractTextFromPDF, chunkTextBySections } from "../utils/parser.js";

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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const filetypes = /pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === "application/pdf";

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Yalnızca PDF dosyaları yüklenebilir."));
  }
});

// Single file upload handler
const uploadMiddleware = upload.single("cv");

// Local keyword extractor to show actual skills from PDF text
const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Node.js", "React", "Vue", "Angular", "Python", 
  "Java", "C++", "C#", "Go", "Rust", "SQL", "PostgreSQL", "MongoDB", 
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "HTML", "CSS", "Git",
  "Tailwind", "Next.js", "Express", "Prisma", "Supabase", "REST API"
];

function extractLocalSkills(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startBoundary = /^\w/.test(skill) ? "\\b" : "";
    const endBoundary = /\w$/.test(skill) ? "\\b" : "";
    const regex = new RegExp(startBoundary + escaped + endBoundary, "i");
    if (regex.test(lowerText)) {
      found.push(skill);
    }
  }
  return found.slice(0, 6);
}

// Asynchronous background CV processing pipeline
async function processCv(cvId: string, analysisId: string, pdfBuffer: Buffer): Promise<void> {
  try {
    // 1. Transition status to PROCESSING
    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.PROCESSING }
    });

    // 2. Extract text from PDF buffer
    console.log(`[Parser] Extracting text from CV: ${cvId}`);
    const text = await extractTextFromPDF(pdfBuffer);

    // 3. Generate section-based chunks
    console.log(`[Parser] Generating section-based chunks...`);
    const chunks = chunkTextBySections(text);

    // 4. Save chunks in the cv_chunks table
    if (chunks.length > 0) {
      console.log(`[Parser] Storing ${chunks.length} chunks in PostgreSQL...`);
      await prisma.cVChunk.createMany({
        data: chunks.map((chunkContent) => ({
          cvId: cvId,
          content: chunkContent,
          pageIndex: 1,
        }))
      });
    }

    // 5. Extract local skills (REAL extracted skills!)
    const extractedSkills = extractLocalSkills(text);

    // 6. Transition status to COMPLETED and save skills (atsScore remains null)
    await prisma.cVAnalysis.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.COMPLETED,
        skills: extractedSkills
      }
    });

    console.log(`[Parser] ✅ Successfully parsed and chunked CV: ${cvId}`);

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
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const fileName = req.file.originalname;
      const userId = req.user.id;
      const fileUuid = crypto.randomUUID();
      const filePath = `cvs/${userId}/${fileUuid}${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("cv-files")
        .upload(filePath, req.file.buffer, {
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
        }
      });

      const analysis = await prisma.cVAnalysis.create({
        data: {
          cvId: cv.id,
          status: AnalysisStatus.PENDING,
        }
      });

      // Asynchronously trigger parsing in the background
      processCv(cv.id, analysis.id, req.file.buffer);

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
      where: { userId: req.user.id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
        },
        chunks: {
          orderBy: { createdAt: "asc" }
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

// DELETE /api/cv/:id
router.delete("/:id", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz erişim." });
    return;
  }

  const id = req.params.id as string;

  try {
    // 1. Find the CV and ensure it belongs to the logged-in user
    const cv = await prisma.cV.findFirst({
      where: {
        id: id,
        userId: req.user.id
      }
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

export default router;
