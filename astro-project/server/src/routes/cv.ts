import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { authMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

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
    const filetypes = /pdf|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || 
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/pdf";

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Yalnızca PDF ve DOCX dosyaları yüklenebilir."));
  }
});

// Single file upload handler
const uploadMiddleware = upload.single("cv");

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

      // Save record in the PostgreSQL database using Prisma
      const analysis = await prisma.analysis.create({
        data: {
          userId: userId,
          fileName: fileName,
          fileUrl: fileUrl,
          status: "PENDING",
        },
        select: {
          id: true,
          userId: true,
          fileName: true,
          fileUrl: true,
          status: true,
          createdAt: true,
        }
      });

      res.status(201).json({
        message: "CV başarıyla yüklendi, analiz sıraya alındı.",
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
    const list = await prisma.analysis.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ analyses: list });
  } catch (error) {
    console.error("CV listeleme hatası:", error);
    res.status(500).json({ message: "CV listesi alınamadı." });
  }
});

export default router;
