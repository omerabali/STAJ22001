import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ASTRO_ORIGIN || "http://localhost:4321",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

// Auth routes
app.use("/api/auth", authRouter);

// Admin routes
app.use("/api/admin", adminRouter);

// GET / — Ana sayfa karşılama mesajı
app.get("/", (_req, res) => {
  res.json({
    message: "Express sunucusuna hoş geldiniz! Sağlık kontrolü için lütfen /api/health adresini ziyaret edin.",
  });
});

// GET /api/health — Sunucu + DB bağlantı testi
app.get("/api/health", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: "ok",
      message: "Sunucu ayakta ve DB bağlantısı başarılı!",
      userCount,
    });
  } catch (error) {
    console.error("DB bağlantı hatası:", error);
    res.status(500).json({
      status: "error",
      message: "DB bağlantısı başarısız!",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
