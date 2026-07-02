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

function signToken(payload: { id: string; email: string; role: string; name: string | null }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET tanımlı değil!");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phone, name } = req.body;

    const trimmedEmail = (email || "").trim().toLowerCase();
    const passwordStr = password || "";
    const phoneStr = (phone || "").trim();
    const nameStr = name ? name.trim() : null;

    if (!trimmedEmail || !passwordStr || !phoneStr) {
      res.status(400).json({ message: "Email, telefon ve şifre zorunludur." });
      return;
    }

    // Kullanıcı Adı (Ad Soyad) kontrolü
    if (!nameStr) {
      res.status(400).json({ message: "Ad Soyad zorunludur." });
      return;
    }
    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{3,}$/;
    if (!nameRegex.test(nameStr)) {
      res.status(400).json({ message: "Ad Soyad en az 3 karakter olmalı ve yalnızca harflerden oluşmalıdır." });
      return;
    }

    // E-posta format kontrolü - Yalnızca @gmail.com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ message: "Yalnızca @gmail.com uzantılı e-posta adresleri kabul edilmektedir." });
      return;
    }

    // Telefon kontrolü - 10 hane ve 5 ile başlama
    const phoneRegex = /^5\d{9}$/;
    if (!phoneRegex.test(phoneStr)) {
      res.status(400).json({ message: "Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır (Örn: 5xxxxxxxxx)." });
      return;
    }

    // Şifre uzunluk kontrolü
    if (passwordStr.length < 6) {
      res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır." });
      return;
    }

    // Şifre boşluk kontrolü
    if (passwordStr.includes(" ")) {
      res.status(400).json({ message: "Şifre boşluk karakteri içeremez." });
      return;
    }

    // Email veya Telefon zaten kayıtlı mı?
    const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail) {
      res.status(409).json({ message: "Bu email zaten kayıtlı." });
      return;
    }
    
    const existingPhone = await prisma.user.findUnique({ where: { phone: phoneStr } });
    if (existingPhone) {
      res.status(409).json({ message: "Bu telefon numarası zaten kayıtlı." });
      return;
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(passwordStr, SALT_ROUNDS);

    // E-posta "admin" ile başlıyorsa ADMIN, yoksa CANDIDATE yap
    const role = trimmedEmail.startsWith("admin") ? "ADMIN" : "CANDIDATE";

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: { email: trimmedEmail, phone: phoneStr, name: nameStr, passwordHash, role },
    });

    // JWT oluştur ve çereze kaydet
    const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Kayıt başarılı.",
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
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

    const trimmedEmail = (email || "").trim().toLowerCase();
    const passwordStr = password || "";

    if (!trimmedEmail || !passwordStr) {
      res.status(400).json({ message: "Email ve şifre zorunludur." });
      return;
    }

    // Girişte de @gmail.com kontrolü
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ message: "Lütfen geçerli bir @gmail.com adresi girin." });
      return;
    }

    // Kullanıcı var mı?
    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
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
    const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

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
      select: { id: true, email: true, role: true, name: true, phone: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ message: "Kullanıcı bulunamadı." });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error("Me hatası:", error);
    res.status(500).json({ message: error.message || String(error) });
  }
});

// ─────────────────────────────────────────────
// PUT /api/auth/profile (korumalı route)
// ─────────────────────────────────────────────
router.put("/profile", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, email, phone, password, currentPassword, avatarUrl } = req.body;

    const updateData: any = {};
    
    if (name !== undefined) {
      const nameStr = name.trim();
      const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{3,}$/;
      if (!nameRegex.test(nameStr)) {
        res.status(400).json({ message: "Ad Soyad en az 3 karakter olmalı ve yalnızca harflerden oluşmalıdır." });
        return;
      }
      updateData.name = nameStr;
    }
    
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      if (!emailRegex.test(trimmedEmail)) {
        res.status(400).json({ message: "Yalnızca @gmail.com uzantılı e-posta adresleri kabul edilmektedir." });
        return;
      }
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existing && existing.id !== userId) {
        res.status(409).json({ message: "Bu email başka bir kullanıcı tarafından kullanılıyor." });
        return;
      }
      updateData.email = trimmedEmail;
    }

    if (phone) {
      const phoneStr = phone.trim();
      const phoneRegex = /^5\d{9}$/;
      if (!phoneRegex.test(phoneStr)) {
        res.status(400).json({ message: "Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır (Örn: 5xxxxxxxxx)." });
        return;
      }
      const existingPhone = await prisma.user.findUnique({ where: { phone: phoneStr } });
      if (existingPhone && existingPhone.id !== userId) {
        res.status(409).json({ message: "Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor." });
        return;
      }
      updateData.phone = phoneStr;
    }

    if (password) {
      if (!currentPassword) {
        res.status(400).json({ message: "Şifrenizi değiştirmek için mevcut şifrenizi girmelisiniz." });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      const isValid = await bcrypt.compare(currentPassword, existingUser!.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Mevcut şifreniz yanlış." });
        return;
      }

      const passwordStr = password || "";
      if (passwordStr.length < 6) {
        res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalıdır." });
        return;
      }
      if (passwordStr.includes(" ")) {
        res.status(400).json({ message: "Şifre boşluk içeremez." });
        return;
      }
      updateData.passwordHash = await bcrypt.hash(passwordStr, SALT_ROUNDS);
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true, name: true, phone: true, avatarUrl: true }
    });

    const token = signToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Profil başarıyla güncellendi.",
      user: updatedUser
    });

  } catch (error) {
    console.error("Profile update hatası:", error);
    res.status(500).json({ message: "Profil güncellenirken bir hata oluştu." });
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

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password-code
// ─────────────────────────────────────────────
router.post("/forgot-password-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    const phoneStr = (phone || "").trim();

    if (!phoneStr) {
      res.status(400).json({ message: "Telefon numarası zorunludur." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { phone: phoneStr } });
    if (!user) {
      // Güvenlik: Kullanıcı bulunamadıysa bile hata detayını belli etmemek için "Gönderildi" diyebiliriz.
      // Ancak UX için şimdilik net hata dönelim.
      res.status(404).json({ message: "Bu numaraya ait bir kullanıcı bulunamadı." });
      return;
    }

    // 6 haneli rastgele kod oluştur
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpires }
    });

    // Simüle SMS
    console.log(`[SMS SİMÜLASYONU] Telefon: ${phoneStr} | Kod: ${resetCode}`);

    res.json({ message: "Doğrulama kodu gönderildi." });
  } catch (error) {
    console.error("Forgot password code hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-code
// ─────────────────────────────────────────────
router.post("/verify-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;
    const phoneStr = (phone || "").trim();
    const codeStr = (code || "").trim();

    if (!phoneStr || !codeStr) {
      res.status(400).json({ message: "Telefon numarası ve kod zorunludur." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { phone: phoneStr } });
    if (!user) {
      res.status(404).json({ message: "Kullanıcı bulunamadı." });
      return;
    }

    if (user.resetCode !== codeStr) {
      res.status(401).json({ message: "Geçersiz doğrulama kodu." });
      return;
    }

    if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      res.status(401).json({ message: "Doğrulama kodunun süresi dolmuş." });
      return;
    }

    // Kod doğru, kodu temizle ve login ol
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode: null, resetCodeExpires: null }
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Giriş başarılı.",
      user: { id: user.id, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    console.error("Verify code hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

export default router;
