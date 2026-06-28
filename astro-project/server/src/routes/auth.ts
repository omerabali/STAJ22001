import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Prisma istemcisini burada da oluşturuyoruz (ya da index'ten export edebilirsiniz)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

function signToken(payload: { id: string; email: string; role: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET tanımlı değil!");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email ve şifre zorunludur." });
      return;
    }

    // Email zaten kayıtlı mı?
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "Bu email zaten kayıtlı." });
      return;
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // JWT oluştur ve çereze kaydet
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Kayıt başarılı.",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Register hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email ve şifre zorunludur." });
      return;
    }

    // Kullanıcı var mı?
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Geçersiz email veya şifre." });
      return;
    }

    // Şifreyi doğrula
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: "Geçersiz email veya şifre." });
      return;
    }

    // JWT oluştur ve çereze kaydet
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Giriş başarılı.",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me  (korumalı route)
// ─────────────────────────────────────────────
router.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ message: "Kullanıcı bulunamadı." });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Me hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post("/logout", (req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Çıkış başarılı." });
});

export default router;
