/**
 * sistem başladığı an ilk bu çalışır
 * index.ts (Backend Ana Sunucu & Giriş Noktası - Main Application Entrypoint)
 * Görevi: Node.js + Express HTTP sunucusunu (Port 5000) başlatır, canlı WebSocket (Socket.io) yayınını kurar,
 * CORS/Cookie/JSON ara yazılımlarını bağlar, tüm API rotalarını (/api/auth, /api/cv, /api/search, /api/admin) dinlemeye alır
 * ve arka planda CV işleyen Worker Pool kuyruğunu (initCvWorker) devreye sokar.
 */
import "./load-env.js";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import cvRouter from "./routes/cv.js";
import searchRouter from "./routes/search.js";
import { initCvWorker } from "./infrastructure/queue/cvWorker.js";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ASTRO_ORIGIN || "http://localhost:4321",
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket.io] 🔌 Client connected: ${socket.id}`);

  socket.on("join:cv", (cvId: string) => {
    socket.join(`cv:${cvId}`);
    console.log(`[Socket.io] 📥 Client ${socket.id} joined room cv:${cvId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.io] ❌ Client disconnected: ${socket.id}`);
  });
});

export function emitAnalysisStatus(cvId: string, status: string, message: string, step: number, payload?: any) {
  const eventData = {
    cvId,
    status,
    message,
    step,
    timestamp: new Date().toISOString(),
    ...payload
  };
  io.to(`cv:${cvId}`).emit("analysis:status", eventData);
  io.emit("analysis:status", eventData); // Broadcast for general listeners
}

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

// CV routes
app.use("/api/cv", cvRouter);

// Search routes
app.use("/api/search", searchRouter);

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

httpServer.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.log(`[Server] ℹ️ Port ${PORT} zaten aktif (dev server çalışıyor). Mevcut sunucu dinleniyor.`);
  } else {
    console.error("[Server] ❌ Sunucu hatası:", err);
  }
});

// Sunucuyu başlat ve Worker Pool'u devreye al
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`✅ Sunucu (Express + Socket.io) http://localhost:${PORT} adresinde çalışıyor`);
    try {
      initCvWorker();
    } catch (err: any) {
      console.error("[Worker Pool] ❌ Worker başlatılamadı:", err?.message || err);
    }
  });
}

export { app, httpServer, io, pool };
