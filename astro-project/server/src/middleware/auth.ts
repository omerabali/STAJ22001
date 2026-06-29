import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
}

// Express Request tipini genişletiyoruz
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;

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
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Yetkisiz: Geçersiz veya süresi dolmuş token." });
  }
}

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Ensure authMiddleware has populated req.user
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
