import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware } from "../middleware/auth.js";
import { RegisterUserUseCase } from "../application/auth/RegisterUserUseCase.js";
import { LoginUserUseCase } from "../application/auth/LoginUserUseCase.js";
import { PasswordHasher } from "../infrastructure/security/PasswordHasher.js";
import { JwtService } from "../infrastructure/security/JwtService.js";

const router = Router();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, user } = await RegisterUserUseCase.execute(req.body, prisma);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Kayıt başarılı.",
      user
    });
  } catch (error: any) {
    const status = error.message?.includes("zaten kayıtlı") ? 409 : 400;
    res.status(status).json({ message: error.message || "Kayıt hatası." });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, user } = await LoginUserUseCase.execute(req.body, prisma);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Giriş başarılı.",
      user
    });
  } catch (error: any) {
    const status = error.message?.includes("Geçersiz") ? 401 : 400;
    res.status(status).json({ message: error.message || "Giriş hatası." });
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
      const isValid = await PasswordHasher.compare(currentPassword, existingUser!.passwordHash);
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
      updateData.passwordHash = await PasswordHasher.hash(passwordStr);
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true, name: true, phone: true, avatarUrl: true }
    });

    const token = JwtService.signToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name });
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
    const phoneStr = (phone || "").trim().replace(/^(\+90|0)/, "");

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
    const phoneStr = (phone || "").trim().replace(/^(\+90|0)/, "");
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

    const token = JwtService.signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

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
