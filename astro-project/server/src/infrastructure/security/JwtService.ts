/**
 * JwtService.ts (JWT Oturum Jetonu Yönetim Servisi)
 * Görevi: Giriş yapan kullanıcılar için 7 gün geçerli JSON Web Token (JWT) üretir (`signToken`)
 * ve korumalı rotalara gelen isteklardaki jetonların geçerliliğini denetler (`verifyToken`).
 */
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface TokenPayload {
  id: string;
  email: string;
  role: "ADMIN" | "CANDIDATE";
  name?: string | null;
}

export class JwtService {
  /**
   * Signs a new JWT token for authenticated user
   */
  public static signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });//expıres_ın tokenın geçerlilik süresidir
  }

  /**
   *kontrol eder token varmı diye
   */
  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }
}
