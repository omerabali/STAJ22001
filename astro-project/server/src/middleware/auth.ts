/**
 * auth.ts (Kimlik Doğrulama & Yetkilendirme Ara Yazılımları)
 * Görevi: Gelen HTTP isteklerinde Cookie'deki JWT jetonunu doğrular (`authMiddleware`).
 * Sadece İK yöneticilerinin erişebileceği rotalarda ADMIN rol kontrolünü yapar (`adminMiddleware`).
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {//kullaanıcı bilgilerini tanımlar eğer burdaki tanımlamanın yanında bir de işlem içerseydi eğer o zaman class kullanılırdı
  id: string;
  email: string;
  role: string;
}

// Express Request tipini genişletiyoruz yani normal şartlarda request içinde user alanı olmadığı için genişletme ondan dolayı uygulanıyor
declare global {
  namespace Express {
    interface Request {//ts de aynı isimli interfaceler birleşir yani request ile bizimki birleşiyor şu anda 
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;//cookiesten token isimli veriyi çeker

  if (!token) {
    res.status(401).json({ message: "Yetkisiz: Token bulunamadı." });
    return;
  }
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Sunucu hatası: JWT_SECRET tanımlı değil." });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;//yukarıdaki kısımlarda geçerliyse ğer kullanıcı bilgileri alanına atanır böylece sonraki fonksiyonlar kimin istek attığını bilir
    next();
  } catch {
    res.status(401).json({ message: "Yetkisiz: Geçersiz veya süresi dolmuş token." });
  }
}

export function adminMiddleware(//kimliği doğrulanmış sadece rolü admin olanlar için bu fonksitona izin verilir
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // req.user kontrolü 
  if (!req.user) {
    res.status(401).json({ message: "Yetkisiz: Kullanıcı bilgisi bulunamadı." });
    return;
  }

  if (req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Yasaklandı: Sadece yöneticiler bu işlemi yapabilir." });
    return;
  }

  next();
}
