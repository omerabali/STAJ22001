/**
 * auth.ts (Kimlik Doğrulama & Oturum Yönetimi API Rotaları)
 * Görevi: Kullanıcı kayıt (`/register`), giriş (`/login`), çıkış (`/logout`), profil sorgulama (`/me`)
 * ve şifre sıfırlama (`/forgot-password`, `/verify-reset-code`) API uç noktalarını sunar.
 * JWT token'larını tarayıcıya güvenli HttpOnly Cookie olarak yazar.
 */
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware } from "../middleware/auth.js";
import { RegisterUserUseCase } from "../application/auth/RegisterUserUseCase.js";
import { LoginUserUseCase } from "../application/auth/LoginUserUseCase.js";
import { PasswordHasher } from "../infrastructure/security/PasswordHasher.js";
import { JwtService } from "../infrastructure/security/JwtService.js";

const router = Router();//ayrı ayrı dosyalara bölmemizi sağlar

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// POST /api/auth/register
//resigter adresinde post şeyi geldiğinde bu tetiklenir async olması işlerin ana planı kilitlememesimidir
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, user } = await RegisterUserUseCase.execute(req.body, prisma);//bodyden gelen verileri db ye kaydet  ve jwt üret 

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
router.post("/login", async (req: Request, res: Response): Promise<void> => {//login adreslerini dinle 
  try {
    const { token, user } = await LoginUserUseCase.execute(req.body, prisma);//req body gene içeriği getiriyor

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
router.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {//şu an kim giriş yapmış diye kontrol eder
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },//verilerin hepsini getirme sadece true olanları getir tamam mı
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
    //jwt statiktir mesela bir yeri güncelledikten sonra yeni bir token üretmezsek 
    //eski tokenle giriş yapmaya devam eder ta ki token süresi bitene kadar  o yüzden tekrar giriş yapıyoruz ki güncelleme olsun 
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
    const { phone, email } = req.body;
    const rawVal = (phone || email || "").trim();

    if (!rawVal) {
      res.status(400).json({ message: "E-posta veya telefon numarası zorunludur." });
      return;
    }

    const isEmail = rawVal.includes("@");
    const searchVal = isEmail ? rawVal.toLowerCase() : rawVal.replace(/^(\+90|0)/, "");

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: searchVal } : { phone: searchVal }
    });

    if (!user) {
      res.status(404).json({ message: "Girdiğiniz e-posta veya telefon numarasına ait kullanıcı bulunamadı." });
      return;
    }

    // 6 haneli rastgele kod oluştur
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpires }
    });

    // Simüle SMS / E-posta
    console.log(`[DOĞRULAMA KODU SİMÜLASYONU] Alıcı: ${searchVal} | Kod: ${resetCode}`);

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
    const { phone, email, code } = req.body;
    const rawVal = (phone || email || "").trim();
    const codeStr = (code || "").trim();

    if (!rawVal || !codeStr) {
      res.status(400).json({ message: "Kullanıcı bilgisi ve doğrulama kodu zorunludur." });
      return;
    }

    const isEmail = rawVal.includes("@");
    const searchVal = isEmail ? rawVal.toLowerCase() : rawVal.replace(/^(\+90|0)/, "");

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: searchVal } : { phone: searchVal }
    });

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

    // Kod doğru, yeni şifre varsa güncelle, reset kodunu temizle ve login yap
    const updateData: any = { resetCode: null, resetCodeExpires: null };
    if (req.body.newPassword && req.body.newPassword.trim().length >= 6) {
      updateData.passwordHash = await PasswordHasher.hash(req.body.newPassword.trim());
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
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

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });
  res.json({ message: "Başarıyla çıkış yapıldı." });
});

export default router;
